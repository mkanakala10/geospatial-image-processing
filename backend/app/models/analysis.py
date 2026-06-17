import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, Text, ForeignKey, DateTime, JSON, Enum, Float, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AnalysisType(str, PyEnum):
    SAR_BACKSCATTER = "sar_backscatter"
    OPTICAL_NDVI = "optical_ndvi"
    CHANGE_DETECTION = "change_detection"
    ANOMALY_DETECTION = "anomaly_detection"
    ELEVATION_MODEL = "elevation_model"


class AnalysisStatus(str, PyEnum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    region_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regions.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    analysis_type: Mapped[AnalysisType] = mapped_column(Enum(AnalysisType), nullable=False)
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus), default=AnalysisStatus.PENDING
    )
    # Celery task ID for polling
    task_id: Mapped[str] = mapped_column(String(255), nullable=True)
    # Processing parameters (resolution, filter type, etc.)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    # Input data reference (S3/R2 key or demo mode flag)
    input_source: Mapped[str] = mapped_column(String(500), nullable=True)
    # Result outputs stored as structured JSON
    result_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    # AI-generated summary from Gemini
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)
    # Processing metrics
    progress: Mapped[int] = mapped_column(Integer, default=0)
    processing_time_s: Mapped[float] = mapped_column(Float, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User"] = relationship("User", back_populates="analyses")  # noqa: F821
    region: Mapped["Region"] = relationship("Region", back_populates="analyses")  # noqa: F821
