// Supabase Edge Function: refresh-markets
// Fetches market data from CoinGecko and upserts into coins, latest_markets and optionally markets_history

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase URL or Service Role Key" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    console.log("refresh-markets started");
    const url = new URL(req.url);
    const pages = Math.max(1, Math.min(5, Number(url.searchParams.get("pages") || 4))); // 4 páginas = 1000 moedas
    const perPage = Math.max(1, Math.min(250, Number(url.searchParams.get("per_page") || 250)));

    console.log(`Fetching ${pages} pages with ${perPage} coins per page`);
    
    // Fetch market data from CoinGecko com rate limit handling
    const allCoins: any[] = [];
    for (let page = 1; page <= pages; page++) {
      const cgUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=1h,24h,7d`;
      console.log(`Fetching page ${page}...`);
      const res = await fetch(cgUrl, { headers: { "Accept": "application/json" } });
      
      if (!res.ok) {
        if (res.status === 429) {
          console.warn(`⚠️ Rate limit (429) na página ${page} - aguardando 60s...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
          page--; // Retry
          continue;
        }
        throw new Error(`CoinGecko fetch failed (page ${page}): ${res.status}`);
      }
      
      const data = await res.json();
      if (Array.isArray(data)) {
        console.log(`✅ Recebidas ${data.length} moedas da página ${page}`);
        allCoins.push(...data);
      }
      
      // DELAY DE 12 SEGUNDOS ENTRE PÁGINAS (5 calls/min)
      if (page < pages) {
        console.log(`⏳ Aguardando 12s antes da próxima página...`);
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }

    // ELIMINAR DUPLICATAS antes de processar
    console.log(`📊 Total bruto: ${allCoins.length} moedas`);
    
    const uniqueCoinsMap = new Map();
    allCoins.forEach(coin => {
      if (!uniqueCoinsMap.has(coin.id)) {
        uniqueCoinsMap.set(coin.id, coin);
      } else {
        console.warn(`⚠️ Duplicata removida: ${coin.id} (${coin.name})`);
      }
    });
    
    const uniqueCoins = Array.from(uniqueCoinsMap.values());
    console.log(`✅ Moedas únicas: ${uniqueCoins.length} (removidas ${allCoins.length - uniqueCoins.length} duplicatas)`);

    // Prepare data for upsert (usando uniqueCoins)
    const coinRows = uniqueCoins.map((c) => ({
      id: String(c.id),
      symbol: String(c.symbol || "").toUpperCase(),
      name: String(c.name || ""),
      image: c.image || null,
    }));

    const latestRows = uniqueCoins.map((c) => ({
      coin_id: String(c.id),
      current_price: toNumber(c.current_price),
      market_cap: toNumber(c.market_cap),
      market_cap_rank: Number.isFinite(c.market_cap_rank) ? c.market_cap_rank : null,
      total_volume: toNumber(c.total_volume),
      price_change_percentage_1h: toNumber(c.price_change_percentage_1h_in_currency),
      price_change_percentage_24h: toNumber(c.price_change_percentage_24h_in_currency),
      price_change_percentage_7d: toNumber(c.price_change_percentage_7d_in_currency),
      circulating_supply: toNumber(c.circulating_supply),
      total_supply: toNumber(c.total_supply),
      max_supply: toNumber(c.max_supply),
      ath: toNumber(c.ath),
      ath_change_percentage: toNumber(c.ath_change_percentage),
      ath_date: c.ath_date ? new Date(c.ath_date).toISOString() : null,
      atl: toNumber(c.atl),
      atl_change_percentage: toNumber(c.atl_change_percentage),
      atl_date: c.atl_date ? new Date(c.atl_date).toISOString() : null,
      last_updated: c.last_updated ? new Date(c.last_updated).toISOString() : new Date().toISOString(),
    }));

    // Upsert coins
    console.log(`Upserting ${coinRows.length} coins...`);
    const { error: coinsErr } = await supabase.from("coins").upsert(coinRows, { onConflict: "id" });
    if (coinsErr) throw new Error(`Upsert coins failed: ${coinsErr.message}`);
    console.log("Coins upserted successfully");

    // Upsert latest_markets (chunks of 1000)
    const chunkSize = 1000;
    const updateTimestamp = new Date().toISOString();
    console.log(`Upserting ${latestRows.length} market rows at ${updateTimestamp}...`);
    for (let i = 0; i < latestRows.length; i += chunkSize) {
      const chunk = latestRows.slice(i, i + chunkSize);
      console.log(`Upserting chunk ${Math.floor(i/chunkSize) + 1}...`);
      const { error: lmErr } = await supabase.from("latest_markets").upsert(chunk, { onConflict: "coin_id" });
      if (lmErr) throw new Error(`Upsert latest_markets failed: ${lmErr.message}`);
    }
    console.log(`✅ Markets upserted successfully - ${latestRows.length} rows updated at ${updateTimestamp}`);

    // Insert history (TODAS as moedas para acumular dados históricos)
    const historyRows = latestRows.map((r) => ({
      coin_id: r.coin_id,
      current_price: r.current_price,
      market_cap: r.market_cap,
      total_volume: r.total_volume,
      price_change_percentage_24h: r.price_change_percentage_24h,
    }));

    if (historyRows.length > 0) {
      // Inserir em chunks para evitar timeout
      const histChunkSize = 500;
      for (let i = 0; i < historyRows.length; i += histChunkSize) {
        const chunk = historyRows.slice(i, i + histChunkSize);
        const { error: histErr } = await supabase.from("markets_history").insert(chunk);
        if (histErr) {
          console.warn(`⚠️ markets_history chunk ${i} warning:`, histErr.message);
        }
      }
    }

    const body = { count: uniqueCoins.length, pages, perPage, duplicatesRemoved: allCoins.length - uniqueCoins.length };
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("refresh-markets error:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function toNumber(v: any): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Number(n) : null;
}
