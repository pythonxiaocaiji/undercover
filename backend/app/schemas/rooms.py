from pydantic import BaseModel, Field


class CreateRoomRequest(BaseModel):
    room_name: str = Field(min_length=1, max_length=64)
    max_players: int = Field(ge=4, le=10)

    speaking_time: int = Field(ge=10, le=300)
    voting_time: int = Field(ge=10, le=300)
    word_category: str = Field(min_length=1, max_length=32)
    undercover_count: int = Field(ge=1, le=4)
    allow_join: bool = True
    allow_invite: bool = True

    host_player_id: str = Field(min_length=1, max_length=64)
    host_player_name: str = Field(min_length=1, max_length=32)
    host_avatar: str = Field(min_length=1, max_length=255)


class JoinRoomRequest(BaseModel):
    player_id: str = Field(min_length=1, max_length=64)
    player_name: str = Field(min_length=1, max_length=32)
    avatar: str = Field(min_length=1, max_length=255)


class ReadyRequest(BaseModel):
    player_id: str = Field(min_length=1, max_length=64)
    is_ready: bool


class StartGameRequest(BaseModel):
    host_player_id: str = Field(min_length=1, max_length=64)


class VoteRequest(BaseModel):
    voter_player_id: str = Field(min_length=1, max_length=64)
    target_player_id: str = Field(min_length=1, max_length=64)


class ReactionRequest(BaseModel):
    from_player_id: str = Field(min_length=1, max_length=64)
    target_player_id: str = Field(min_length=1, max_length=64)
    emoji: str = Field(min_length=1, max_length=8)


class InviteFriendRequest(BaseModel):
    friend_user_id: str = Field(min_length=1, max_length=64)


class UpdateStateRequest(BaseModel):
    host_player_id: str = Field(min_length=1, max_length=64)
    state: dict
