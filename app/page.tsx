"use client";

import MarketChart from "./MarketChart";
import { useEffect, useState } from "react";

type Signal = {
  symbol: string;
  price: number;
  timestamp: string;
  z_score: number;
  type: "Spike" | "Drop";
};

type PricePoint = {
  timestamp: string;
  price: number;
};

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  // 🧠 Load signals on first page load (REST)
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch("/api/signals?limit=50"); // Increased limit for better chart
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const signalData = await res.json();
        
        // Sort by timestamp to ensure chronological order
        const sortedSignals = signalData.sort((a: Signal, b: Signal) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    
        // Update signals (keep most recent first for display)
        setSignals([...sortedSignals].reverse());
    
        // Extract price history for the chart (chronological order)
        const pricePoints = sortedSignals.map((s: Signal) => ({
          timestamp: s.timestamp,
          price: s.price,
        }));
        
        setPrices(pricePoints);
        
        // Set current price to the most recent signal
        if (sortedSignals.length > 0) {
          setCurrentPrice(sortedSignals[sortedSignals.length - 1].price);
        }
        
      } catch (err) {
        console.error("Failed to fetch signals:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    
    loadHistory();
  }, []);

  // 🔌 Connect WebSocket for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket("ws://localhost:8000/ws/signals");

      socket.onopen = () => {
        setConnected(true);
        setError(null);
        console.log("WebSocket connected");
      };

      socket.onmessage = (event) => {
        try {
          const signal = JSON.parse(event.data);
          console.log("Received signal:", signal);
        
          // Add to signal list (keep most recent first)
          setSignals((prev) => [signal, ...prev.slice(0, 49)]);
        
          // Add to price list (chronological order)
          setPrices((prev) => [
            ...prev,
            { timestamp: signal.timestamp, price: signal.price },
          ]);
          
          // Update current price
          setCurrentPrice(signal.price);
          
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("WebSocket connection error");
      };

      socket.onclose = (event) => {
        setConnected(false);
        console.log("WebSocket closed:", event.code, event.reason);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      return socket;
    };

    const socket = connectWebSocket();
    
    return () => {
      socket.close();
    };
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading market data...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with current price */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BTC/USDT Market Monitor</h1>
            <p className="text-gray-600 mt-1">Real-time anomaly detection system</p>
          </div>
          <div className="text-right">
            {currentPrice && (
              <div className="text-3xl font-bold text-blue-600">
                {formatPrice(currentPrice)}
              </div>
            )}
            <div className={`text-sm mt-1 flex items-center justify-end ${connected ? "text-green-600" : "text-red-600"}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${connected ? "bg-green-500" : "bg-red-500"}`}></div>
              {connected ? "Live Connected" : "Disconnected"}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error: {error}</p>
        </div>
      )}
      
      {/* Chart */}
      <MarketChart prices={prices} signals={signals} />
      
      {/* Recent signals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Recent Signals</h2>
        
        {signals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No signals detected yet</p>
        ) : (
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {signals.slice(0, 10).map((signal, idx) => (
              <div
                key={`${signal.timestamp}-${idx}`}
                className={`border-l-4 ${
                  signal.type === "Spike" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                } p-4 rounded-r-lg flex justify-between items-center`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-gray-900">{signal.symbol}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      signal.type === "Spike" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {signal.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatTimestamp(signal.timestamp)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(signal.price)}
                  </p>
                  <p className={`text-sm ${signal.type === "Spike" ? "text-green-600" : "text-red-600"}`}>
                    Z-Score: {signal.z_score.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}