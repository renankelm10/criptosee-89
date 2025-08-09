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
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    toast
  } = useToast();

  // Timer para próxima atualização (5 minutos)
  const countdownTimer = useCountdownTimer({
    targetDurationMs: 5 * 60 * 1000 // 5 minutos
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
  const filteredCryptos = cryptos.filter(crypto => {
    const matchesSearch = crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) || crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    console.log(`🔍 Filtro ativo: ${filter}, Crypto: ${crypto.name}, Change 24h: ${crypto.price_change_percentage_24h}`);
    switch (filter) {
      case "gainers":
        return crypto.price_change_percentage_24h > 0;
      case "losers":
        return crypto.price_change_percentage_24h < 0;
      case "volatile":
        return Math.abs(crypto.price_change_percentage_24h) > 5;
      case "all":
        console.log(`✅ Filtro "all" - incluindo: ${crypto.name}`);
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
          }].map(({
            key,
            label,
            icon: Icon
          }) => <Button key={key} variant={filter === key ? "default" : "ghost"} size="sm" onClick={() => setFilter(key as any)} className="flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </Button>)}
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