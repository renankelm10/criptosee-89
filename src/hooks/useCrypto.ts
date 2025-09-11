// src/hooks/useCrypto.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchMainCryptoData, CryptoData, GlobalData } from "@/integrations/supabase/api";

// Define uma estrutura clara para o estado
interface CryptoState {
  data: {
    cryptos: CryptoData[];
    globalData: GlobalData | null;
  } | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
}

export const useCrypto = () => {
  const [state, setState] = useState<CryptoState>({
    data: null,
    loading: true,
    updating: false,
    error: null,
  });

  const isFetchingRef = useRef(false);

  // Usamos useCallback para garantir que a função não seja recriada a cada renderização
  const fetchCryptos = useCallback(async (isUpdate = false) => {
    if (isFetchingRef.current) {
      console.log('⏭️ Requisição já em andamento, ignorando...');
      return;
    }

    isFetchingRef.current = true;
    setState(prev => ({
      ...prev,
      loading: !isUpdate && !prev.data, // Mostra loading principal só na primeira vez
      updating: isUpdate, // Mostra um indicador de atualização para as demais
      error: null,
    }));

    const { cryptos, globalData, error } = await fetchMainCryptoData();

    if (error) {
      // Se der erro, mantém os dados antigos (se existirem) para não quebrar a tela
      setState(prev => ({
        ...prev,
        loading: false,
        updating: false,
        error: error,
      }));
    } else {
      setState({
        data: { cryptos, globalData },
        loading: false,
        updating: false,
        error: null,
      });
    }

    isFetchingRef.current = false;
  }, []);

  // Efeito para a busca inicial e para o intervalo
  useEffect(() => {
    fetchCryptos(false); // Busca inicial

    const intervalId = setInterval(() => {
      console.log('⏰ Intervalo de 30s: Buscando atualizações...');
      fetchCryptos(true);
    }, 30000); // 30 segundos

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, [fetchCryptos]);

  // Efeito para buscar dados quando a aba do navegador fica visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Página visível: Buscando atualizações...');
        fetchCryptos(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchCryptos]);

  return {
    cryptos: state.data?.cryptos || [],
    globalData: state.data?.globalData || null,
    loading: state.loading,
    isUpdating: state.updating,
    error: state.error,
    refetch: () => fetchCryptos(true),
  };
};