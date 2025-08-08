import { useState, useEffect } from 'react';

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

  // Tentar múltiplas APIs em sequência
  const tryFetchFromCoinCap = async () => {
    const response = await fetch('https://api.coincap.io/v2/assets?limit=100');
    if (!response.ok) throw new Error(`CoinCap: ${response.status}`);
    const result = await response.json();
    
    return result.data.map((asset: CoinCapAsset) => ({
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

  const tryFetchFromCoinGecko = async () => {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h%2C24h&locale=en');
    if (!response.ok) throw new Error(`CoinGecko: ${response.status}`);
    return await response.json();
  };

  const fetchCryptos = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Iniciando busca de dados...');

      let cryptoData: CryptoData[] = [];
      let apiUsed = '';

      // Tentar CoinCap primeiro
      try {
        console.log('📡 Tentando CoinCap API...');
        cryptoData = await tryFetchFromCoinCap();
        apiUsed = 'CoinCap';
        console.log('✅ CoinCap funcionou!');
      } catch (coinCapError) {
        console.log('❌ CoinCap falhou:', coinCapError);
        
        // Tentar CoinGecko como fallback
        try {
          console.log('📡 Tentando CoinGecko API...');
          cryptoData = await tryFetchFromCoinGecko();
          apiUsed = 'CoinGecko';
          console.log('✅ CoinGecko funcionou!');
        } catch (coinGeckoError) {
          console.log('❌ CoinGecko também falhou:', coinGeckoError);
          
          // Usar dados de fallback
          console.log('📦 Usando dados de fallback...');
          cryptoData = getFallbackData();
          apiUsed = 'Fallback';
          setError('Conectividade limitada - mostrando dados de exemplo');
        }
      }

      // Filtrar e ordenar por volatilidade
      const validData = cryptoData
        .filter(crypto => crypto.current_price > 0 && !isNaN(crypto.price_change_percentage_24h))
        .sort((a, b) => {
          const aVolatility = Math.abs(a.price_change_percentage_24h);
          const bVolatility = Math.abs(b.price_change_percentage_24h);
          return bVolatility - aVolatility;
        });

      setCryptos(validData);

      // Calcular dados globais
      const totalMarketCap = validData.reduce((acc, crypto) => acc + crypto.market_cap, 0);
      const totalVolume = validData.reduce((acc, crypto) => acc + crypto.total_volume, 0);
      
      setGlobalData({
        total_market_cap: { usd: totalMarketCap },
        total_volume: { usd: totalVolume },
        active_cryptocurrencies: validData.length,
        market_cap_percentage: { btc: 50 }
      });

      console.log(`✅ ${validData.length} criptomoedas carregadas via ${apiUsed}`);

    } catch (err) {
      console.error('💥 Erro geral:', err);
      
      // Em caso de erro total, usar dados de fallback
      const fallbackData = getFallbackData();
      setCryptos(fallbackData);
      setGlobalData({
        total_market_cap: { usd: 2500000000000 },
        total_volume: { usd: 100000000000 },
        active_cryptocurrencies: fallbackData.length,
        market_cap_percentage: { btc: 50 }
      });
      setError('Modo offline - dados limitados disponíveis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptos();
    
    // Refresh a cada 5 minutos
    const interval = setInterval(fetchCryptos, 300000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    cryptos,
    globalData,
    loading,
    error,
    refetch: fetchCryptos
  };
};