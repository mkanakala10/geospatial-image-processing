from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.api.deps import CurrentUser, AdminUser, DBSession
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate, UserRoleUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(payload: UserUpdate, current_user: CurrentUser, db: DBSession):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.email is not None:
        existing = await db.execute(select(User).where(User.email == payload.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already in use")
        current_user.email = payload.email
    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.get("/", response_model=list[UserRead])
async def list_users(admin: AdminUser, db: DBSession):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/{user_id}/role", response_model=UserRead)
async def update_role(user_id: str, payload: UserRoleUpdate, admin: AdminUser, db: DBSession):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, admin: AdminUser, db: DBSession):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
