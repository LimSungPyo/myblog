from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    admin_comments,
    admin_posts,
    admin_stats,
    auth,
    posts,
    taxonomy,
)
from app.core.config import settings

app = FastAPI(title="myblog API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(taxonomy.router)
app.include_router(admin_posts.router)
app.include_router(admin_comments.router)
app.include_router(admin_stats.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
