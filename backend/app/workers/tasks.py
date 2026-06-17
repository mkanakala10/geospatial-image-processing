"""
Celery tasks for async image processing.
Each task updates the Analysis row with progress + results via a sync DB session.
"""
import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.workers.celery_app import celery_app
from app.services.image_processing import run_pipeline

logger = logging.getLogger(__name__)

# Synchronous engine for Celery workers (can't use asyncio in Celery tasks easily)
_sync_engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
SyncSession = sessionmaker(bind=_sync_engine)


def _get_analysis(session, analysis_id: str):
    from app.models.analysis import Analysis
    return session.execute(select(Analysis).where(Analysis.id == analysis_id)).scalar_one_or_none()


@celery_app.task(
    bind=True,
    name="app.workers.tasks.run_analysis_task",
    max_retries=2,
    default_retry_delay=10,
)
def run_analysis_task(self, analysis_id: str):
    from app.models.analysis import Analysis, AnalysisStatus
    from app.services.gemini_service import generate_analysis_summary

    with SyncSession() as session:
        analysis = _get_analysis(session, analysis_id)
        if not analysis:
            logger.error("Analysis %s not found", analysis_id)
            return

        try:
            analysis.status = AnalysisStatus.PROCESSING
            analysis.started_at = datetime.now(timezone.utc)
            analysis.progress = 10
            session.commit()

            # Run the CPU-bound pipeline
            result = run_pipeline(analysis.analysis_type.value, analysis.parameters)
            analysis.progress = 80
            session.commit()

            # Generate AI summary (run async in sync context)
            region_name = None
            if analysis.region:
                region_name = analysis.region.name

            summary = asyncio.run(
                generate_analysis_summary(
                    analysis_type=analysis.analysis_type.value,
                    stats=result.get("statistics", {}),
                    anomalies=result.get("anomalies", []),
                    region_name=region_name,
                )
            )

            analysis.result_data = result
            analysis.ai_summary = summary
            analysis.processing_time_s = result.get("processing_time_s")
            analysis.status = AnalysisStatus.COMPLETED
            analysis.progress = 100
            analysis.completed_at = datetime.now(timezone.utc)
            session.commit()

        except Exception as exc:
            logger.exception("Analysis %s failed: %s", analysis_id, exc)
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = str(exc)
            session.commit()
            self.retry(exc=exc)
