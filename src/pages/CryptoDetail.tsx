import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, Calculator, BarChart3 } from "lucide-react";
import { CryptoPriceChart } from "@/components/CryptoPriceChart";
import { InvestmentCalculator } from "@/components/InvestmentCalculator";
import { CryptoMarketsTable } from "@/components/CryptoMarketsTable";
import { CryptoSocialFeed } from "@/components/CryptoSocialFeed";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

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
    const fetchCryptoDetail = async (retryCount = 0) => {
      console.log('🔍 CryptoDetail: iniciando fetch para ID:', id);
      if (!id) {
        console.error('❌ CryptoDetail: ID não fornecido');
        setError('ID da criptomoeda não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Delay progressivo para retry
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, retryCount * 1500));
        }

        console.log(`Buscando dados de ${id}...`);

        const response = await Promise.race([
          fetch(
            `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
          ),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 15000)
          )
        ]);

        if (response.status === 429) {
          // Rate limited - retry after delay
          if (retryCount < 3) {
            console.log(`Rate limit na API de detalhes, tentando novamente em ${(retryCount + 1) * 2} segundos...`);
            return fetchCryptoDetail(retryCount + 1);
          }
          throw new Error('API temporariamente indisponível. Tente novamente em alguns minutos.');
        }

        if (!response.ok) {
          // Se for 404, pode ser que o ID não existe
          if (response.status === 404) {
            throw new Error('Criptomoeda não encontrada. Verifique se o ID está correto.');
          }
          throw new Error(`Erro ${response.status}: Falha ao buscar dados da criptomoeda`);
        }

        const data = await response.json();
        
        // Validar se os dados são válidos
        if (!data || !data.market_data || !data.market_data.current_price) {
          throw new Error('Dados inválidos recebidos da API');
        }

        console.log(`Dados carregados para ${data.name}`);
        setCrypto(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`Erro ao carregar ${id}:`, errorMessage);
        
        // Retry automático para erros de conexão
        if ((errorMessage.includes('Failed to fetch') || errorMessage.includes('Timeout')) && retryCount < 2) {
          console.log(`Tentando novamente... (${retryCount + 1}/3)`);
          return fetchCryptoDetail(retryCount + 1);
        }
        
        setError(errorMessage);
        toast({
          title: "Erro ao carregar dados",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCryptoDetail();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !crypto) {
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

  const isPositive24h = crypto.market_data.price_change_percentage_24h > 0;
  const isPositive7d = crypto.market_data.price_change_percentage_7d > 0;
  const isPositive30d = crypto.market_data.price_change_percentage_30d > 0;

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
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Lateral: Métricas e Links */}
          <aside className="space-y-6">
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

            {/* Suply */}
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

            {/* Links */}
            <Card className="p-6 bg-gradient-card border-border">
              <div className="text-sm text-muted-foreground mb-2">Links Oficiais</div>
              <div className="space-y-2">
                {crypto.links.homepage[0] && (
                  <a
                    href={crypto.links.homepage[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:text-primary/80 transition-colors"
                  >
                    🌐 Website Oficial
                  </a>
                )}
                {crypto.links.blockchain_site[0] && (
                  <a
                    href={crypto.links.blockchain_site[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:text-primary/80 transition-colors"
                  >
                    ⛓️ Blockchain Explorer
                  </a>
                )}
              </div>
            </Card>
          </aside>

          {/* Principal: Abas com Gráfico / Visão Geral / Sobre */}
          <section className="space-y-6">
            <Tabs defaultValue="chart" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="chart">Gráfico</TabsTrigger>
                  <TabsTrigger value="markets">Mercados</TabsTrigger>
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="news">Atualizações</TabsTrigger>
                  <TabsTrigger value="about">Sobre</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chart">
                <Card className="p-6 bg-gradient-card border-border">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">Gráfico de Preços</h2>
                  </div>
                  <CryptoPriceChart cryptoId={crypto.id} />
                </Card>
              </TabsContent>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card className="p-6 bg-gradient-card border-border">
                    <div className="flex items-center gap-2 mb-6">
                      <Calculator className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Calculadora de Investimento</h2>
                    </div>
                    <InvestmentCalculator 
                      cryptoName={crypto.name}
                      currentPrice={crypto.market_data.current_price.usd}
                      priceChange24h={crypto.market_data.price_change_percentage_24h}
                      priceChange7d={crypto.market_data.price_change_percentage_7d}
                      priceChange30d={crypto.market_data.price_change_percentage_30d}
                    />
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="markets">
                <Card className="p-6 bg-gradient-card border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4">Mercados</h2>
                  <CryptoMarketsTable coinId={crypto.id} />
                </Card>
              </TabsContent>

              <TabsContent value="news">
                <Card className="p-6 bg-gradient-card border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4">Atualizações</h2>
                  <CryptoSocialFeed coinId={crypto.id} />
                </Card>
              </TabsContent>

              <TabsContent value="about">
                {crypto.description.en && (
                  <Card className="p-6 bg-gradient-card border-border">
                    <h2 className="text-xl font-bold text-foreground mb-4">Sobre {crypto.name}</h2>
                    <div 
                      className="text-muted-foreground prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: crypto.description.en.substring(0, 700) + (crypto.description.en.length > 700 ? '...' : '')
                      }}
                    />
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CryptoDetail;