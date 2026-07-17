from app.schemas.base import CamelModel
from app.schemas.post import PostOut


class PaginatedPosts(CamelModel):
    items: list[PostOut]
    total: int
    page: int
    page_size: int
    total_pages: int
