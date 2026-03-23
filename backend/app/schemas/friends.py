from pydantic import BaseModel, Field


class FriendRequestCreate(BaseModel):
    target_phone: str = Field(min_length=11, max_length=20)


class FriendRequestAction(BaseModel):
    request_id: str = Field(min_length=1, max_length=64)


class FriendInviteRequest(BaseModel):
    friend_user_id: str = Field(min_length=1, max_length=64)


class FriendDto(BaseModel):
    request_id: str
    status: str
    is_incoming: bool
    user_id: str
    phone: str
    username: str
    avatar: str
    user_status: str = "online"


class RoomInviteDto(BaseModel):
    room_id: str
    room_name: str
    inviter_user_id: str
    inviter_name: str
    allow_join: bool
    allow_invite: bool
