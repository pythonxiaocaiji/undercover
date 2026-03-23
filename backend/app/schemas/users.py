from pydantic import BaseModel


class UserPublicDto(BaseModel):
    id: str
    username: str
    avatar: str
    user_status: str = "online"
