import { useState, useEffect } from "react";
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from "recharts";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Switch } from "@/components/ui/switch";

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
  date: string;
}

interface CryptoPriceChartProps {
  cryptoId: string;
}

export const CryptoPriceChart = ({ cryptoId }: CryptoPriceChartProps) => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>("7");
  const [logScale, setLogScale] = useState(false);

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
        
        const formattedData: PriceData[] = (data.prices || []).map(([timestamp, price]: [number, number], idx: number) => {
          const vol = data.total_volumes?.[idx]?.[1] ?? 0;
          return {
            timestamp,
            price,
            volume: vol,
            date: new Date(timestamp).toLocaleDateString('pt-BR', {
              month: 'short',
              day: 'numeric',
              ...(timeframe === "1" && { hour: '2-digit', minute: '2-digit' })
            })
          };
        });

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
      <div className="h-[420px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Linear</span>
          <Switch checked={logScale} onCheckedChange={setLogScale} aria-label="Alternar escala log" />
          <span>Log</span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={priceData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis yAxisId="left" hide domain={[0, 'auto']} />
            <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} scale={logScale ? 'log' : 'linear'} tickFormatter={formatPrice} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))"
              }}
              formatter={(value: number, name: string) => {
                if (name === 'price') return [formatPrice(value), 'Preço'];
                if (name === 'volume') return [`${(value/1e6).toFixed(2)}M`, 'Volume'];
                return [value, name];
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Bar yAxisId="left" dataKey="volume" fill="hsl(var(--muted-foreground)/0.3)" barSize={16} radius={[2,2,0,0]} />
            <Area yAxisId="right" type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" />
            <Brush dataKey="date" height={20} stroke="hsl(var(--primary))" travellerWidth={8} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};