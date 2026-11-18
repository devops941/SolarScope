from pydantic import BaseModel, EmailStr, Field
from app.domain.enums import Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserSchema"
    workspace: "WorkspaceSchema"


class UserSchema(BaseModel):
    id: str
    email: str
    name: str
    role: Role


class WorkspaceSchema(BaseModel):
    id: str
    name: str
    timezone: str


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8)
    workspace_name: str = Field(min_length=2, max_length=100)


class MeResponse(BaseModel):
    user: UserSchema
    workspace: WorkspaceSchema
    role: Role
    permissions: list[str] = []
