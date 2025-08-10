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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Função simplificada para buscar dados diretamente do Supabase
  const fetchFromSupabase = async (): Promise<{ cryptos: CryptoData[]; globalData: GlobalData | null }> => {
    console.log('📡 Buscando dados do Supabase...');
    
    // Buscar dados do mercado ordenados por rank
    const { data: markets, error: mErr } = await supabase
      .from('latest_markets')
      .select('*')
      .order('market_cap_rank', { ascending: true })
      .limit(500);
    
    if (mErr) {
      console.error('❌ Erro ao buscar latest_markets:', mErr.message);
      throw new Error(`Erro Supabase: ${mErr.message}`);
    }
    
    if (!markets || markets.length === 0) {
      console.warn('⚠️ Nenhum dado encontrado em latest_markets');
      throw new Error('Nenhum dado disponível no Supabase');
    }

    console.log(`📊 Encontrados ${markets.length} registros no latest_markets`);

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
          current_price: Number(m.price) || 0,
          price_change_percentage_24h: Number(m.price_change_percentage_24h) || 0,
          price_change_percentage_1h_in_currency: Number(m.price_change_percentage_1h) || 0,
          market_cap_rank: Number(m.market_cap_rank) || 0,
          image: c?.image || '',
          market_cap: Number(m.market_cap) || 0,
          total_volume: Number(m.volume_24h) || 0,
        } as CryptoData;
      })
      .filter(crypto => crypto.current_price > 0) // Filtrar apenas moedas com preço válido
      .sort((a, b) => a.market_cap_rank - b.market_cap_rank); // Ordenar por rank

    console.log(`✅ ${merged.length} moedas processadas com sucesso`);

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

    return { cryptos: merged, globalData: global };
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
      
      // Atualizar estado imediatamente
      setCryptos(result.cryptos);
      setGlobalData(result.globalData);
      
      console.log(`✅ Dados atualizados: ${result.cryptos.length} moedas exibidas`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('💥 Erro ao buscar dados:', errorMessage);
      setError(`Erro ao carregar dados: ${errorMessage}`);
      
      // Em caso de erro, manter dados existentes se houver
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

    // Configurar intervalo para buscar dados a cada 30 segundos
    console.log('⏰ Configurando intervalo de 30 segundos...');
    intervalRef.current = setInterval(() => {
      console.log('⏰ Intervalo ativado - buscando dados atualizados');
      fetchCryptos();
    }, 30 * 1000); // 30 segundos
    
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