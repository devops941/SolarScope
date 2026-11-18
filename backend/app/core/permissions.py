from typing import Annotated
from fastapi import Depends, Header
from app.core.errors import UnauthorizedError, ForbiddenError
from app.core.security import decode_token
from app.domain.enums import Role


# ── Token extraction ─────────────────────────────────────────────────
async def get_token(authorization: Annotated[str | None, Header()] = None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header.")
    return authorization.removeprefix("Bearer ").strip()


# ── Current user payload (decoded JWT) ──────────────────────────────
async def get_current_user(token: Annotated[str, Depends(get_token)]) -> dict:
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise UnauthorizedError(str(exc))
    if payload.get("type") != "access":
        raise UnauthorizedError("Not an access token.")
    return payload


# ── Workspace ID — ALWAYS from token, never from request body ────────
async def get_workspace_id(user: Annotated[dict, Depends(get_current_user)]) -> str:
    wid = user.get("workspace_id")
    if not wid:
        raise UnauthorizedError("No workspace context in token.")
    return wid


# ── Role-based access ────────────────────────────────────────────────
ROLE_HIERARCHY = {
    Role.VIEWER: 0,
    Role.ANALYST: 1,
    Role.SITE_MANAGER: 2,
    Role.WORKSPACE_ADMIN: 3,
    Role.PLATFORM_ADMIN: 4,
}


def require_role(minimum_role: Role):
    async def _check(user: Annotated[dict, Depends(get_current_user)]):
        try:
            user_role = Role(user.get("role", "viewer"))
        except ValueError:
            raise ForbiddenError("Unknown role.")
        if ROLE_HIERARCHY.get(user_role, -1) < ROLE_HIERARCHY[minimum_role]:
            raise ForbiddenError(
                f"This action requires at least the '{minimum_role.value}' role."
            )
        return user
    return _check
