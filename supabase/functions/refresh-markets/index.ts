import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("🚀 Iniciando sincronização completa...");

    // 1. Buscar a lista de mercados da CoinGecko
    const marketRes = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1");
    if (!marketRes.ok) throw new Error(`Erro na API CoinGecko: ${marketRes.statusText}`);
    const markets: any[] = await marketRes.json();

    if (!markets || markets.length === 0) throw new Error("Nenhum dado de mercado retornado.");

    // 2. Preparar e salvar os dados na tabela `coins`
    const coinData = markets.map(m => ({
      id: m.id,
      symbol: m.symbol,
      name: m.name,
      image: m.image,
    }));
    const { error: coinError } = await supabase.from("coins").upsert(coinData, { onConflict: "id" });
    if (coinError) throw new Error(`Erro ao salvar em 'coins': ${coinError.message}`);
    console.log(`✅ ${coinData.length} moedas salvas/atualizadas.`);

    // 3. Preparar e salvar os dados na tabela `latest_markets`
    const marketData = markets.map(m => ({
      coin_id: m.id,
      price: m.current_price,
      market_cap: m.market_cap,
      market_cap_rank: m.market_cap_rank,
      volume_24h: m.total_volume,
      price_change_percentage_1h: m.price_change_percentage_1h_in_currency,
      price_change_percentage_24h: m.price_change_percentage_24h,
      price_change_percentage_7d: m.price_change_percentage_7d_in_currency,
      circulating_supply: m.circulating_supply,
      total_supply: m.total_supply,
      max_supply: m.max_supply,
      ath: m.ath,
      ath_change_percentage: m.ath_change_percentage,
      ath_date: m.ath_date,
      atl: m.atl,
      atl_change_percentage: m.atl_change_percentage,
      atl_date: m.atl_date,
    }));
    const { error: marketError } = await supabase.from("latest_markets").upsert(marketData, { onConflict: "coin_id" });
    if (marketError) throw new Error(`Erro ao salvar em 'latest_markets': ${marketError.message}`);
    console.log(`✅ ${marketData.length} mercados atuais salvos.`);

    // 4. Buscar e salvar dados na tabela `markets_history` (para o gráfico)
    console.log("Iniciando sincronização do histórico para o TOP 10...");
    const top10Coins = marketData.slice(0, 10);

    for (const coin of top10Coins) {
      console.log(`Buscando histórico para: ${coin.coin_id}`);
      const chartRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.coin_id}/market_chart?vs_currency=usd&days=30&interval=daily`);
      
      if (!chartRes.ok) {
        console.error(`Falha no histórico de ${coin.coin_id}: ${chartRes.statusText}`);
        await sleep(5000);
        continue;
      }
      
      const chartData = await chartRes.json();
      const historyPoints = (chartData.prices || []).map((p: [number, number], i: number) => ({
        coin_id: coin.coin_id,
        created_at: new Date(p[0]).toISOString(), // Usando o timestamp do dado como 'created_at'
        price: p[1],
        market_cap: chartData.market_caps[i][1],
        volume_24h: chartData.total_volumes[i][1],
      }));

      if (historyPoints.length > 0) {
        // Deleta dados antigos para essa moeda antes de inserir os novos
        await supabase.from("markets_history").delete().eq("coin_id", coin.coin_id);
        const { error: historyError } = await supabase.from("markets_history").insert(historyPoints);
        if (historyError) console.error(`Erro ao salvar histórico de ${coin.coin_id}: ${historyError.message}`);
        else console.log(`📈 Histórico de ${coin.coin_id} salvo.`);
      }

      await sleep(2500); // Espera para não sobrecarregar a API
    }
    
    return new Response(JSON.stringify({ message: "Sincronização concluída com sucesso!" }), {
      headers: { "Content-Type": "application/json" }, status: 200,
    });
  } catch (err) {
    console.error("Erro fatal na função de sincronização:", err);
    return new Response(String(err?.message || err), { status: 500 });
  }
});