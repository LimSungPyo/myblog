from app.schemas.base import CamelModel


class ImageUploadOut(CamelModel):
    url: str
    width: int
    height: int
