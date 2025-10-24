import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { id, ids } = await req.json();
    const coinIds = ids || (id ? [id] : []);

    if (!coinIds.length) {
      return new Response(
        JSON.stringify({ error: 'Missing id or ids parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Refreshing ${coinIds.length} coin(s): ${coinIds.join(', ')}`);

    // Fetch from CoinGecko
    const idsParam = coinIds.join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=1h,24h,7d,30d`;
    
    console.log(`📡 Fetching from CoinGecko: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ CoinGecko API error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const coins: CoinGeckoMarket[] = await response.json();
    console.log(`✅ Received ${coins.length} coin(s) from CoinGecko`);

    if (coins.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No coins found', requested: coinIds }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data for upsert
    const updateTimestamp = new Date().toISOString();
    
    const coinRows = coins.map(c => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      market_cap_rank: c.market_cap_rank,
      updated_at: updateTimestamp,
    }));

    const latestRows = coins.map(c => ({
      coin_id: c.id,
      current_price: c.current_price,
      market_cap: c.market_cap,
      market_cap_rank: c.market_cap_rank,
      total_volume: c.total_volume,
      price_change_percentage_1h: c.price_change_percentage_1h_in_currency ?? null,
      price_change_percentage_24h: c.price_change_percentage_24h ?? null,
      price_change_percentage_7d: c.price_change_percentage_7d_in_currency ?? null,
      price_change_percentage_30d: c.price_change_percentage_30d_in_currency ?? null,
      circulating_supply: c.circulating_supply,
      total_supply: c.total_supply,
      max_supply: c.max_supply,
      ath: c.ath,
      ath_change_percentage: c.ath_change_percentage,
      ath_date: c.ath_date ? new Date(c.ath_date).toISOString() : null,
      atl: c.atl,
      atl_change_percentage: c.atl_change_percentage,
      atl_date: c.atl_date ? new Date(c.atl_date).toISOString() : null,
      last_updated: c.last_updated ? new Date(c.last_updated).toISOString() : updateTimestamp,
    }));

    const historyRows = coins.map(c => ({
      coin_id: c.id,
      current_price: c.current_price,
      market_cap: c.market_cap,
      total_volume: c.total_volume,
      price_change_percentage_24h: c.price_change_percentage_24h ?? null,
      timestamp: updateTimestamp,
    }));

    // Upsert coins
    console.log(`💾 Upserting ${coinRows.length} coin(s)...`);
    const { error: coinsError } = await supabase
      .from('coins')
      .upsert(coinRows, { onConflict: 'id' });

    if (coinsError) {
      console.error('❌ Error upserting coins:', coinsError);
      throw coinsError;
    }
    console.log('✅ Coins upserted successfully');

    // Upsert latest_markets
    console.log(`💾 Upserting ${latestRows.length} latest_markets row(s) at ${updateTimestamp}...`);
    const { error: marketsError } = await supabase
      .from('latest_markets')
      .upsert(latestRows, { onConflict: 'coin_id' });

    if (marketsError) {
      console.error('❌ Error upserting latest_markets:', marketsError);
      throw marketsError;
    }
    console.log(`✅ Latest markets upserted successfully - ${latestRows.length} row(s) updated at ${updateTimestamp}`);

    // Insert history snapshot
    console.log(`💾 Inserting ${historyRows.length} history snapshot(s)...`);
    const { error: historyError } = await supabase
      .from('markets_history')
      .insert(historyRows);

    if (historyError) {
      console.error('⚠️ Warning inserting history:', historyError);
      // Non-critical, continue
    } else {
      console.log('✅ History snapshots inserted successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: coins.length,
        coins: coins.map(c => ({ id: c.id, name: c.name, price: c.current_price })),
        timestamp: updateTimestamp,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in refresh-coin:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
