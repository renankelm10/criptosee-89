import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CryptoCard } from "@/components/CryptoCard";
import { MarketStats } from "@/components/MarketStats";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmailNotifications } from "@/components/EmailNotifications";
import { useCrypto } from "@/hooks/useCrypto";
import { useVolatilityNotifier } from "@/hooks/useVolatilityNotifier";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { RefreshCw, Search, TrendingUp, Zap, Filter, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
const Index = () => {
  const {
    cryptos,
    globalData,
    loading,
    error,
    refetch
  } = useCrypto();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "gainers" | "losers" | "volatile">("volatile");
  const [volatilityLevel, setVolatilityLevel] = useState<"all" | "extrema" | "alta" | "media" | "baixa">("all");
  const [showNotifications, setShowNotifications] = useState(false);

  // Limiares de volatilidade (variação absoluta em 24h)
  const VOLATILITY_THRESHOLDS = {
    extrema: 20, // >= 20%
    alta: 10,    // 10% - 19.99%
    media: 5,    // 5% - 9.99%
    baixa: 0     // 0% - 4.99%
  };
  const {
    toast
  } = useToast();

  // Timer para próxima atualização (30 segundos)
  const countdownTimer = useCountdownTimer({
    targetDurationMs: 1 * 30 * 1000 // 30 segundos/ 0.5 minutos
  });

  // Enable volatility notifications
  useVolatilityNotifier(cryptos);

  // Iniciar o timer quando os dados são carregados
  useEffect(() => {
    if (cryptos.length > 0 && !loading) {
      countdownTimer.start();
    }
  }, [cryptos.length, loading]);

  // Reiniciar o timer quando há atualização (sem dependência do countdownTimer)
  useEffect(() => {
    if (!loading && cryptos.length > 0) {
      countdownTimer.start();
    }
  }, [loading]);
  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Dados atualizados!",
      description: "Os dados das criptomoedas foram atualizados com sucesso."
    });
  };
  // Ordena por volatilidade (variação absoluta 24h) e seleciona top 500
  const volatileSorted = [...cryptos].sort((a, b) => Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0));
  const topVolatile = volatileSorted.slice(0, 500);

  // Fonte depende do filtro principal
  const sourceList = filter === "volatile" ? topVolatile : cryptos;

  const filteredCryptos = sourceList.filter(crypto => {
    const vol = Math.abs(crypto.price_change_percentage_24h || 0);
    const matchesSearch = crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) || crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    switch (filter) {
      case "gainers":
        return crypto.price_change_percentage_24h > 0;
      case "losers":
        return crypto.price_change_percentage_24h < 0;
      case "volatile":
        if (volatilityLevel === "extrema") return vol >= VOLATILITY_THRESHOLDS.extrema;
        if (volatilityLevel === "alta") return vol >= VOLATILITY_THRESHOLDS.alta && vol < VOLATILITY_THRESHOLDS.extrema;
        if (volatilityLevel === "media") return vol >= VOLATILITY_THRESHOLDS.media && vol < VOLATILITY_THRESHOLDS.alta;
        if (volatilityLevel === "baixa") return vol >= VOLATILITY_THRESHOLDS.baixa && vol < VOLATILITY_THRESHOLDS.media;
        return true; // 'all'
      case "all":
        return true;
      default:
        return true;
    }
  });
  console.log(`📊 Filtro: ${filter}, Total cryptos: ${cryptos.length}, Filtrados: ${filteredCryptos.length}`);
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <div className="text-destructive text-lg font-semibold mb-4">Erro ao carregar dados</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <SEO title="Criptomoedas em Alta e Volatilidade | CryptoVolatil" description="Acompanhe as moedas mais voláteis, preços e volume em tempo real com dados confiáveis via Supabase." />
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="bg-gradient-primary bg-clip-text text-transparent text-3xl font-bold text-left">Crypto.See 👁️👁️</h1>
                <p className="text-sm text-muted-foreground">
                  Acompanhe as moedas mais voláteis e em crescimento rápido
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar criptomoeda..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-64" />
                </div>
              </div>
              
              <Button onClick={() => setShowNotifications(!showNotifications)} variant={showNotifications ? "default" : "outline"} className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Notificações
              </Button>
              
              <Button onClick={handleRefresh} variant="outline" disabled={loading} className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            {[{
            key: "volatile",
            label: "Mais Voláteis",
            icon: TrendingUp
          }, {
            key: "gainers",
            label: "Em Alta",
            icon: TrendingUp
          }, {
            key: "losers",
            label: "Em Baixa",
            icon: TrendingUp
          }, {
            key: "all",
            label: "Todas",
            icon: null
          }].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(key as any)}
                className="flex items-center gap-2"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </Button>
            ))}

            {filter === "volatile" && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-muted-foreground">Nível:</span>
                {[{ key: "all", label: "Todas" }, { key: "extrema", label: "Extrema" }, { key: "alta", label: "Alta" }, { key: "media", label: "Média" }, { key: "baixa", label: "Baixa" }].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={volatilityLevel === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setVolatilityLevel(key as any)}
                    className="flex items-center gap-2"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {showNotifications && <div className="mb-8">
            <EmailNotifications />
          </div>}

        {globalData && <MarketStats totalMarketCap={globalData.total_market_cap.usd} totalVolume={globalData.total_volume.usd} activeCoins={globalData.active_cryptocurrencies} dominance={globalData.market_cap_percentage.btc} />}

        {loading ? <LoadingSpinner /> : <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {filter === "volatile" && "🔥 Mais Voláteis"}
                  {filter === "gainers" && "📈 Em Alta"}
                  {filter === "losers" && "📉 Em Baixa"}
                  {filter === "all" && "💰 Todas as Moedas"}
                </h2>
                <p className="text-muted-foreground">
                  {filteredCryptos.length} criptomoedas encontradas
                  {searchTerm && ` para "${searchTerm}"`}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Badge variant="outline" className="bg-crypto-accent/10 text-crypto-accent">
                  Atualizado há {new Date().toLocaleTimeString('pt-BR')}
                </Badge>
                <Badge variant="outline" className="bg-crypto-primary/10 text-crypto-primary">
                  ⏰ Próxima atualização: {countdownTimer.formatTime()}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCryptos.map((crypto, index) => {
            console.log(`🎯 Renderizando card: ${crypto.name} (${index})`);
            return <CryptoCard key={crypto.id} crypto={crypto} index={index} />;
          })}
            </div>

            {filteredCryptos.length === 0 && <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Nenhuma criptomoeda encontrada
                </h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou termo de busca
                </p>
              </div>}
          </>}
      </div>
    </div>;
};
export default Index;
