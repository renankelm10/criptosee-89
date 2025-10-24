import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { CryptoPriceChart } from "@/components/CryptoPriceChart";
import { getTradingViewSymbol } from "@/utils/tradingViewSymbols";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CryptoMarketsTable } from "@/components/CryptoMarketsTable";
import { CryptoSocialFeed } from "@/components/CryptoSocialFeed";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

interface CryptoDetailData {
  id: string;
  name: string;
  symbol: string;
  image: { large: string };
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_rank: number;
    fully_diluted_valuation?: { usd: number } | null;
    circulating_supply?: number | null;
    total_supply?: number | null;
    max_supply?: number | null;
    last_updated?: string;
  };
  description: { en: string };
  links: {
    homepage: string[];
    blockchain_site: string[];
  };
}

const CryptoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [crypto, setCrypto] = useState<CryptoDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setError('ID da criptomoeda não fornecido');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [{ data: coin }, { data: market }] = await Promise.all([
          supabase.from('coins').select('id,name,symbol,image').eq('id', id).maybeSingle(),
          supabase
            .from('latest_markets')
            .select('current_price,market_cap,market_cap_rank,total_volume,price_change_percentage_24h,price_change_percentage_7d,price_change_percentage_30d,circulating_supply,total_supply,max_supply,last_updated')
            .eq('coin_id', id)
            .maybeSingle(),
        ]);

        if (!coin || !market) {
          throw new Error('Moeda não encontrada no banco de dados');
        }

        const cryptoData: CryptoDetailData = {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: { large: coin.image },
          market_data: {
            current_price: { usd: market.current_price ?? 0 },
            price_change_percentage_24h: market.price_change_percentage_24h ?? 0,
            price_change_percentage_7d: market.price_change_percentage_7d ?? 0,
            price_change_percentage_30d: market.price_change_percentage_30d ?? 0,
            market_cap: { usd: market.market_cap ?? 0 },
            total_volume: { usd: market.total_volume ?? 0 },
            market_cap_rank: market.market_cap_rank ?? 0,
            fully_diluted_valuation: null,
            circulating_supply: market.circulating_supply ?? null,
            total_supply: market.total_supply ?? null,
            max_supply: market.max_supply ?? null,
            last_updated: market.last_updated,
          },
          description: { en: '' },
          links: { homepage: [], blockchain_site: [] },
        };

        if (!cancelled) {
          setCrypto(cryptoData);
          setLoading(false);

          // Check if data is stale (older than 10 minutes)
          if (market.last_updated) {
            const lastUpdate = new Date(market.last_updated).getTime();
            const now = Date.now();
            const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);

            if (minutesSinceUpdate > 10) {
              console.log(`🔄 Data stale for ${id} (${minutesSinceUpdate.toFixed(1)} min old), refreshing...`);
              setRefreshing(true);

              try {
                const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-coin', {
                  body: { id },
                });

                if (refreshError) {
                  console.error('Error refreshing coin:', refreshError);
                } else {
                  console.log('✅ Coin refreshed:', refreshData);
                  
                  // Refetch data after refresh
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  const [{ data: newCoin }, { data: newMarket }] = await Promise.all([
                    supabase.from('coins').select('id,name,symbol,image').eq('id', id).maybeSingle(),
                    supabase
                      .from('latest_markets')
                      .select('current_price,market_cap,market_cap_rank,total_volume,price_change_percentage_24h,price_change_percentage_7d,price_change_percentage_30d,circulating_supply,total_supply,max_supply,last_updated')
                      .eq('coin_id', id)
                      .maybeSingle(),
                  ]);

                  if (newCoin && newMarket && !cancelled) {
                    const updatedCryptoData: CryptoDetailData = {
                      id: newCoin.id,
                      name: newCoin.name,
                      symbol: newCoin.symbol,
                      image: { large: newCoin.image },
                      market_data: {
                        current_price: { usd: newMarket.current_price ?? 0 },
                        price_change_percentage_24h: newMarket.price_change_percentage_24h ?? 0,
                        price_change_percentage_7d: newMarket.price_change_percentage_7d ?? 0,
                        price_change_percentage_30d: newMarket.price_change_percentage_30d ?? 0,
                        market_cap: { usd: newMarket.market_cap ?? 0 },
                        total_volume: { usd: newMarket.total_volume ?? 0 },
                        market_cap_rank: newMarket.market_cap_rank ?? 0,
                        fully_diluted_valuation: null,
                        circulating_supply: newMarket.circulating_supply ?? null,
                        total_supply: newMarket.total_supply ?? null,
                        max_supply: newMarket.max_supply ?? null,
                        last_updated: newMarket.last_updated,
                      },
                      description: { en: '' },
                      links: { homepage: [], blockchain_site: [] },
                    };
                    setCrypto(updatedCryptoData);
                    toast({
                      title: "Dados atualizados",
                      description: `${newCoin.name} foi atualizado com sucesso.`,
                    });
                  }
                }
              } catch (refreshErr) {
                console.error('Error during refresh:', refreshErr);
              } finally {
                if (!cancelled) setRefreshing(false);
              }
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
        if (!cancelled) {
          setError(msg);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const formatPrice = (price: number) => {
    if (price < 1) {
      return `$${price.toFixed(6)}`;
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    }
    if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  if (loading && !crypto) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!crypto) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="p-8 text-center max-w-md">
              <div className="text-destructive text-lg font-semibold mb-4">Erro ao carregar dados</div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isPositive24h = (crypto.market_data.price_change_percentage_24h ?? 0) > 0;
  const isPositive7d = (crypto.market_data.price_change_percentage_7d ?? 0) > 0;
  const isPositive30d = (crypto.market_data.price_change_percentage_30d ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${crypto.name} (${crypto.symbol.toUpperCase()}) preço, market cap e gráfico | CryptoVolatil`}
        description={`Veja preço atual, variações (24h/7d/30d) e market cap de ${crypto.name}. Gráficos e estatísticas atualizadas.`}
      />
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-4">
              <img 
                src={crypto.image.large} 
                alt={`${crypto.name} logo`}
                loading="lazy"
                className="w-12 h-12 rounded-full ring-2 ring-primary/20"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{crypto.name}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground uppercase font-mono">
                    {crypto.symbol}
                  </span>
                  <Badge variant="outline">
                    Rank #{crypto.market_data.market_cap_rank}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-6">
          {/* Sidebar Esquerda: Métricas */}
          <aside className="space-y-6 order-2 lg:order-1 xl:order-1">
            {/* Preço + Variações */}
            <Card className="p-6 bg-gradient-card border-border">
              <div className="text-sm text-muted-foreground mb-2">Preço Atual</div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {formatPrice(crypto.market_data.current_price.usd)}
              </div>
              {crypto.market_data.last_updated && (
                <div className="text-xs text-muted-foreground mb-4">
                  {refreshing ? (
                    <span className="text-primary">🔄 Atualizando dados...</span>
                  ) : (
                    <>Atualizado: {new Date(crypto.market_data.last_updated).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">24h</span>
                  <div className={`flex items-center gap-1 ${isPositive24h ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                    {isPositive24h ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-medium">
                      {isPositive24h ? '+' : ''}{crypto.market_data.price_change_percentage_24h?.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">7d</span>
                  <div className={`flex items-center gap-1 ${isPositive7d ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                    {isPositive7d ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-medium">
                      {isPositive7d ? '+' : ''}{crypto.market_data.price_change_percentage_7d?.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">30d</span>
                  <div className={`flex items-center gap-1 ${isPositive30d ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                    {isPositive30d ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-medium">
                      {isPositive30d ? '+' : ''}{crypto.market_data.price_change_percentage_30d?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Market Cap / Volume / FDV */}
            <Card className="p-6 bg-gradient-card border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Market Cap</div>
                  <div className="text-xl font-semibold text-foreground">
                    {formatLargeNumber(crypto.market_data.market_cap.usd)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Rank</div>
                  <div className="text-xl font-semibold text-foreground">#{crypto.market_data.market_cap_rank}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Volume (24h)</div>
                  <div className="text-lg font-medium text-foreground">
                    {formatLargeNumber(crypto.market_data.total_volume.usd)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">FDV</div>
                  <div className="text-lg font-medium text-foreground">
                    {crypto.market_data.fully_diluted_valuation?.usd ? formatLargeNumber(crypto.market_data.fully_diluted_valuation.usd) : '-'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Supply */}
            <Card className="p-6 bg-gradient-card border-border">
              <div className="text-sm text-muted-foreground mb-3">Supply</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Circulating</span>
                  <span className="font-medium text-foreground">
                    {crypto.market_data.circulating_supply?.toLocaleString() ?? '-'} {crypto.symbol.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium text-foreground">
                    {crypto.market_data.total_supply?.toLocaleString() ?? '-'} {crypto.symbol.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max</span>
                  <span className="font-medium text-foreground">
                    {crypto.market_data.max_supply?.toLocaleString() ?? '-'} {crypto.symbol.toUpperCase()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Links + Sobre */}
            <Card className="p-6 bg-gradient-card border-border">
              <div className="text-sm text-muted-foreground mb-2">Links Oficiais</div>
              <div className="space-y-2 mb-4">
                {crypto.links.homepage[0] && (
                  <a
                    href={crypto.links.homepage[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:text-primary/80 transition-colors story-link"
                  >
                    🌐 Website Oficial
                  </a>
                )}
                {crypto.links.blockchain_site[0] && (
                  <a
                    href={crypto.links.blockchain_site[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:text-primary/80 transition-colors story-link"
                  >
                    ⛓️ Blockchain Explorer
                  </a>
                )}
              </div>

              {crypto.description.en && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-3">Sobre {crypto.name}</h2>
                  <div
                    className="text-muted-foreground prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: crypto.description.en.substring(0, 700) + (crypto.description.en.length > 700 ? '...' : '')
                    }}
                  />
                </div>
              )}
            </Card>
          </aside>

          {/* Centro: Gráfico e Mercados */}
          <section className="space-y-6 order-1 lg:order-1 xl:order-2 min-w-0">
            <div className="bg-gradient-card border border-border rounded-lg overflow-hidden min-w-0">
              <Tabs defaultValue="trading" className="w-full">
                <div className="px-4 pt-4">
                  <TabsList className="grid w-full max-w-sm grid-cols-2">
                    <TabsTrigger value="trading">
                      📊 Trading
                    </TabsTrigger>
                    <TabsTrigger value="historico">
                      📈 Histórico
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="trading" className="mt-0 p-0">
                  <div className="w-full min-h-[420px] h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-[75vh]">
                    <TradingViewWidget 
                      symbol={getTradingViewSymbol(crypto.id, crypto.symbol)} 
                      cryptoId={crypto.id}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="historico" className="mt-0 p-4">
                  <CryptoPriceChart cryptoId={crypto.id} />
                </TabsContent>
              </Tabs>
            </div>

            <Card className="p-4 bg-gradient-card border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Mercados</h2>
              <CryptoMarketsTable coinId={crypto.id} />
            </Card>
          </section>

          {/* Direita: Feed Social */}
          <aside className="space-y-6 order-3 lg:order-2 xl:order-3">
            <Card className="p-6 bg-gradient-card border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Atualizações</h2>
              <CryptoSocialFeed coinId={crypto.id} />
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default CryptoDetail;