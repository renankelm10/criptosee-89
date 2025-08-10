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
    const url = new URL(req.url);
    const pages = Math.max(1, Math.min(3, Number(url.searchParams.get("pages") || 2))); // up to 3 pages
    const perPage = Math.max(50, Math.min(250, Number(url.searchParams.get("per_page") || 250)));

    const allCoins: any[] = [];

    for (let page = 1; page <= pages; page++) {
      const cgUrl =
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&price_change_percentage=1h,24h,7d&locale=en&precision=full`;

      const res = await fetch(cgUrl, { headers: { "Accept": "application/json" } });
      if (!res.ok) {
        throw new Error(`CoinGecko fetch failed (page ${page}): ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) allCoins.push(...data);
    }

    // Prepare rows
    const coinsRows = allCoins.map((c) => ({
      id: String(c.id),
      symbol: String(c.symbol || "").toUpperCase(),
      name: String(c.name || ""),
      image: c.image || null,
    }));

    const latestRows = allCoins.map((c) => ({
      coin_id: String(c.id),
      price: toNumber(c.current_price),
      market_cap: toNumber(c.market_cap),
      market_cap_rank: Number.isFinite(c.market_cap_rank) ? c.market_cap_rank : null,
      volume_24h: toNumber(c.total_volume),
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
    }));

    // Upsert coins
    const { error: coinsErr } = await supabase.from("coins").upsert(coinsRows, { onConflict: "id" });
    if (coinsErr) throw new Error(`Upsert coins failed: ${coinsErr.message}`);

    // Upsert latest markets
    // Split into chunks to avoid payload too large
    const chunkSize = 500;
    for (let i = 0; i < latestRows.length; i += chunkSize) {
      const chunk = latestRows.slice(i, i + chunkSize);
      const { error: lmErr } = await supabase.from("latest_markets").upsert(chunk, { onConflict: "coin_id" });
      if (lmErr) throw new Error(`Upsert latest_markets failed: ${lmErr.message}`);
    }

    // Insert history for first page only to limit growth
    const historyRows = latestRows.slice(0, perPage).map((r) => ({
      coin_id: r.coin_id,
      price: r.price,
      market_cap: r.market_cap,
      volume_24h: r.volume_24h,
      price_change_percentage_1h: r.price_change_percentage_1h,
      price_change_percentage_24h: r.price_change_percentage_24h,
      price_change_percentage_7d: r.price_change_percentage_7d,
    }));
    if (historyRows.length > 0) {
      const { error: histErr } = await supabase.from("markets_history").insert(historyRows);
      if (histErr) {
        // Don't fail the whole request if history insert fails
        console.warn("markets_history insert warning:", histErr.message);
      }
    }

    const body = { count: allCoins.length, pages, perPage };
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
