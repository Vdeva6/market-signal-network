import httpx
from datetime import datetime, timezone
from app.db import SessionLocal, MarketPrice

def fetch_and_store_price(symbol="BTCUSD"):
    response = httpx.get(
    "https://api.binance.us/api/v3/ticker/price",
    params={"symbol": symbol}
    )
    data = response.json()

    print("DEBUG:", data)

    if "price" not in data:
        raise ValueError("Unexpected response from Binance API")
    
    price = float(data["price"])
    db = SessionLocal()
    try:
        entry = MarketPrice(symbol = symbol, price=price, timestamp=datetime.now(timezone.utc))
        db.add(entry)
        db.commit()
    finally:
        db.close()
    
    print(f"Inserted Price {symbol} = {price}")



if __name__ == "__main__":
    fetch_and_store_price()