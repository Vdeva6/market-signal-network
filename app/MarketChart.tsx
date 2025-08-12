"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  Legend,
} from "recharts";

import { useEffect, useState } from "react";

// Types
interface Signal {
  timestamp: string;
  price: number;
  z_score: number;
  type: "Spike" | "Drop";
}

interface PricePoint {
  timestamp: string;
  price: number;
}

interface Props {
  prices: PricePoint[];
  signals: Signal[];
}

// Extended chart data interface
interface ChartDataPoint extends PricePoint {
  isSignal: boolean;
  signalType?: "Spike" | "Drop";
  z_score?: number;
  spikePrice?: number | null;
  dropPrice?: number | null;
}

export default function MarketChart({ prices, signals }: Props) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    // Combine prices with signals for the chart
    const signalMap = new Map(
      signals.map(signal => [signal.timestamp, signal])
    );

    const combined = prices.map(price => {
      const signal = signalMap.get(price.timestamp);
      return {
        timestamp: price.timestamp,
        price: price.price,
        isSignal: !!signal,
        signalType: signal?.type,
        z_score: signal?.z_score,
        // Add signal data points for scatter plot
        spikePrice: signal?.type === "Spike" ? signal.price : null,
        dropPrice: signal?.type === "Drop" ? signal.price : null,
      };
    });

    setChartData(combined);
  }, [prices, signals]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTooltipLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const customTooltip = (props: {
    active?: boolean;
    payload?: Array<{
      payload: ChartDataPoint;
      value?: number;
    }>;
    label?: string | number;
  }) => {
    const { active, payload, label } = props;
    
    if (!active || !payload || !payload.length || !label) return null;

    const data = payload[0]?.payload;
    const price = data?.price;
    const isSignal = data?.isSignal;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm text-gray-600 mb-1">
          {formatTooltipLabel(String(label))}
        </p>
        <p className="font-semibold text-blue-600">
          Price: ${price?.toFixed(2)}
        </p>
        {isSignal && data && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className={`font-medium ${data.signalType === 'Spike' ? 'text-green-600' : 'text-red-600'}`}>
              {data.signalType} Alert
            </p>
            <p className="text-sm text-gray-600">
              Z-Score: {data.z_score?.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-2 text-gray-800">
        BTC/USDT Price History & Anomaly Detection
      </h2>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={chartData} 
          margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTimestamp}
            minTickGap={50}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={["dataMin - 100", "dataMax + 100"]}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip content={customTooltip} />
          <Legend />
          
          {/* Main price line */}
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={false}
            name="BTC Price"
            connectNulls={true}
          />
          
          {/* Spike signals (green dots) */}
          <Scatter
            dataKey="spikePrice"
            fill="#16a34a"
            name="Price Spike"
            shape="circle"
          />
          
          {/* Drop signals (red dots) */}
          <Scatter
            dataKey="dropPrice"
            fill="#dc2626"
            name="Price Drop"
            shape="circle"
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend for signal colors */}
      <div className="flex items-center justify-center mt-2 space-x-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span>Price Spike</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span>Price Drop</span>
        </div>
      </div>
    </div>
  );
}