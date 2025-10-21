import { useState, useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, HistogramData } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: string;
  value: number;
  color: string;
}

interface TradingViewChartProps {
  cryptoId: string;
}

export const TradingViewChart = ({ cryptoId }: TradingViewChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const [timeframe, setTimeframe] = useState("7");
  const [loading, setLoading] = useState(true);
  const [currentOHLC, setCurrentOHLC] = useState({ open: 0, high: 0, low: 0, close: 0, volume: 0 });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
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
      height: 500,
    });

    chartRef.current = chart;

    // Add candlestick series
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
    volumeSeriesRef.current = volumeSeries;

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
    const fetchOHLCData = async (retryCount = 0) => {
      try {
        setLoading(true);

        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, retryCount * 1500));
        }

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cryptoId}/ohlc?vs_currency=usd&days=${timeframe}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (response.status === 429) {
          if (retryCount < 2) {
            console.log(`OHLC API rate limited, retrying in ${(retryCount + 1) * 1.5} seconds...`);
            return fetchOHLCData(retryCount + 1);
          }
          throw new Error('API temporariamente indisponível. Tente novamente em alguns minutos.');
        }

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: Falha ao buscar dados OHLC`);
        }

        const data = await response.json();

        // Fetch volume data separately
        const volumeResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=${timeframe}&interval=daily`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        let volumeData: any[] = [];
        if (volumeResponse.ok) {
          const volumeJson = await volumeResponse.json();
          volumeData = volumeJson.total_volumes || [];
        }

        // Transform OHLC data
        const ohlcData: OHLCData[] = data.map(([timestamp, open, high, low, close]: number[]) => {
          const date = new Date(timestamp);
          return {
            time: date.toISOString().split('T')[0],
            open,
            high,
            low,
            close,
          };
        });

        // Transform volume data
        const volumeChartData: VolumeData[] = volumeData.map(([timestamp, volume]: number[], idx: number) => {
          const date = new Date(timestamp);
          const prevClose = idx > 0 ? ohlcData[idx - 1]?.close : ohlcData[0]?.open;
          const currentClose = ohlcData[idx]?.close || prevClose;
          const isGreen = currentClose >= prevClose;
          
          return {
            time: date.toISOString().split('T')[0],
            value: volume,
            color: isGreen ? '#10B98166' : '#EF444466',
          };
        });

        // Update chart
        if (candlestickSeriesRef.current && volumeSeriesRef.current) {
          candlestickSeriesRef.current.setData(ohlcData);
          volumeSeriesRef.current.setData(volumeChartData);
          
          // Set current OHLC
          if (ohlcData.length > 0) {
            const latest = ohlcData[ohlcData.length - 1];
            const latestVolume = volumeChartData[volumeChartData.length - 1];
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
        }

      } catch (error) {
        console.error('Erro ao buscar dados OHLC:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOHLCData();
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
    { value: "1", label: "24h" },
    { value: "7", label: "7d" },
    { value: "30", label: "30d" },
    { value: "90", label: "3m" },
    { value: "365", label: "1a" }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Gráfico de Trading</h2>
        </div>
        
        <div className="flex gap-2">
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
      {!loading && (
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
