import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ArrowLeft, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { CryptoPriceChart } from "@/components/CryptoPriceChart";

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

      // 1) Buscar fallback no Supabase primeiro para evitar tela de erro
      let hasFallback = false;
      try {
        const [{ data: coin }, { data: market }] = await Promise.all([
          supabase.from('coins').select('id,name,symbol,image').eq('id', id).maybeSingle(),
          supabase
            .from('latest_markets')
            .select('price,market_cap,market_cap_rank,volume_24h,price_change_percentage_24h,price_change_percentage_7d,circulating_supply,total_supply,max_supply')
            .eq('coin_id', id)
            .maybeSingle(),
        ]);

        if (coin) {
          const fallback: CryptoDetailData = {
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            image: { large: coin.image },
            market_data: {
              current_price: { usd: (market?.price as number) ?? 0 },
              price_change_percentage_24h: (market?.price_change_percentage_24h as number) ?? 0,
              price_change_percentage_7d: (market?.price_change_percentage_7d as number) ?? 0,
              price_change_percentage_30d: 0,
              market_cap: { usd: (market?.market_cap as number) ?? 0 },
              total_volume: { usd: (market?.volume_24h as number) ?? 0 },
              market_cap_rank: (market?.market_cap_rank as number) ?? 0,
              fully_diluted_valuation: null,
              circulating_supply: (market?.circulating_supply as number) ?? null,
              total_supply: (market?.total_supply as number) ?? null,
              max_supply: (market?.max_supply as number) ?? null,
            },
            description: { en: '' },
            links: { homepage: [], blockchain_site: [] },
          };
          if (!cancelled) {
            setCrypto(fallback);
            hasFallback = true;
            setLoading(false); // já renderiza com dados locais
          }
        }
      } catch (e) {
        console.warn('Falha ao carregar fallback do Supabase', e);
      }

      // 2) Tentar buscar detalhes completos no CoinGecko em background
      const fetchCoinGecko = async (retry = 0): Promise<void> => {
        try {
          if (retry > 0) await new Promise(r => setTimeout(r, (retry + 1) * 1500));
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
          );

          if (response.status === 429) {
            if (retry < 3) return fetchCoinGecko(retry + 1);
            throw new Error('API temporariamente indisponível. Tente novamente mais tarde.');
          }
          if (!response.ok) {
            if (response.status === 404) throw new Error('Criptomoeda não encontrada.');
            throw new Error(`Erro ${response.status}: Falha ao buscar dados da criptomoeda`);
          }
          const data = await response.json();
          if (!cancelled) setCrypto(data);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          console.warn('Mantendo fallback (CoinGecko falhou):', msg);
          if (!hasFallback && !cancelled) {
            setError(msg);
          }
          if (!cancelled && hasFallback) {
            toast({ title: 'Usando dados do Supabase', description: 'Não foi possível completar os detalhes agora.', variant: 'default' });
          }
        }
      };

      await fetchCoinGecko();
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

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_360px] gap-6">
          {/* Esquerda: Atualizações da internet (alocado) */}
          <aside className="space-y-6 xl:order-3">
            <Card className="p-6 bg-gradient-card border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Atualizações</h2>
              {/* Espaço reservado para agregador social; componente já existe */}
              <CryptoSocialFeed coinId={crypto.id} />
            </Card>
          </aside>

          {/* Centro: Gráfico e Mercados */}
          <section className="space-y-6 xl:order-2">
            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Gráfico de Preços</h2>
              </div>
              <CryptoPriceChart cryptoId={crypto.id} />
            </Card>

            <Card className="p-6 bg-gradient-card border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Mercados</h2>
              <CryptoMarketsTable coinId={crypto.id} />
            </Card>
          </section>

          {/* Direita: Métricas, Links e Sobre */}
          <aside className="space-y-6 xl:order-1">
            {/* Preço + Variações */}
            <Card className="p-6 bg-gradient-card border-border">
              <div className="text-sm text-muted-foreground mb-2">Preço Atual</div>
              <div className="text-3xl font-bold text-foreground mb-4">
                {formatPrice(crypto.market_data.current_price.usd)}
              </div>
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
        </div>
      </main>
    </div>
  );
};

export default CryptoDetail;