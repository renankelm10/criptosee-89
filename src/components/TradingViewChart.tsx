import { useState, useEffect, useRef } from "react";
import * as LightweightCharts from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: number;
  value: number;
  color: string;
}

interface TradingViewChartProps {
  cryptoId: string;
}

export const TradingViewChart = ({ cryptoId }: TradingViewChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const [timeframe, setTimeframe] = useState("24h");
  const [loading, setLoading] = useState(true);
  const [currentOHLC, setCurrentOHLC] = useState({ open: 0, high: 0, low: 0, close: 0, volume: 0 });
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 600;

    // Create chart
    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#1F2937' },
        horzLines: { color: '#1F2937' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'hsl(var(--primary))',
          width: 1,
          style: 3,
          labelBackgroundColor: 'hsl(var(--primary))',
        },
        horzLine: {
          color: 'hsl(var(--primary))',
          width: 1,
          style: 3,
          labelBackgroundColor: 'hsl(var(--primary))',
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#374151',
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      height: chartHeight,
    });

    chartRef.current = chart;

    // Add candlestick and volume series with guard for API availability
    if (typeof (chart as any).addCandlestickSeries !== 'function') {
      console.error('Lightweight Charts API mismatch: addCandlestickSeries not found on chart object.', chart);
    } else {
      const candlestickSeries = (chart as any).addCandlestickSeries({
        upColor: '#10B981',
        downColor: '#EF4444',
        borderUpColor: '#10B981',
        borderDownColor: '#EF4444',
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });
      candlestickSeriesRef.current = candlestickSeries;

      // Add volume series
      const volumeSeries = (chart as any).addHistogramSeries({
        color: '#6B7280',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    // Apply initial width
    chart.applyOptions({ width: chartContainerRef.current.clientWidth });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    const fetchOHLCData = async (tf: string = timeframe): Promise<boolean> => {
      try {
        setLoading(true);
        setHasData(true);

        // Try Supabase Edge Function first
        const url = `https://khcuvryopmaemccrptlk.supabase.co/functions/v1/get-ohlc?coin_id=${encodeURIComponent(cryptoId)}&timeframe=${tf}`;
        const response = await fetch(url, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg',
          },
        });
        
        let ohlc = [];
        let volume = [];

        if (response.ok) {
          const data = await response.json();
          ohlc = data.ohlc || [];
          volume = data.volume || [];
        }

        // Fallback to CoinGecko if no data
        if (!ohlc || ohlc.length === 0) {
          console.log(`Sem dados no Supabase, tentando CoinGecko para ${cryptoId}/${tf}`);
          const daysMap: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "3m": 90, "1y": 365 };
          const days = daysMap[tf] || 1;
          
          const cgResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${cryptoId}/ohlc?vs_currency=usd&days=${days}`
          );

          if (cgResponse.ok) {
            const cgData = await cgResponse.json();
            // CoinGecko OHLC format: [timestamp, open, high, low, close]
            ohlc = cgData.map((candle: number[]) => ({
              time: Math.floor(candle[0] / 1000),
              open: candle[1],
              high: candle[2],
              low: candle[3],
              close: candle[4],
            }));
            // No volume from CoinGecko OHLC, set empty
            volume = ohlc.map((c: any) => ({ time: c.time, value: 0, color: '#6B7280' }));
            console.log(`Fallback CoinGecko: ${ohlc.length} candles`);
          } else {
            console.log(`CoinGecko também falhou para ${cryptoId}/${tf}`);
            return false;
          }
        }

        if (!ohlc || ohlc.length === 0) {
          return false;
        }

        console.log(`Received ${ohlc.length} OHLC candles for ${cryptoId}/${tf}`);

        // Update chart
        if (candlestickSeriesRef.current && volumeSeriesRef.current) {
          candlestickSeriesRef.current.setData(ohlc);
          volumeSeriesRef.current.setData(volume);
          
          // Set current OHLC
          if (ohlc.length > 0) {
            const latest = ohlc[ohlc.length - 1];
            const latestVolume = volume[volume.length - 1];
            setCurrentOHLC({
              open: latest.open,
              high: latest.high,
              low: latest.low,
              close: latest.close,
              volume: latestVolume?.value || 0,
            });
          }

          // Fit content
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
          
          setHasData(true);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Error fetching OHLC data:', error);
        return false;
      } finally {
        setLoading(false);
      }
    };

    const loadData = async () => {
      const success = await fetchOHLCData(timeframe);
      if (!success) {
        setHasData(false);
      }
    };

    loadData();
  }, [cryptoId, timeframe]);

  const formatPrice = (value: number) => {
    if (value < 1) {
      return `$${value.toFixed(6)}`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const timeframes = [
    { value: "24h", label: "24h" },
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
    { value: "3m", label: "3m" },
    { value: "1y", label: "1a" }
  ];

  return (
    <div className="space-y-4">
      {/* Header + Timeframe selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Gráfico de Trading</h2>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              variant={timeframe === tf.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>

      {/* OHLC Legend */}
      {!loading && hasData && currentOHLC.open > 0 && (
        <div className="flex flex-wrap gap-4 text-sm px-2">
          <span className="text-muted-foreground">
            O: <strong className="text-foreground">{formatPrice(currentOHLC.open)}</strong>
          </span>
          <span className="text-muted-foreground">
            H: <strong className="text-crypto-gain">{formatPrice(currentOHLC.high)}</strong>
          </span>
          <span className="text-muted-foreground">
            L: <strong className="text-crypto-loss">{formatPrice(currentOHLC.low)}</strong>
          </span>
          <span className="text-muted-foreground">
            C: <strong className="text-foreground">{formatPrice(currentOHLC.close)}</strong>
          </span>
          <span className="text-muted-foreground">
            Vol: <strong className="text-foreground">{formatVolume(currentOHLC.volume)}</strong>
          </span>
        </div>
      )}

      {/* No Data Message */}
      {!loading && !hasData && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">📊 Sem dados disponíveis</p>
          <p className="text-sm">
            Não foi possível carregar dados para este período.
          </p>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border-4 border-muted rounded-full animate-spin border-t-primary"></div>
              <span className="text-sm text-muted-foreground">Carregando gráfico...</span>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden border border-border" />
      </div>
    </div>
  );
};
