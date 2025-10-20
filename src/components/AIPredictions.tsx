import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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
  Users
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
  const [isGenerating, setIsGenerating] = useState(false);
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

  const generatePredictions = async () => {
    setIsGenerating(true);
    try {
      const functionName = `generate-predictions-${userPlan}`;
      
      toast({
        title: "Gerando palpites...",
        description: "Isso pode levar alguns minutos.",
      });

      const { data, error } = await supabase.functions.invoke(functionName);

      if (error) throw error;

      toast({
        title: "Palpites gerados!",
        description: `${data.count || 0} novos palpites foram criados.`,
      });

      await fetchPredictions();
    } catch (error: any) {
      console.error('Error generating predictions:', error);
      toast({
        title: "Erro ao gerar palpites",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
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
    }
  }, [userPlan]);

  // Auto-refresh a cada minuto para atualizar o countdown
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPredictions();
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
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
          <Button 
            onClick={generatePredictions} 
            disabled={isGenerating}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Gerando...' : 'Gerar Novos Palpites'}
          </Button>
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
                <Card 
                  key={prediction.id} 
                  className="p-6 backdrop-blur-lg border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    setSelectedPrediction(prediction);
                    setIsDialogOpen(true);
                  }}
                >

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

                   {/* Indicators */}
                   {userPlan !== "free" && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Volatilidade:</span>
                        <Badge variant="secondary" className="text-xs">
                          {prediction.indicators?.volatility}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tendência:</span>
                        <Badge variant="secondary" className="text-xs">
                          {prediction.indicators?.trend}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Momentum:</span>
                        <Badge variant="secondary" className="text-xs">
                          {prediction.indicators?.momentum}
                        </Badge>
                      </div>
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
