from pydantic import BaseModel


class RegisterRequest(BaseModel):
    phone: str
    password: str
    captcha_id: str
    captcha_code: str


class LoginRequest(BaseModel):
    phone: str
    password: str
    captcha_id: str
    captcha_code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: str
    phone: str


class ProfileUpdateRequest(BaseModel):
    username: str | None = None
    avatar: str | None = None


class ProfileResponse(BaseModel):
    id: str
    phone: str
    username: str
    avatar: str
    role: int = 1
    is_admin: bool = False


class CaptchaResponse(BaseModel):
    captcha_id: str
    image_data: str
