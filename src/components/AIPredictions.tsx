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
  Lock,
  Crown,
  Zap,
  History,
  Activity,
  Star
} from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";
import { PredictionHistory } from "./PredictionHistory";
import { CoinTracker } from "./CoinTracker";

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
}

interface UserSubscription {
  plan: "free" | "basic" | "premium";
}

const PLAN_LIMITS = {
  free: { daily: 3, history: 0, maxRisk: 3 },
  basic: { daily: 10, history: 7, maxRisk: 7 },
  premium: { daily: -1, history: -1, maxRisk: 10 } // -1 = unlimited
};

export const AIPredictions = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [userPlan, setUserPlan] = useState<UserSubscription["plan"]>("free");
  const [viewedToday, setViewedToday] = useState(0);
  const [filter, setFilter] = useState<"all" | "buy" | "sell" | "hold">("all");
  const [activeTab, setActiveTab] = useState<"predictions" | "history">("predictions");
  const { toast } = useToast();

  const canViewMore = () => {
    const limit = PLAN_LIMITS[userPlan].daily;
    return limit === -1 || viewedToday < limit;
  };

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
      const { data, error } = await supabase
        .from('ai_predictions')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .lte('risk_score', PLAN_LIMITS[userPlan].maxRisk)
        .order('confidence_level', { ascending: false })
        .limit(30);

      if (error) throw error;
      setPredictions(data || []);
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
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('generate-ai-predictions', {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });
      
      if (error) throw error;
      
      toast({
        title: "Palpites gerados!",
        description: `${data.predictionsGenerated} novos palpites foram criados.`
      });
      
      await fetchPredictions();
    } catch (error) {
      console.error('Error generating predictions:', error);
      toast({
        title: "Erro ao gerar palpites",
        description: "Não foi possível gerar novos palpites.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const trackView = async (predictionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_prediction_views')
      .insert({
        user_id: user.id,
        prediction_id: predictionId
      });

    setViewedToday(prev => prev + 1);
  };

  useEffect(() => {
    fetchUserPlan();
    fetchPredictions();
  }, []);

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

  const filteredPredictions = predictions.filter(p => 
    filter === "all" || p.action === filter
  );

  const displayedPredictions = userPlan === "premium" 
    ? filteredPredictions 
    : filteredPredictions.slice(0, PLAN_LIMITS[userPlan].daily);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Palpites de IA</h2>
            <p className="text-sm text-muted-foreground">
              Análises inteligentes geradas por IA
            </p>
          </div>
        </div>

        <Button 
          onClick={generatePredictions} 
          disabled={generating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          Gerar Novos
        </Button>
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
          Plano: {userPlan === "premium" ? "Premium" : userPlan === "basic" ? "Básico" : "Gratuito"}
        </Badge>
        {PLAN_LIMITS[userPlan].daily !== -1 && (
          <Badge variant="outline">
            {viewedToday}/{PLAN_LIMITS[userPlan].daily} palpites visualizados hoje
          </Badge>
        )}
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
            {displayedPredictions.map((prediction, index) => {
              const isLocked = !canViewMore() && index >= PLAN_LIMITS[userPlan].daily;

              return (
                <Card 
                  key={prediction.id} 
                  className={`p-6 backdrop-blur-lg border-border/50 ${
                    isLocked ? 'opacity-50 relative' : ''
                  }`}
                  onClick={() => !isLocked && trackView(prediction.id)}
                >
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10">
                      <div className="text-center space-y-2">
                        <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm font-medium">Upgrade para ver mais</p>
                      </div>
                    </div>
                  )}

                  {/* Action Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-2 ${getActionColor(prediction.action)}`}>
                      {getActionIcon(prediction.action)}
                      <span className="font-bold uppercase text-sm">
                        {prediction.action}
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
              );
            })}
          </div>

          {displayedPredictions.length === 0 && (
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
    </div>
  );
};
