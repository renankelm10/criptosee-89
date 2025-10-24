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
  const lineSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const [timeframe, setTimeframe] = useState("24h");
  const [loading, setLoading] = useState(true);
  const [currentOHLC, setCurrentOHLC] = useState({ open: 0, high: 0, low: 0, close: 0, volume: 0 });
  const [hasData, setHasData] = useState(true);
  const [seriesType, setSeriesType] = useState<'candlestick' | 'line'>('candlestick');
  const [dataSource, setDataSource] = useState<string>('');

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

    // Resilient series creation: try candlestick first, fallback to line
    let seriesCreated = false;
    if (typeof (chart as any).addCandlestickSeries === 'function') {
      try {
        const candlestickSeries = (chart as any).addCandlestickSeries({
          upColor: '#10B981',
          downColor: '#EF4444',
          borderUpColor: '#10B981',
          borderDownColor: '#EF4444',
          wickUpColor: '#10B981',
          wickDownColor: '#EF4444',
        });
        candlestickSeriesRef.current = candlestickSeries;
        setSeriesType('candlestick');
        seriesCreated = true;
      } catch (e) {
        console.warn('Failed to create candlestick series, falling back to line series', e);
      }
    }
    
    // Fallback to line series if candlestick not available
    if (!seriesCreated && typeof (chart as any).addLineSeries === 'function') {
      try {
        const lineSeries = (chart as any).addLineSeries({
          color: '#10B981',
          lineWidth: 2,
        });
        lineSeriesRef.current = lineSeries;
        setSeriesType('line');
        seriesCreated = true;
      } catch (e) {
        console.error('Failed to create any chart series', e);
      }
    }

    // Volume series is optional
    if (typeof (chart as any).addHistogramSeries === 'function') {
      try {
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
      } catch (e) {
        console.warn('Volume series not available', e);
      }
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

        const daysMap: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "3m": 90, "1y": 365 };
        const days = daysMap[tf] || 1;
        
        let ohlc: any[] = [];
        let volume: any[] = [];
        let source = '';

        // 1) Try Supabase Edge Function first
        try {
          const url = `https://khcuvryopmaemccrptlk.supabase.co/functions/v1/get-ohlc?coin_id=${encodeURIComponent(cryptoId)}&timeframe=${tf}`;
          const response = await fetch(url, {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            ohlc = data.ohlc || [];
            volume = data.volume || [];
            if (ohlc.length > 0) {
              source = 'Supabase';
            }
          }
        } catch (e) {
          console.warn('Supabase fetch failed', e);
        }

        // 2) Fallback to CoinGecko OHLC if no data
        if (!ohlc || ohlc.length === 0) {
          console.log(`Tentando CoinGecko OHLC para ${cryptoId}/${tf}`);
          try {
            const cgResponse = await fetch(
              `https://api.coingecko.com/api/v3/coins/${cryptoId}/ohlc?vs_currency=usd&days=${days}`
            );

            if (cgResponse.ok) {
              const cgData = await cgResponse.json();
              if (Array.isArray(cgData) && cgData.length > 0) {
                ohlc = cgData.map((candle: number[]) => ({
                  time: Math.floor(candle[0] / 1000),
                  open: candle[1],
                  high: candle[2],
                  low: candle[3],
                  close: candle[4],
                }));
                volume = ohlc.map((c: any) => ({ time: c.time, value: 0, color: '#6B7280' }));
                source = 'CG OHLC';
                console.log(`CoinGecko OHLC: ${ohlc.length} candles`);
              }
            }
          } catch (e) {
            console.warn('CoinGecko OHLC failed', e);
          }
        }

        // 3) Final fallback: CoinGecko market_chart (line data)
        if (!ohlc || ohlc.length === 0) {
          console.log(`Tentando CoinGecko market_chart para ${cryptoId}/${tf}`);
          try {
            const interval = days <= 1 ? 'hourly' : 'daily';
            const mcResponse = await fetch(
              `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`
            );

            if (mcResponse.ok) {
              const mcData = await mcResponse.json();
              const prices = mcData.prices || [];
              
              if (Array.isArray(prices) && prices.length > 0) {
                // Convert to OHLC format (using close price for all OHLC values for line chart)
                ohlc = prices.map((p: [number, number]) => {
                  const price = p[1];
                  return {
                    time: Math.floor(p[0] / 1000),
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                  };
                });
                
                // Try to get volume data
                const volumes = mcData.total_volumes || [];
                if (Array.isArray(volumes) && volumes.length > 0) {
                  volume = volumes.map((v: [number, number]) => ({
                    time: Math.floor(v[0] / 1000),
                    value: v[1],
                    color: '#6B7280',
                  }));
                }
                
                source = 'CG Market';
                console.log(`CoinGecko market_chart: ${ohlc.length} pontos`);
                
                // Force line series if we're using market_chart data
                if (!lineSeriesRef.current && chartRef.current && typeof (chartRef.current as any).addLineSeries === 'function') {
                  try {
                    const lineSeries = (chartRef.current as any).addLineSeries({
                      color: '#10B981',
                      lineWidth: 2,
                    });
                    lineSeriesRef.current = lineSeries;
                    setSeriesType('line');
                  } catch (e) {
                    console.warn('Could not create line series', e);
                  }
                }
              }
            }
          } catch (e) {
            console.warn('CoinGecko market_chart failed', e);
          }
        }

        // If still no data, fail
        if (!ohlc || ohlc.length === 0) {
          console.log(`Nenhuma fonte de dados disponível para ${cryptoId}/${tf}`);
          setDataSource('');
          return false;
        }

        console.log(`Aplicando ${ohlc.length} pontos de ${source}`);
        setDataSource(source);

        // Apply data to the appropriate series
        if (candlestickSeriesRef.current && seriesType === 'candlestick') {
          candlestickSeriesRef.current.setData(ohlc);
        } else if (lineSeriesRef.current) {
          // Convert to line data format
          const lineData = ohlc.map((d: any) => ({ time: d.time, value: d.close }));
          lineSeriesRef.current.setData(lineData);
        }

        // Apply volume data if series exists
        if (volumeSeriesRef.current && volume.length > 0) {
          volumeSeriesRef.current.setData(volume);
        }

        // Set current OHLC for legend
        if (ohlc.length > 0) {
          const latest = ohlc[ohlc.length - 1];
          const latestVolume = volume.length > 0 ? volume[volume.length - 1] : null;
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
      } catch (error) {
        console.error('Error fetching OHLC data:', error);
        setDataSource('');
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
          {dataSource && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {dataSource}
            </span>
          )}
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
          <p className="text-lg font-semibold mb-2">📊 Sem dados para este período</p>
          <p className="text-sm">
            Tente a aba <strong>Histórico/Log</strong> ou outro período.
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
