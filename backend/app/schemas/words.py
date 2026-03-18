from pydantic import BaseModel


class WordCategoryResponse(BaseModel):
    id: str
    name: str


class CreateWordCategoryRequest(BaseModel):
    name: str


class WordPairResponse(BaseModel):
    id: str
    category_id: str
    civilian_word: str
    undercover_word: str


class CreateWordPairRequest(BaseModel):
    category_id: str
    civilian_word: str
    undercover_word: str


class RandomWordPairResponse(BaseModel):
    category: str
    civilian_word: str
    undercover_word: str
