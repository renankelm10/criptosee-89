import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Sparkles, 
  RefreshCw,
  Crown,
  Zap,
  History,
  Activity,
  Star,
  Clock,
  Users,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";
import { PredictionHistory } from "./PredictionHistory";
import { CoinTracker } from "./CoinTracker";
import { PredictionDetailDialog } from "./PredictionDetailDialog";

interface Prediction {
  id: string;
  coin_id: string;
  action: "buy" | "sell" | "hold" | "watch" | "alert";
  confidence_level: number;
  reasoning: string;
  indicators: any;
  price_projection: number;
  timeframe: string;
  created_at: string;
  risk_score: number;
  target_plan: "free" | "basic" | "premium";
  expires_at: string;
  opportunity_level?: string;
  technical_indicators?: any;
}

interface UserSubscription {
  plan: "free" | "basic" | "premium";
}

const PLAN_INFO = {
  free: { count: 5, updateHours: 2, updateMinutes: undefined, name: "Gratuito" },
  basic: { count: 10, updateHours: 1, updateMinutes: undefined, name: "Básico" },
  premium: { count: 30, updateHours: undefined, updateMinutes: 30, name: "Premium" }
};

export const AIPredictions = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userPlan, setUserPlan] = useState<UserSubscription["plan"]>("free");
  const [filter, setFilter] = useState<"all" | "buy" | "sell" | "hold">("all");
  const [activeTab, setActiveTab] = useState<"predictions" | "history">("predictions");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchUserPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setUserPlan(data.plan);
    }
  };

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      // Buscar palpites que o usuário tem acesso baseado no plano
      // Premium vê todos, Basic vê basic+free, Free vê apenas free
      const planOrder = { free: 1, basic: 2, premium: 3 };
      const userPlanLevel = planOrder[userPlan];
      
      const { data, error } = await supabase
        .from('ai_predictions')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('confidence_level', { ascending: false });

      if (error) throw error;
      
      // Filtrar manualmente baseado no plano
      const filteredData = (data || []).filter(pred => {
        const predPlanLevel = planOrder[pred.target_plan];
        return predPlanLevel <= userPlanLevel;
      });
      
      setPredictions(filteredData);
      
      if (filteredData && filteredData.length > 0) {
        setLastUpdate(new Date(filteredData[0].created_at));
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      toast({
        title: "Erro ao carregar palpites",
        description: "Não foi possível carregar os palpites da IA.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateNextUpdate = () => {
    const now = new Date();
    const intervals = {
      free: 2 * 60, // 2 horas em minutos
      basic: 60, // 1 hora
      premium: 30 // 30 minutos
    };
    
    const intervalMinutes = intervals[userPlan];
    const nextUpdateTime = new Date(now.getTime() + intervalMinutes * 60 * 1000);
    setNextUpdate(nextUpdateTime);
  };

  const getNextUpdateTime = () => {
    if (!lastUpdate) return "Calculando...";
    
    const planInfo = PLAN_INFO[userPlan];
    const updateInterval = planInfo.updateMinutes 
      ? planInfo.updateMinutes * 60 * 1000 
      : planInfo.updateHours * 60 * 60 * 1000;
    
    const nextUpdate = new Date(lastUpdate.getTime() + updateInterval);
    const now = new Date();
    const diff = nextUpdate.getTime() - now.getTime();
    
    if (diff <= 0) return "Em breve...";
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  useEffect(() => {
    fetchUserPlan();
  }, []);

  useEffect(() => {
    if (userPlan) {
      fetchPredictions();
      calculateNextUpdate();
    }
  }, [userPlan]);

  // Subscription em tempo real para novos palpites (com debounce)
  useEffect(() => {
    if (!userPlan) return;

    let toastTimeout: NodeJS.Timeout;

    const channel = supabase
      .channel('ai-predictions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_predictions'
        },
        (payload) => {
          console.log('Novos palpites detectados!', payload);
          
          // Debounce: só atualizar após 3 segundos de inatividade
          clearTimeout(toastTimeout);
          toastTimeout = setTimeout(() => {
            fetchPredictions();
            calculateNextUpdate();
            
            // Atualizar silenciosamente sem toast
            fetchPredictions();
            calculateNextUpdate();
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(toastTimeout);
      supabase.removeChannel(channel);
    };
  }, [userPlan]);

  const getActionColor = (action: string) => {
    switch (action) {
      case "buy": return "text-green-500";
      case "sell": return "text-red-500";
      case "hold": return "text-yellow-500";
      case "watch": return "text-blue-500";
      case "alert": return "text-orange-500";
      default: return "text-gray-500";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "buy": return <TrendingUp className="w-5 h-5" />;
      case "sell": return <TrendingDown className="w-5 h-5" />;
      default: return <Eye className="w-5 h-5" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "buy": return "Comprar";
      case "sell": return "Vender";
      case "hold": return "Manter";
      case "watch": return "Observar";
      case "alert": return "Alerta";
      default: return action;
    }
  };

  const filteredPredictions = predictions.filter(p => 
    filter === "all" || p.action === filter
  );

  // Separar oportunidades HOT
  const hotOpportunities = predictions.filter(p => p.opportunity_level === 'hot');
  const warmOpportunities = predictions.filter(p => p.opportunity_level === 'warm');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Palpites de IA</h2>
              <p className="text-sm text-muted-foreground">
                Atualizações automáticas para o plano {PLAN_INFO[userPlan].name}
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {PLAN_INFO[userPlan].count} palpites compartilhados
                </p>
                <p className="text-xs text-muted-foreground">
                  Todos os usuários {PLAN_INFO[userPlan].name.toLowerCase()} veem os mesmos palpites
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Última atualização</p>
                  <p className="text-sm font-medium text-foreground">
                    {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Próxima em</p>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getNextUpdateTime()}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="predictions">
            <Activity className="mr-2 h-4 w-4" />
            Palpites Ativos
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="tracker">
            <Star className="mr-2 h-4 w-4" />
            Rastreamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-6">

          {/* 🔥 OPORTUNIDADES IMPERDÍVEIS */}
          {hotOpportunities.length > 0 && (
            <Card className="p-6 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 border-2 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-pulse">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Zap className="w-8 h-8 text-black" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    🔥 {hotOpportunities.length} Oportunidades Imperdíveis
                    <Badge className="bg-yellow-500 text-black animate-pulse">URGENTE</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ação recomendada com indicadores técnicos extremos!
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotOpportunities.map((pred) => (
                  <Card 
                    key={pred.id}
                    className="p-4 cursor-pointer hover:scale-105 transition-all duration-300 bg-gradient-to-br from-background to-yellow-500/10 border-2 border-yellow-500/50 shadow-lg hover:shadow-yellow-500/50"
                    onClick={() => {
                      setSelectedPrediction(pred);
                      setIsDialogOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-foreground">{pred.coin_id.toUpperCase()}</h4>
                        <div className={`flex items-center gap-2 mt-1 ${getActionColor(pred.action)}`}>
                          {getActionIcon(pred.action)}
                          <span className="font-bold uppercase text-sm">
                            {getActionLabel(pred.action)}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500 text-black font-bold">
                        {pred.confidence_level}%
                      </Badge>
                    </div>
                    {pred.technical_indicators?.rsi !== undefined && (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span>RSI:</span>
                          <Badge variant={pred.technical_indicators.rsi < 30 ? "default" : "destructive"}>
                            {pred.technical_indicators.rsi.toFixed(0)}
                          </Badge>
                        </div>
                        {pred.technical_indicators.volumeSpike && (
                          <Badge className="w-full bg-orange-500 text-white">
                            ⚡ Volume Spike Detectado!
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* 🌡️ BOAS OPORTUNIDADES */}
          {warmOpportunities.length > 0 && (
            <Card className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/50">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-bold text-foreground">
                  🌡️ {warmOpportunities.length} Boas Oportunidades
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {warmOpportunities.slice(0, 4).map((pred) => (
                  <Button
                    key={pred.id}
                    variant="outline"
                    className="flex flex-col items-start h-auto p-3 border-amber-500/30 hover:border-amber-500"
                    onClick={() => {
                      setSelectedPrediction(pred);
                      setIsDialogOpen(true);
                    }}
                  >
                    <span className="font-bold text-xs">{pred.coin_id.toUpperCase()}</span>
                    <span className={`text-xs ${getActionColor(pred.action)}`}>
                      {getActionLabel(pred.action)}
                    </span>
                  </Button>
                ))}
              </div>
            </Card>
          )}

      {/* Plan Badge */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="flex items-center gap-2">
          {userPlan === "premium" && <Crown className="w-4 h-4 text-yellow-500" />}
          {userPlan === "basic" && <Zap className="w-4 h-4 text-blue-500" />}
          Plano: {PLAN_INFO[userPlan].name}
        </Badge>
        <Badge variant="outline">
          {filteredPredictions.length} palpites ativos
        </Badge>
      </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Button 
              variant={filter === "all" ? "default" : "outline"} 
              onClick={() => setFilter("all")}
              size="sm"
            >
              Todos
            </Button>
            <Button 
              variant={filter === "buy" ? "default" : "outline"} 
              onClick={() => setFilter("buy")}
              size="sm"
            >
              Comprar
            </Button>
            <Button 
              variant={filter === "sell" ? "default" : "outline"} 
              onClick={() => setFilter("sell")}
              size="sm"
            >
              Vender
            </Button>
            <Button 
              variant={filter === "hold" ? "default" : "outline"} 
              onClick={() => setFilter("hold")}
              size="sm"
            >
              Manter
            </Button>
          </div>

          <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPredictions.map((prediction) => (
              <div key={prediction.id} className="relative pb-12">
                <Card 
                  className={`p-6 backdrop-blur-lg cursor-pointer transition-all duration-300 ${
                    prediction.opportunity_level === 'hot' 
                      ? 'border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] bg-gradient-to-br from-yellow-500/10 to-orange-500/10 animate-pulse' 
                      : prediction.opportunity_level === 'warm'
                      ? 'border border-amber-500/50 hover:border-amber-500 hover:shadow-lg'
                      : 'border-border/50 hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setSelectedPrediction(prediction);
                    setIsDialogOpen(true);
                  }}
                >

                  {/* Opportunity Badge */}
                  {prediction.opportunity_level === 'hot' && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-1 rounded-full font-bold text-xs shadow-lg animate-bounce">
                      🔥 IMPERDÍVEL!
                    </div>
                  )}
                  {prediction.opportunity_level === 'warm' && (
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold text-xs">
                      ⚡ Boa
                    </div>
                  )}

                  {/* Action Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-2 ${getActionColor(prediction.action)}`}>
                      {getActionIcon(prediction.action)}
                      <span className="font-bold uppercase text-sm">
                        {getActionLabel(prediction.action)}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {prediction.confidence_level}% confiança
                    </Badge>
                  </div>

                  {/* Coin */}
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {prediction.coin_id.toUpperCase()}
                  </h3>

                  {/* Reasoning */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {prediction.reasoning}
                  </p>

                   {/* Risk Score */}
                   <div className="flex items-center justify-between text-xs mb-4 p-2 bg-muted/50 rounded">
                     <span className="text-muted-foreground">Risco:</span>
                     <Badge variant={prediction.risk_score <= 3 ? "default" : prediction.risk_score <= 7 ? "secondary" : "destructive"}>
                       {prediction.risk_score}/10
                     </Badge>
                   </div>

                   {/* Technical Indicators */}
                   {userPlan !== "free" && prediction.technical_indicators?.rsi !== undefined && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">RSI (14):</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                prediction.technical_indicators.rsi < 30 
                                  ? 'bg-green-500' 
                                  : prediction.technical_indicators.rsi > 70 
                                  ? 'bg-red-500' 
                                  : 'bg-yellow-500'
                              }`}
                              style={{ width: `${prediction.technical_indicators.rsi}%` }}
                            />
                          </div>
                          <Badge variant={
                            prediction.technical_indicators.rsi < 30 ? "default" : 
                            prediction.technical_indicators.rsi > 70 ? "destructive" : "secondary"
                          } className="text-xs">
                            {prediction.technical_indicators.rsi.toFixed(0)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Volatilidade:</span>
                        <Badge variant="secondary" className="text-xs">
                          {prediction.technical_indicators.volatility}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tendência:</span>
                        <Badge variant="secondary" className="text-xs">
                          {prediction.technical_indicators.trend}
                        </Badge>
                      </div>
                      {prediction.technical_indicators.volumeSpike && (
                        <Badge className="w-full bg-orange-500 text-white text-xs">
                          ⚡ Volume Spike!
                        </Badge>
                      )}
                    </div>
                   )}

                  {/* Price Projection (Premium only) */}
                  {userPlan === "premium" && prediction.price_projection && (
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Projeção de preço:</p>
                      <p className="text-lg font-bold text-foreground">
                        ${prediction.price_projection.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {prediction.timeframe}
                      </p>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground mt-4">
                    {new Date(prediction.created_at).toLocaleString('pt-BR')}
                  </p>
                </Card>
                
                {/* Link para detalhes da moeda */}
                <Link 
                  to={`/crypto/${prediction.coin_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-0 left-0 right-0"
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group hover:bg-primary hover:text-primary-foreground"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Detalhes Completos
                    <ChevronRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              ))}
          </div>

          {filteredPredictions.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum palpite disponível
              </h3>
              <p className="text-muted-foreground mb-4">
                Gere novos palpites clicando no botão acima
              </p>
            </div>
          )}
          </div>

          {/* Upgrade CTA */}
          {userPlan !== "premium" && (
            <Card className="p-6 bg-gradient-primary/10 border-primary/20">
              <div className="flex items-center gap-4">
                <Crown className="w-12 h-12 text-yellow-500" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Upgrade para Premium
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Acesso ilimitado a palpites, análises detalhadas e projeções de preço
                  </p>
                </div>
                <Button variant="default" onClick={() => navigate('/plans')}>
                  Fazer Upgrade
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <PredictionHistory />
        </TabsContent>

        <TabsContent value="tracker" className="mt-0">
          <CoinTracker />
        </TabsContent>
      </Tabs>

      <PredictionDetailDialog
        prediction={selectedPrediction}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        userPlan={userPlan}
      />
    </div>
  );
};
