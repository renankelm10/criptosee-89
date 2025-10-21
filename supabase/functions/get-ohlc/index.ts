import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=60',
}

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
  color?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const coin_id = url.searchParams.get('coin_id');
    const timeframe = url.searchParams.get('tf') || '24h';

    if (!coin_id) {
      return new Response(
        JSON.stringify({ error: 'coin_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching OHLC for ${coin_id} with timeframe ${timeframe}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate time range and bucket size based on timeframe
    const now = new Date();
    let startTime: Date;
    let bucketMinutes: number;

    switch (timeframe) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        bucketMinutes = 30; // 30 min buckets
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        bucketMinutes = 240; // 4 hour buckets
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        bucketMinutes = 1440; // 1 day buckets
        break;
      case '3m':
        startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        bucketMinutes = 1440; // 1 day buckets
        break;
      case '1y':
        startTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        bucketMinutes = 1440; // 1 day buckets
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        bucketMinutes = 30;
    }

    // Fetch historical data
    const { data: historyData, error } = await supabase
      .from('markets_history')
      .select('timestamp, current_price, total_volume')
      .eq('coin_id', coin_id)
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: true })
      .limit(5000);

    if (error) {
      console.error('Error fetching history:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch market history' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!historyData || historyData.length === 0) {
      console.log(`No data found for ${coin_id}`);
      return new Response(
        JSON.stringify({ ohlc: [], volume: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${historyData.length} history records`);

    // Aggregate data into OHLC buckets
    const buckets = new Map<number, {
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      count: number;
    }>();

    const bucketMs = bucketMinutes * 60 * 1000;

    for (const record of historyData) {
      const timestamp = new Date(record.timestamp).getTime();
      const bucketTime = Math.floor(timestamp / bucketMs) * bucketMs;
      
      const price = Number(record.current_price);
      const volume = Number(record.total_volume || 0);

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          open: price,
          high: price,
          low: price,
          close: price,
          volume: volume,
          count: 1,
        });
      } else {
        const bucket = buckets.get(bucketTime)!;
        bucket.high = Math.max(bucket.high, price);
        bucket.low = Math.min(bucket.low, price);
        bucket.close = price;
        bucket.volume = Math.max(bucket.volume, volume);
        bucket.count++;
      }
    }

    // Convert to arrays
    const ohlc: OHLCData[] = [];
    const volume: VolumeData[] = [];

    for (const [time, data] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
      const timeInSeconds = Math.floor(time / 1000);
      
      ohlc.push({
        time: timeInSeconds,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
      });

      volume.push({
        time: timeInSeconds,
        value: data.volume,
        color: data.close >= data.open ? '#22c55e' : '#ef4444',
      });
    }

    console.log(`Generated ${ohlc.length} OHLC candles`);

    return new Response(
      JSON.stringify({ ohlc, volume }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
