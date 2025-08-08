import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PriceData {
  timestamp: number;
  price: number;
  date: string;
}

interface CryptoPriceChartProps {
  cryptoId: string;
}

export const CryptoPriceChart = ({ cryptoId }: CryptoPriceChartProps) => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>("7");

  useEffect(() => {
    const fetchPriceData = async (retryCount = 0) => {
      try {
        setLoading(true);
        
        // Adicionar delay para retry
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, retryCount * 1500));
        }

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=${timeframe}&interval=${timeframe === "1" ? "hourly" : "daily"}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (response.status === 429) {
          // Rate limited - retry after delay
          if (retryCount < 2) {
            console.log(`Chart API rate limited, retrying in ${(retryCount + 1) * 1.5} seconds...`);
            return fetchPriceData(retryCount + 1);
          }
          throw new Error('API temporariamente indisponível para gráficos. Tente novamente em alguns minutos.');
        }

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: Falha ao buscar dados do gráfico`);
        }

        const data = await response.json();
        
        const formattedData = data.prices.map(([timestamp, price]: [number, number]) => ({
          timestamp,
          price,
          date: new Date(timestamp).toLocaleDateString('pt-BR', {
            month: 'short',
            day: 'numeric',
            ...(timeframe === "1" && { hour: '2-digit', minute: '2-digit' })
          })
        }));

        setPriceData(formattedData);
      } catch (error) {
        console.error('Erro ao buscar dados do gráfico:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceData();
  }, [cryptoId, timeframe]);

  const formatPrice = (value: number) => {
    if (value < 1) {
      return `$${value.toFixed(6)}`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const timeframes = [
    { value: "1", label: "24h" },
    { value: "7", label: "7d" },
    { value: "30", label: "30d" },
    { value: "90", label: "3m" },
    { value: "365", label: "1a" }
  ];

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeframe Buttons */}
      <div className="flex flex-wrap gap-2">
        {timeframes.map((tf) => (
          <Button
            key={tf.value}
            variant={timeframe === tf.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeframe(tf.value)}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatPrice}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))"
              }}
              formatter={(value: number) => [formatPrice(value), "Preço"]}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
              activeDot={{ 
                r: 4, 
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};