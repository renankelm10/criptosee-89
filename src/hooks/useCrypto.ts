import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface CryptoData {
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
  last_updated?: string;
}

interface GlobalData {
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  active_cryptocurrencies: number;
  market_cap_percentage: { btc: number };
}

export const useCrypto = () => {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const isRefreshing = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Função simplificada para buscar dados diretamente do Supabase
  const fetchFromSupabase = async (): Promise<{ cryptos: CryptoData[]; globalData: GlobalData | null; needsRefresh: boolean }> => {
    console.log('📡 Buscando dados do Supabase...');
    
    // Buscar dados do mercado ordenados por rank
    const { data: markets, error: mErr } = await supabase
      .from('latest_markets')
      .select('*')
      .order('market_cap_rank', { ascending: true })
      .limit(1000);
    
    if (mErr) {
      console.error('❌ Erro ao buscar latest_markets:', mErr.message);
      throw new Error(`Erro Supabase: ${mErr.message}`);
    }
    
    // Check if data needs refresh
    let needsRefresh = false;
    
    if (!markets || markets.length === 0) {
      console.warn('⚠️ Nenhum dado encontrado em latest_markets');
      needsRefresh = true;
    } else {
      // Check freshness of data using top coin (Bitcoin)
      const topCoin = markets.find((m: any) => m.coin_id === 'bitcoin') || markets[0];
      if (topCoin?.last_updated) {
        const lastUpdated = new Date(topCoin.last_updated).getTime();
        const now = Date.now();
        const ageMinutes = (now - lastUpdated) / (1000 * 60);
        
        if (ageMinutes > 7) {
          console.log(`⏰ Data is ${ageMinutes.toFixed(1)} minutes old, needs refresh`);
          needsRefresh = true;
        } else {
          console.log(`✅ Data is fresh (${ageMinutes.toFixed(1)} minutes old)`);
        }
      } else {
        console.warn('⚠️ No last_updated timestamp found');
        needsRefresh = true;
      }
    }
    
    if (!markets || markets.length === 0) {
      return { cryptos: [], globalData: null, needsRefresh: true };
    }

    // Buscar informações das moedas
    const ids = markets.map((m: any) => m.coin_id);
    const { data: coins, error: cErr } = await supabase
      .from('coins')
      .select('id, symbol, name, image')
      .in('id', ids);
    
    if (cErr) {
      console.error('❌ Erro ao buscar coins:', cErr.message);
      throw new Error(`Erro coins: ${cErr.message}`);
    }

    const coinMap = new Map((coins || []).map((c: any) => [c.id, c]));

    // Mapear dados para formato CryptoData
    const merged: CryptoData[] = markets
      .map((m: any) => {
        const c = coinMap.get(m.coin_id);
        return {
          id: m.coin_id,
          name: c?.name || m.coin_id,
          symbol: (c?.symbol || '').toLowerCase(),
          current_price: Number(m.current_price) || 0,
          price_change_percentage_24h: Number(m.price_change_percentage_24h) || 0,
          price_change_percentage_1h_in_currency: m.price_change_percentage_1h != null ? Number(m.price_change_percentage_1h) : undefined,
          market_cap_rank: Number(m.market_cap_rank) || 0,
          image: c?.image || '',
          market_cap: Number(m.market_cap) || 0,
          total_volume: Number(m.total_volume) || 0,
          last_updated: m.last_updated,
        } as CryptoData;
      })
      .filter(crypto => crypto.current_price > 0);

    // VALIDAÇÃO E DEDUPLICAÇÃO
    const uniqueMap = new Map<string, CryptoData>();
    
    merged.forEach(crypto => {
      if (
        crypto.current_price > 0 &&
        crypto.market_cap > 0 &&
        crypto.market_cap_rank > 0 &&
        !uniqueMap.has(crypto.id)
      ) {
        uniqueMap.set(crypto.id, crypto);
      } else if (uniqueMap.has(crypto.id)) {
        console.warn(`⚠️ Duplicata ignorada no frontend: ${crypto.id}`);
      }
    });

    const validCryptos = Array.from(uniqueMap.values())
      .sort((a, b) => a.market_cap_rank - b.market_cap_rank);

    console.log(`✅ ${validCryptos.length} moedas válidas e únicas processadas`);

    // Calcular dados globais
    const totalMarketCap = merged.reduce((acc, x) => acc + (x.market_cap || 0), 0);
    const totalVolume = merged.reduce((acc, x) => acc + (x.total_volume || 0), 0);
    const btc = merged.find(x => x.id === 'bitcoin');
    const dominance = btc && totalMarketCap > 0 ? (btc.market_cap / totalMarketCap) * 100 : 0;

    const global: GlobalData = {
      total_market_cap: { usd: totalMarketCap },
      total_volume: { usd: totalVolume },
      active_cryptocurrencies: merged.length,
      market_cap_percentage: { btc: dominance },
    };

    return { cryptos: validCryptos, globalData: global, needsRefresh };
  };

  // Função principal para buscar e atualizar dados
  const fetchCryptos = async (isManualRefresh = false) => {
    if (isFetchingRef.current && !isManualRefresh) {
      console.log('⏭️ Requisição já em andamento, ignorando...');
      return;
    }

    try {
      isFetchingRef.current = true;
      if (!isManualRefresh) setLoading(true);
      setIsUpdating(true);
      setError(null);

      console.log('🚀 Iniciando busca de dados do Supabase...');

      const result = await fetchFromSupabase();
      
      // Auto-refresh if data is stale and not already refreshing
      if (result.needsRefresh && !isRefreshing.current) {
        console.log('🔄 Auto-refreshing stale data...');
        isRefreshing.current = true;
        
        try {
          const { error: invokeError } = await supabase.functions.invoke('refresh-markets', {
            body: { pages: 4, per_page: 250 }
          });
          
          if (invokeError) {
            console.error('❌ Error invoking refresh-markets:', invokeError);
          } else {
            console.log('✅ refresh-markets completed, fetching updated data...');
            // Wait a moment for data to be written
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Refetch after refresh
            const freshResult = await fetchFromSupabase();
            setCryptos(freshResult.cryptos);
            setGlobalData(freshResult.globalData);
            isRefreshing.current = false;
            isFetchingRef.current = false;
            setLoading(false);
            setIsUpdating(false);
            return;
          }
        } catch (refreshError) {
          console.error('❌ Refresh error:', refreshError);
        } finally {
          isRefreshing.current = false;
        }
      }
      
      // Atualizar estado
      setCryptos(result.cryptos);
      setGlobalData(result.globalData);
      
      console.log(`✅ Dados atualizados: ${result.cryptos.length} moedas exibidas`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('💥 Erro ao buscar dados:', errorMessage);
      setError(`Erro ao carregar dados: ${errorMessage}`);
      
      if (cryptos.length === 0) {
        console.log('📦 Nenhum dado disponível, aguardando próxima atualização...');
      }
    } finally {
      setLoading(false);
      setIsUpdating(false);
      isFetchingRef.current = false;
    }
  };

  const refetch = async () => {
    console.log('🔄 Refetch manual solicitado...');
    await fetchCryptos(true);
  };

  useEffect(() => {
    // Buscar dados inicial
    fetchCryptos();

    // Configurar intervalo para buscar dados a cada 6 minutos
    console.log('⏰ Configurando intervalo de 6 minutos...');
    intervalRef.current = setInterval(() => {
      console.log('⏰ Intervalo ativado (6 min) - buscando dados atualizados');
      fetchCryptos();
    }, 6 * 60 * 1000); // 6 minutos
    
    // Limpar no unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Atualizar quando a página fica visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Página ficou visível - buscando dados atualizados');
        fetchCryptos();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    cryptos,
    globalData,
    loading,
    error,
    isUpdating,
    refetch
  };
};
