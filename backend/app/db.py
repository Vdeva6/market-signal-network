from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()

class MarketPrice(Base):
    __tablename__ = "market_prices"
    id = Column(Integer, primary_key = True, index = True)
    symbol = Column(String, nullable = False)
    price = Column(Float, nullable = False)
    timestamp = Column(DateTime, nullable = False)

class MarketSignal(Base):
    __tablename__ = "market_signals"
    id = Column(Integer, primary_key = True, index = True)
    symbol = Column(String, nullable = False)
    price = Column(Float, nullable = False)
    timestamp = Column(DateTime, nullable = False)
    z_score = Column(Float, nullable = False)
    type = Column(String, nullable = False)


DATABASE_URL = "postgresql://admin:admin@db:5432/market_db"
engine = create_engine(DATABASE_URL)
                       

SessionLocal = sessionmaker(bind = engine, autocommit = False, autoflush = False)
  
def get_session():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


SessionLocal = sessionmaker(bind = engine)

