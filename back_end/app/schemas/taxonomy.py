from app.schemas.base import CamelModel


class CategoryOut(CamelModel):
    id: int
    name: str
    slug: str


class TagOut(CamelModel):
    id: int
    name: str
    slug: str
