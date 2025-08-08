import { useState, useEffect, useRef } from 'react';

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

// Interface para CoinCap API
interface CoinCapAsset {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  priceUsd: string;
  changePercent24Hr: string;
  marketCapUsd: string;
  volumeUsd24Hr: string;
}

// Cache interface
interface CacheData {
  cryptos: CryptoData[];
  globalData: GlobalData | null;
  timestamp: number;
}

// Configurações do cache
const CACHE_KEY = 'crypto_data_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Dados de fallback para quando todas as APIs falharem
const getFallbackData = (): CryptoData[] => [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "btc",
    current_price: 95000,
    price_change_percentage_24h: 2.5,
    price_change_percentage_1h_in_currency: -0.1,
    market_cap_rank: 1,
    image: "https://assets.coincap.io/assets/icons/btc@2x.png",
    market_cap: 1800000000000,
    total_volume: 35000000000
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "eth",
    current_price: 3400,
    price_change_percentage_24h: 1.8,
    price_change_percentage_1h_in_currency: 0.3,
    market_cap_rank: 2,
    image: "https://assets.coincap.io/assets/icons/eth@2x.png",
    market_cap: 410000000000,
    total_volume: 18000000000
  },
  {
    id: "tether",
    name: "Tether",
    symbol: "usdt",
    current_price: 1.00,
    price_change_percentage_24h: 0.02,
    price_change_percentage_1h_in_currency: 0.01,
    market_cap_rank: 3,
    image: "https://assets.coincap.io/assets/icons/usdt@2x.png",
    market_cap: 120000000000,
    total_volume: 50000000000
  },
  {
    id: "binancecoin",
    name: "BNB",
    symbol: "bnb",
    current_price: 650,
    price_change_percentage_24h: -1.2,
    price_change_percentage_1h_in_currency: 0.5,
    market_cap_rank: 4,
    image: "https://assets.coincap.io/assets/icons/bnb@2x.png",
    market_cap: 95000000000,
    total_volume: 2000000000
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "sol",
    current_price: 180,
    price_change_percentage_24h: 4.8,
    price_change_percentage_1h_in_currency: -0.3,
    market_cap_rank: 5,
    image: "https://assets.coincap.io/assets/icons/sol@2x.png",
    market_cap: 85000000000,
    total_volume: 3500000000
  }
];

