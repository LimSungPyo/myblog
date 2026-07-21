from app.schemas.base import CamelModel


class TopPost(CamelModel):
    id: int
    title: str
    slug: str
    view_count: int


class AdminStats(CamelModel):
    post_count: int
    published_count: int
    draft_count: int
    comment_count: int
    pending_comment_count: int
    total_views: int
    top_posts: list[TopPost]
