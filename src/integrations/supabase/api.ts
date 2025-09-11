// src/integrations/supabase/api.ts

import { supabase } from "./client";

// Tipos para os dados, para garantir consistência
export interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency?: number;
  market_cap_rank: number;
  image: string;
  market_cap: number;
  total_volume: number;
}

export interface GlobalData {
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  active_cryptocurrencies: number;
  market_cap_percentage: { btc: number };
}

/**
 * Busca e processa os dados principais das criptomoedas do Supabase.
 * Esta é a função mais crítica para a página inicial.
 */
export async function fetchMainCryptoData(): Promise<{ cryptos: CryptoData[]; globalData: GlobalData | null; error: string | null }> {
  try {
    console.log('📡 Buscando dados do Supabase...');
    
    // Busca os dados de mercado, já ordenados
    const { data: markets, error: marketError } = await supabase
      .from('latest_markets')
      .select('*')
      .order('market_cap_rank', { ascending: true })
      .limit(500);

    if (marketError) {
      throw new Error(`Falha ao buscar mercados: ${marketError.message}`);
    }

    if (!markets || markets.length === 0) {
      throw new Error('Nenhum dado de mercado foi encontrado no banco de dados.');
    }
    
    // Busca as informações complementares das moedas
    const coinIds = markets.map((m) => m.coin_id);
    const { data: coins, error: coinError } = await supabase
      .from('coins')
      .select('id, symbol, name, image')
      .in('id', coinIds);

    if (coinError) {
      throw new Error(`Falha ao buscar informações das moedas: ${coinError.message}`);
    }

    const coinMap = new Map((coins || []).map((c) => [c.id, c]));

    // Combina os dados de "coins" e "latest_markets"
    const mergedData: CryptoData[] = markets
      .map((market) => {
        const coinInfo = coinMap.get(market.coin_id);
        return {
          id: market.coin_id,
          name: coinInfo?.name || market.coin_id,
          symbol: (coinInfo?.symbol || '').toLowerCase(),
          current_price: Number(market.price) || 0,
          price_change_percentage_24h: Number(market.price_change_percentage_24h) || 0,
          price_change_percentage_1h_in_currency: Number(market.price_change_percentage_1h) || 0,
          market_cap_rank: Number(market.market_cap_rank) || 0,
          image: coinInfo?.image || '',
          market_cap: Number(market.market_cap) || 0,
          total_volume: Number(market.volume_24h) || 0,
        };
      })
      .filter(crypto => crypto.market_cap_rank > 0) // Garante que apenas moedas com rank válido apareçam
      .sort((a, b) => a.market_cap_rank - b.market_cap_rank);

    // Calcula os dados globais a partir dos dados recebidos
    const totalMarketCap = mergedData.reduce((sum, crypto) => sum + (crypto.market_cap || 0), 0);
    const totalVolume = mergedData.reduce((sum, crypto) => sum + (crypto.total_volume || 0), 0);
    const btc = mergedData.find(c => c.id === 'bitcoin');
    const dominance = btc && totalMarketCap > 0 ? (btc.market_cap / totalMarketCap) * 100 : 0;

    const globalStats: GlobalData = {
      total_market_cap: { usd: totalMarketCap },
      total_volume: { usd: totalVolume },
      active_cryptocurrencies: mergedData.length,
      market_cap_percentage: { btc: dominance },
    };

    console.log(`✅ ${mergedData.length} moedas processadas com sucesso.`);
    return { cryptos: mergedData, globalData: globalStats, error: null };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    console.error('💥 Erro em fetchMainCryptoData:', errorMessage);
    return { cryptos: [], globalData: null, error: errorMessage };
  }
}