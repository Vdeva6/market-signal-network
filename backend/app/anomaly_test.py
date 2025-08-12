import pandas as pd
from app.db import SessionLocal, MarketPrice

def detect_anomaly_zscore():
    db = SessionLocal()
    try:
        rows = (db.query(MarketPrice.timestamp, MarketPrice.price).order_by(MarketPrice.id.desc()).limit(20).all())
        rows = list(reversed(rows))
        if len(rows) < 20:
            print("Not enough data to compute")
            return None
        
        df = pd.DataFrame(rows, columns= ["timestamp", "price"])
        mean_price = df["price"].mean()
        std_price = df["price"].std()

        if std_price == 0:
            print("No price variation, skipping anomaly check.")
            return None
        
        latest_price = df["price"].iloc[-1]
        z_score = (latest_price - mean_price)/std_price
        if abs(z_score) > 2:
            print(f"Anomaly detected! Z-score: {z_score:.2f}")
        else:
            print(f"No anomaly detected! Z-score: {z_score:.2f}")

        return z_score
    finally:
        db.close()
    

if __name__ == "__main__":
    detect_anomaly_zscore()
