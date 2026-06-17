import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, AnalystUser, DBSession
from app.core.config import settings
from app.models.analysis import Analysis, AnalysisStatus
from app.schemas.analysis import AnalysisCreate, AnalysisRead, AnalysisUpdate, AnalysisStatusRead
from app.services.gemini_service import generate_analysis_summary
from app.services.image_processing import run_pipeline

router = APIRouter(prefix="/analyses", tags=["analyses"])


async def _run_inline(analysis: Analysis) -> None:
    """Process synchronously in the API process (fine for personal / low-traffic use)."""
    analysis.status = AnalysisStatus.PROCESSING
    analysis.started_at = datetime.now(timezone.utc)
    analysis.progress = 10

    result = run_pipeline(analysis.analysis_type.value, analysis.parameters)
    analysis.progress = 80

    summary = await generate_analysis_summary(
        analysis.analysis_type.value,
        result.get("statistics", {}),
        result.get("anomalies", []),
    )

    analysis.result_data = result
    analysis.ai_summary = summary
    analysis.processing_time_s = result.get("processing_time_s")
    analysis.status = AnalysisStatus.COMPLETED
    analysis.progress = 100
    analysis.completed_at = datetime.now(timezone.utc)


@router.post("/", response_model=AnalysisRead, status_code=201)
async def create_analysis(payload: AnalysisCreate, user: AnalystUser, db: DBSession):
    analysis = Analysis(
        owner_id=user.id,
        region_id=payload.region_id,
        name=payload.name,
        analysis_type=payload.analysis_type,
        parameters=payload.parameters,
        input_source=payload.input_source or "demo",
        status=AnalysisStatus.QUEUED,
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    if settings.INLINE_PROCESSING:
        await _run_inline(analysis)
        await db.flush()
    else:
        # Dispatch Celery task; fall back to inline if Redis is unavailable
        try:
            from app.workers.tasks import run_analysis_task
            task = run_analysis_task.apply_async(
                args=[str(analysis.id)],
                queue="analysis",
            )
            analysis.task_id = task.id
            await db.flush()
        except Exception:
            await _run_inline(analysis)
            await db.flush()

    await db.refresh(analysis)
    return analysis


@router.get("/", response_model=list[AnalysisRead])
async def list_analyses(user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Analysis)
        .where(Analysis.owner_id == user.id)
        .order_by(Analysis.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{analysis_id}", response_model=AnalysisRead)
async def get_analysis(analysis_id: uuid.UUID, user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id, Analysis.owner_id == user.id
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/{analysis_id}/status", response_model=AnalysisStatusRead)
async def get_analysis_status(analysis_id: uuid.UUID, user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id, Analysis.owner_id == user.id
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.patch("/{analysis_id}", response_model=AnalysisRead)
async def update_analysis(
    analysis_id: uuid.UUID, payload: AnalysisUpdate, user: AnalystUser, db: DBSession
):
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id, Analysis.owner_id == user.id
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.status not in (AnalysisStatus.PENDING, AnalysisStatus.FAILED):
        raise HTTPException(status_code=400, detail="Cannot update a running or completed analysis")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(analysis, field, value)
    await db.flush()
    await db.refresh(analysis)
    return analysis


@router.post("/{analysis_id}/cancel", response_model=AnalysisStatusRead)
async def cancel_analysis(analysis_id: uuid.UUID, user: AnalystUser, db: DBSession):
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id, Analysis.owner_id == user.id
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.status in (AnalysisStatus.COMPLETED, AnalysisStatus.FAILED):
        raise HTTPException(status_code=400, detail="Analysis already finished")
    if analysis.task_id:
        try:
            from app.workers.celery_app import celery_app
            celery_app.control.revoke(analysis.task_id, terminate=True)
        except Exception:
            pass
    analysis.status = AnalysisStatus.CANCELLED
    await db.flush()
    await db.refresh(analysis)
    return analysis


@router.delete("/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: uuid.UUID, user: AnalystUser, db: DBSession):
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id, Analysis.owner_id == user.id
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await db.delete(analysis)
