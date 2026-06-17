import uuid
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, field_validator


class RegionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    region_type: str = "polygon"
    geometry: dict  # GeoJSON geometry
    tags: List[str] = []

    @field_validator("geometry")
    @classmethod
    def validate_geojson(cls, v: dict) -> dict:
        if "type" not in v or "coordinates" not in v:
            raise ValueError("geometry must be a valid GeoJSON object with type and coordinates")
        return v


class RegionRead(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: Optional[str]
    region_type: str
    geometry: dict
    bbox_min_lat: float
    bbox_max_lat: float
    bbox_min_lon: float
    bbox_max_lon: float
    tags: List[Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class RegionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