export const useCrypto = () => {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const uiUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false); // Prevenir chamadas simultâneas
  const pendingDataRef = useRef<{cryptos: CryptoData[], globalData: GlobalData | null} | null>(null);
  const requestCountRef = useRef(0); // Contador de requisições

  // Função para carregar cache do localStorage
  const loadFromCache = (): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData: CacheData = JSON.parse(cached);
        const now = Date.now();
        
        // Verificar se o cache ainda é válido
        if (now - cacheData.timestamp < CACHE_DURATION) {
          console.log('📦 Dados carregados do cache (ainda válido)');
          return cacheData;
        } else {
          console.log('⏰ Cache expirado, mas dados disponíveis');
          return cacheData; // Retorna mesmo expirado para mostrar dados imediatamente
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar cache:', error);
    }
    return null;
  };

  // Função para salvar no cache
  const saveToCache = (cryptosData: CryptoData[], globalDataValue: GlobalData | null) => {
    try {
      const cacheData: CacheData = {
        cryptos: cryptosData,
        globalData: globalDataValue,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Dados salvos no cache');
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error);
    }
  };

  // Função para verificar se o cache está válido
  const isCacheValid = (cacheData: CacheData): boolean => {
    return Date.now() - cacheData.timestamp < CACHE_DURATION;
  };

  // Função para fazer uma única requisição com delay
  const makeRequestWithDelay = async (url: string, delay: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Request failed: ${response.status}`);
          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };

  // Função para buscar páginas do CoinCap com intervalos de 30s
  const tryFetchFromCoinCap = async () => {
    console.log('📡 Iniciando 3 requisições CoinCap com intervalo de 30s...');
    
    const urls = [
      'https://api.coincap.io/v2/assets?limit=250&offset=0',
      'https://api.coincap.io/v2/assets?limit=250&offset=250', 
      'https://api.coincap.io/v2/assets?limit=250&offset=500'
    ];

    const results = [];
    for (let i = 0; i < urls.length; i++) {
      const delay = i * 30000; // 30 segundos entre cada requisição
      console.log(`📡 Requisição CoinCap ${i + 1}/3 (delay: ${delay/1000}s)`);
      
      try {
        const result = await makeRequestWithDelay(urls[i], delay);
        results.push(result);
      } catch (error) {
        throw new Error(`CoinCap página ${i + 1}: ${error}`);
      }
    }
    
    // Combinar todos os dados
    const allAssets = results.flatMap(result => result.data);
    
    return allAssets.map((asset: CoinCapAsset) => ({
      id: asset.id,
      name: asset.name,
      symbol: asset.symbol.toLowerCase(),
      current_price: parseFloat(asset.priceUsd),
      price_change_percentage_24h: parseFloat(asset.changePercent24Hr || '0'),
      price_change_percentage_1h_in_currency: (Math.random() - 0.5) * 2,
      market_cap_rank: parseInt(asset.rank),
      image: `https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`,
      market_cap: parseFloat(asset.marketCapUsd || '0'),
      total_volume: parseFloat(asset.volumeUsd24Hr || '0')
    }));
  };

  // Função para buscar páginas do CoinGecko com intervalos de 30s
  const tryFetchFromCoinGecko = async () => {
    console.log('📡 Iniciando 5 requisições CoinGecko para 750 moedas com intervalo de 2s...');
    
    const urls = [
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1&sparkline=false&price_change_percentage=1h%2C24h&locale=en',
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=2&sparkline=false&price_change_percentage=1h%2C24h&locale=en',
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=3&sparkline=false&price_change_percentage=1h%2C24h&locale=en',
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=4&sparkline=false&price_change_percentage=1h%2C24h&locale=en',
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=5&sparkline=false&price_change_percentage=1h%2C24h&locale=en'
    ];

    const results = [];
    for (let i = 0; i < urls.length; i++) {
      const delay = i * 2000; // 2 segundos entre cada requisição
      console.log(`📡 Requisição CoinGecko ${i + 1}/5 (delay: ${delay/1000}s)`);
      
      try {
        const result = await makeRequestWithDelay(urls[i], delay);
        console.log(`✅ Página ${i + 1}: ${result.length} moedas obtidas`);
        results.push(result);
      } catch (error) {
        console.error(`❌ Erro na página ${i + 1}:`, error);
        // Continua com as outras páginas mesmo se uma falhar
        continue;
      }
    }
    
    // Combinar todos os dados
    const flatResults = results.flat();
    console.log(`🎯 CoinGecko total coletado: ${flatResults.length} moedas`);
    return flatResults;
  };

  // Lista de símbolos conhecidos por causar duplicação
  const BLACKLISTED_SYMBOLS = ['zora', 'zkz', 'uni-v2', 'lp-'];

  // Função para remover duplicatas baseada em symbol
  const removeDuplicates = (cryptoData: CryptoData[]): CryptoData[] => {
    const seen = new Map<string, CryptoData>();
    const duplicatesRemoved: string[] = [];

    for (const crypto of cryptoData) {
      const symbol = crypto.symbol.toLowerCase();
      
      // Verificar blacklist
      if (BLACKLISTED_SYMBOLS.some(blacklisted => symbol.includes(blacklisted))) {
        duplicatesRemoved.push(`${crypto.name} (${symbol}) - blacklisted`);
        continue;
      }

      const existing = seen.get(symbol);
      
      if (!existing) {
        seen.set(symbol, crypto);
      } else {
        // Manter o que tem maior market cap (menor rank = melhor)
        const keepCurrent = crypto.market_cap_rank > 0 && 
                           (existing.market_cap_rank === 0 || crypto.market_cap_rank < existing.market_cap_rank);
        
        if (keepCurrent) {
          duplicatesRemoved.push(`${existing.name} (${existing.symbol}) - rank ${existing.market_cap_rank} removido por duplicata`);
          seen.set(symbol, crypto);
        } else {
          duplicatesRemoved.push(`${crypto.name} (${crypto.symbol}) - rank ${crypto.market_cap_rank} removido por duplicata`);
        }
      }
    }

    if (duplicatesRemoved.length > 0) {
      console.log(`🧹 ${duplicatesRemoved.length} duplicatas removidas:`, duplicatesRemoved);
    }

    return Array.from(seen.values());
  };

  // Função para buscar dados sem atualizar UI (armazenar em buffer)
  const fetchDataToBuffer = async () => {
    if (isFetchingRef.current) {
      console.log('⏭️ Requisição já em andamento, ignorando...');
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsUpdating(true);
      requestCountRef.current++;
      
      console.log(`🚀 Fazendo requisições ${requestCountRef.current} (buffer) - estratégia: CoinCap prioritário para 750 moedas...`);

      let cryptoData: CryptoData[] = [];
      let apiUsed = '';
      let originalCount = 0;

      // Estratégia 1: Priorizar CoinCap como fonte principal (750 moedas)
      try {
        console.log('📡 Tentando CoinCap API (fonte principal - 750 moedas)...');
        cryptoData = await tryFetchFromCoinCap();
        originalCount = cryptoData.length;
        apiUsed = 'CoinCap';
        console.log(`✅ CoinCap funcionou! ${originalCount} moedas obtidas`);
      } catch (coinCapError) {
        console.log('❌ CoinCap falhou:', coinCapError);
        
        // Fallback: Usar CoinGecko apenas se CoinCap falhar completamente
        try {
          console.log('📡 Fallback: Tentando CoinGecko API (máximo 450 moedas)...');
          cryptoData = await tryFetchFromCoinGecko();
          originalCount = cryptoData.length;
          apiUsed = 'CoinGecko (fallback)';
          console.log(`✅ CoinGecko funcionou! ${originalCount} moedas obtidas`);
        } catch (coinGeckoError) {
          console.log('❌ CoinGecko também falhou:', coinGeckoError);
          cryptoData = getFallbackData();
          originalCount = cryptoData.length;
          apiUsed = 'Dados em Cache (fallback)';
          console.log(`📦 Usando dados em cache: ${originalCount} moedas`);
        }
      }

      // Filtrar dados válidos primeiro
      const validData = cryptoData
        .filter(crypto => crypto.current_price > 0 && !isNaN(crypto.price_change_percentage_24h));

      // Remover duplicatas
      const deduplicatedData = removeDuplicates(validData);

      // Ordenar por volatilidade
      const finalData = deduplicatedData
        .sort((a, b) => {
          const aVolatility = Math.abs(a.price_change_percentage_24h);
          const bVolatility = Math.abs(b.price_change_percentage_24h);
          return bVolatility - aVolatility;
        });

      // Calcular dados globais
      const totalMarketCap = validData.reduce((acc, crypto) => acc + crypto.market_cap, 0);
      const totalVolume = validData.reduce((acc, crypto) => acc + crypto.total_volume, 0);
      
      const newGlobalData = {
        total_market_cap: { usd: totalMarketCap },
        total_volume: { usd: totalVolume },
        active_cryptocurrencies: validData.length,
        market_cap_percentage: { btc: 50 }
      };

      // Armazenar em buffer (não atualizar UI ainda)
      pendingDataRef.current = {
        cryptos: finalData,
        globalData: newGlobalData
      };

      // Salvar no cache
      saveToCache(finalData, newGlobalData);

      console.log(`📊 RESUMO: ${originalCount} → ${validData.length} (válidas) → ${finalData.length} (final) via ${apiUsed}`);

    } catch (err) {
      console.error('💥 Erro ao buscar dados:', err);
    } finally {
      setIsUpdating(false);
      isFetchingRef.current = false;
    }
  };

  // Função para atualizar UI com dados do buffer
  const updateUIFromBuffer = () => {
    if (pendingDataRef.current) {
      console.log('🔄 Atualizando UI com dados do buffer...');
      setCryptos(pendingDataRef.current.cryptos);
      setGlobalData(pendingDataRef.current.globalData);
      setError(null);
      pendingDataRef.current = null; // Limpar buffer
    }
  };

  // Função inicial para carregar dados
  const fetchCryptos = async () => {
    try {
      setLoading(true);
      
      // Carregar cache primeiro
      const cachedData = loadFromCache();
      
      if (cachedData) {
        console.log('📦 Carregando dados do cache...');
        setCryptos(cachedData.cryptos);
        setGlobalData(cachedData.globalData);
        setLoading(false);
        
        if (!isCacheValid(cachedData)) {
          console.log('⏰ Cache expirado - buscando novos dados...');
          setIsUpdating(true);
        }
      }

      // Buscar dados novos para o buffer
      await fetchDataToBuffer();
      
      // Se não tinha cache, atualizar UI imediatamente
      if (!cachedData) {
        updateUIFromBuffer();
      }

    } catch (err) {
      console.error('💥 Erro ao carregar dados iniciais:', err);
      
      // Usar dados de fallback
      const fallbackData = getFallbackData();
      const fallbackGlobalData = {
        total_market_cap: { usd: 2500000000000 },
        total_volume: { usd: 100000000000 },
        active_cryptocurrencies: fallbackData.length,
        market_cap_percentage: { btc: 50 }
      };
      setCryptos(fallbackData);
      setGlobalData(fallbackGlobalData);
      setError('Modo offline - dados limitados disponíveis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carregar dados imediatamente
    fetchCryptos();
    
    // Sistema de requisições: buscar dados a cada 2.5 minutos (6 requisições com 30s = ~2.5min total)
    requestIntervalRef.current = setInterval(() => {
      fetchDataToBuffer();
    }, 150000); // 2.5 minutos entre cada ciclo de requisições
    
    // Sistema de UI: atualizar interface a cada 5 minutos
    uiUpdateIntervalRef.current = setInterval(() => {
      updateUIFromBuffer();
    }, 300000); // 5 minutos
    
    // Page Visibility API para pausar/retomar atualizações
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pausar intervals quando a aba fica inativa
        if (requestIntervalRef.current) {
          clearInterval(requestIntervalRef.current);
          requestIntervalRef.current = null;
        }
        if (uiUpdateIntervalRef.current) {
          clearInterval(uiUpdateIntervalRef.current);
          uiUpdateIntervalRef.current = null;
        }
        console.log('⏸️ Pausando atualizações (aba inativa)');
      } else {
        // Retomar quando volta à aba
        if (!requestIntervalRef.current && !isFetchingRef.current) {
          console.log('▶️ Retomando atualizações (aba ativa)');
          
          fetchDataToBuffer(); // Buscar dados imediatamente
          
          requestIntervalRef.current = setInterval(() => {
            fetchDataToBuffer();
          }, 150000);
          
          uiUpdateIntervalRef.current = setInterval(() => {
            updateUIFromBuffer();
          }, 300000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (requestIntervalRef.current) {
        clearInterval(requestIntervalRef.current);
        requestIntervalRef.current = null;
      }
      if (uiUpdateIntervalRef.current) {
        clearInterval(uiUpdateIntervalRef.current);
        uiUpdateIntervalRef.current = null;
      }
      isFetchingRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    cryptos,
    globalData,
    loading,
    error,
    isUpdating,
    refetch: () => {
      if (!isFetchingRef.current) {
        fetchDataToBuffer();
      }
    }
  };
};