# Real-Time Market Signal Network

A full-stack MVP that ingests, detects, and visualizes market anomalies in real time.

## Features
- FastAPI backend with Docker and PostgreSQL
- Z-score anomaly detection (Spike/Drop)
- WebSocket + REST API support
- Next.js + Tailwind frontend dashboard
- Real-time chart + historical signal feed (Recharts)

## Tech Stack
- FastAPI • PostgreSQL • SQLAlchemy • Pandas
- Docker • httpx • WebSocket
- Next.js • Tailwind • Recharts • TypeScript

## Run Locally

```bash
git clone https://github.com/your-username/market-signal-network
cd market-signal-network
docker-compose up --build

Then open the frontend: http://localhost:3000
