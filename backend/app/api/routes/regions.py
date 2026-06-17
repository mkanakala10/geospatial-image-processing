import uuid
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.api.deps import CurrentUser, AnalystUser, DBSession
from app.models.region import Region
from app.schemas.region import RegionCreate, RegionRead, RegionUpdate

router = APIRouter(prefix="/regions", tags=["regions"])


def _compute_bbox(geometry: dict) -> dict:
    """Extract bounding box from GeoJSON geometry."""
    coords = []

    def flatten(obj):
        if isinstance(obj, list):
            if obj and isinstance(obj[0], (int, float)):
                coords.append(obj)
            else:
                for item in obj:
                    flatten(item)

    flatten(geometry.get("coordinates", []))

    if not coords:
        raise HTTPException(status_code=422, detail="Cannot extract coordinates from geometry")

    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return {
        "min_lat": min(lats), "max_lat": max(lats),
        "min_lon": min(lons), "max_lon": max(lons),
    }


@router.post("/", response_model=RegionRead, status_code=201)
async def create_region(payload: RegionCreate, user: AnalystUser, db: DBSession):
    bbox = _compute_bbox(payload.geometry)
    region = Region(
        owner_id=user.id,
        name=payload.name,
        description=payload.description,
        region_type=payload.region_type,
        geometry=payload.geometry,
        bbox_min_lat=bbox["min_lat"],
        bbox_max_lat=bbox["max_lat"],
        bbox_min_lon=bbox["min_lon"],
        bbox_max_lon=bbox["max_lon"],
        tags=payload.tags,
    )
    db.add(region)
    await db.flush()
    await db.refresh(region)
    return region


@router.get("/", response_model=list[RegionRead])
async def list_regions(user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Region)
        .where(Region.owner_id == user.id)
        .order_by(Region.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{region_id}", response_model=RegionRead)
async def get_region(region_id: uuid.UUID, user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Region).where(Region.id == region_id, Region.owner_id == user.id)
    )
    region = result.scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return region


@router.patch("/{region_id}", response_model=RegionRead)
async def update_region(
    region_id: uuid.UUID, payload: RegionUpdate, user: AnalystUser, db: DBSession
):
    result = await db.execute(
        select(Region).where(Region.id == region_id, Region.owner_id == user.id)
    )
    region = result.scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(region, field, value)
    await db.flush()
    await db.refresh(region)
    return region


@router.delete("/{region_id}", status_code=204)
async def delete_region(region_id: uuid.UUID, user: AnalystUser, db: DBSession):
    result = await db.execute(
        select(Region).where(Region.id == region_id, Region.owner_id == user.id)
    )
    region = result.scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    await db.delete(region)
