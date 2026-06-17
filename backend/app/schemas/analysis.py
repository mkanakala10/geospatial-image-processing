import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel
from app.models.analysis import AnalysisType, AnalysisStatus


class AnalysisCreate(BaseModel):
    name: str
    analysis_type: AnalysisType
    region_id: Optional[uuid.UUID] = None
    parameters: dict = {}
    input_source: Optional[str] = None  # "demo" or storage key


class AnalysisRead(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    region_id: Optional[uuid.UUID]
    name: str
    analysis_type: AnalysisType
    status: AnalysisStatus
    task_id: Optional[str]
    parameters: dict
    input_source: Optional[str]
    result_data: Optional[Any]
    ai_summary: Optional[str]
    progress: int
    processing_time_s: Optional[float]
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AnalysisUpdate(BaseModel):
    name: Optional[str] = None
    parameters: Optional[dict] = None


class AnalysisStatusRead(BaseModel):
    id: uuid.UUID
    status: AnalysisStatus
    progress: int
    error_message: Optional[str]
    result_data: Optional[Any]
    ai_summary: Optional[str]
    processing_time_s: Optional[float]

    model_config = {"from_attributes": True}
