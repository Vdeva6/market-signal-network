from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import asyncio, httpx
import pandas as pd
from app.db import Base, engine, SessionLocal, MarketPrice, get_session, MarketSignal
from typing import List
from app.schemas import MarketPriceSchema, MarketSignalSchema
import json

app = FastAPI()



active_connections = set()
@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    print("Client connected. Active:", len(active_connections))
    try:
        while True:
            await websocket.receive_text()  # wait for client ping (keep-alive)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print("Client disconnected. Active:", len(active_connections))


@app.get("/prices", response_model=List[MarketPriceSchema])
def get_prices(db: Session = Depends(get_session)):
    """Return all stored market prices."""
    return db.query(MarketPrice).all()

@app.get("/signals", response_model=List[MarketSignalSchema])
def get_signals(limit: int = 10, db: Session = Depends(get_session)):
    """Return recent market signals"""
    return (
        db.query(MarketSignal)
        .order_by(MarketSignal.id.desc())
        .limit(limit)
        .all()
    )


@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    asyncio.create_task(fetch_loop())


threshold = 2.0  # Z-score threshold

async def fetch_loop():
    while True:
        db: Session = SessionLocal()
        try:
            # 1. Fetch price
            response = httpx.get(
                "https://api.binance.us/api/v3/ticker/price",
                params={"symbol": "BTCUSDT"}
            )
            data = response.json()

            if "price" in data:
                price = float(data["price"])
                entry = MarketPrice(
                    symbol="BTCUSDT",
                    price=price,
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(entry)
                db.commit()
                print(f"Inserted price: {price}")
            else:
                print("Error:", data)
                await asyncio.sleep(5)
                continue  # Skip anomaly check this round

            # 2. Anomaly detection
            rows = (
                db.query(MarketPrice.timestamp, MarketPrice.price)
                .order_by(MarketPrice.id.desc())
                .limit(20)
                .all()
            )
            rows = list(reversed(rows))

            if len(rows) < 20:
                print("Not enough data to compute anomaly.")
                await asyncio.sleep(5)
                continue

            df = pd.DataFrame(rows, columns=["timestamp", "price"])
            mean_price = df["price"].mean()
            std_price = df["price"].std()

            if std_price == 0:
                print("No price variation, skipping anomaly check.")
                await asyncio.sleep(5)
                continue

            latest_price = df["price"].iloc[-1]
            z_score = (latest_price - mean_price) / std_price

            if abs(z_score) > threshold:
                signal_type = "Spike" if z_score > 0 else "Drop"
                signal = MarketSignal(
                    timestamp=datetime.now(timezone.utc),
                    symbol="BTCUSDT",
                    price=price,
                    z_score=float(z_score),
                    type=signal_type,
                )
                db.add(signal)
                db.commit()
                print(f"Anomaly detected! Z-score: {z_score:.2f} ({signal_type})")

                signal_payload = {
                    "timestamp": signal.timestamp.isoformat(),
                    "symbol": signal.symbol,
                    "price": signal.price,
                    "z_score": signal.z_score,
                    "type": signal.type
                }

                for connection in active_connections.copy():
                    try:
                        await connection.send_text(json.dumps(signal_payload))
                    except Exception as e:
                        print("Failed to send to one client:", e)
                        active_connections.remove(connection)


        except Exception as e:
            print("Error in fetch loop:", e)

        finally:
            db.close()

        await asyncio.sleep(5)  # Wait 5 seconds before next fetch
