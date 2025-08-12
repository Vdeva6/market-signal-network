from pydantic import BaseModel
from datetime import datetime

class MarketSignalSchema(BaseModel):
    id: int
    symbol: str
    price: float
    z_score: float
    type: str
    timestamp: datetime

    class Config:
        orm_mode = True


class MarketPriceSchema(BaseModel):
    id: int
    timestamp: datetime
    symbol: str
    price: float

    class Config:
        orm_mode = True