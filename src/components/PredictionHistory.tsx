import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoadingSpinner } from "./LoadingSpinner";

interface PredictionHistoryItem {
  id: string;
  coin_id: string;
  action: string;
  confidence_level: number;
  reasoning: string;
  price_projection: number | null;
  created_at: string;
  expires_at: string | null;
  actual_outcome: string | null;
  performance_score: number | null;
}

interface UserSubscription {
  plan: 'free' | 'basic' | 'premium';
}

const HISTORY_LIMITS = {
  free: 0,
  basic: 7,
  premium: 9999
};

export const PredictionHistory = () => {
  const [predictions, setPredictions] = useState<PredictionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<'free' | 'basic' | 'premium'>('free');
  const [metrics, setMetrics] = useState({
    totalPredictions: 0,
    correctPredictions: 0,
    avgPerformance: 0,
    byAction: {
      buy: { total: 0, correct: 0 },
      sell: { total: 0, correct: 0 },
      hold: { total: 0, correct: 0 }
    }
  });

  useEffect(() => {
    fetchUserPlan();
    fetchPredictionHistory();
  }, []);

  const fetchUserPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if (data) setUserPlan(data.plan);
  };

  const fetchPredictionHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const daysLimit = HISTORY_LIMITS[userPlan];
    
    let query = supabase
      .from('ai_predictions')
      .select('*')
      .not('actual_outcome', 'is', null)
      .order('created_at', { ascending: false });

    if (daysLimit < 9999) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - daysLimit);
      query = query.gte('created_at', limitDate.toISOString());
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching prediction history:', error);
      setLoading(false);
      return;
    }

    if (data) {
      setPredictions(data);
      calculateMetrics(data);
    }
    setLoading(false);
  };

  const calculateMetrics = (data: PredictionHistoryItem[]) => {
    const total = data.length;
    const correct = data.filter(p => p.performance_score && p.performance_score >= 70).length;
    const avgPerf = data.reduce((acc, p) => acc + (p.performance_score || 0), 0) / (total || 1);

    const byAction = {
      buy: { total: 0, correct: 0 },
      sell: { total: 0, correct: 0 },
      hold: { total: 0, correct: 0 }
    };

    data.forEach(p => {
      if (['buy', 'sell', 'hold'].includes(p.action)) {
        const action = p.action as 'buy' | 'sell' | 'hold';
        byAction[action].total++;
        if (p.performance_score && p.performance_score >= 70) {
          byAction[action].correct++;
        }
      }
    });

    setMetrics({
      totalPredictions: total,
      correctPredictions: correct,
      avgPerformance: avgPerf,
      byAction
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="h-4 w-4" />;
      case 'sell': return <TrendingDown className="h-4 w-4" />;
      case 'hold': return <Minus className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'sell': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'hold': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'watch': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'alert': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-muted';
    }
  };

  const getPerformanceColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (userPlan === 'free') {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Histórico de Palpites</CardTitle>
          <CardDescription>
            Acesso ao histórico disponível apenas para planos Basic e Premium
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Faça upgrade para visualizar o histórico e métricas de performance dos palpites
            </p>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Upgrade para Basic ou Premium
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const accuracyRate = metrics.totalPredictions > 0 
    ? ((metrics.correctPredictions / metrics.totalPredictions) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Métricas de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Total de Palpites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPredictions}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Taxa de Acerto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{accuracyRate}%</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Performance Média</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.avgPerformance)}`}>
              {metrics.avgPerformance.toFixed(0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Melhor Ação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(metrics.byAction).reduce((best, [action, data]) => {
                const rate = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                const bestRate = best.data.total > 0 ? (best.data.correct / best.data.total) * 100 : 0;
                return rate > bestRate ? { action, data } : best;
              }, { action: '-', data: { total: 0, correct: 0 } }).action.toUpperCase()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Histórico */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
          <CardDescription>
            {userPlan === 'basic' 
              ? 'Últimos 7 dias de palpites' 
              : 'Histórico completo de palpites'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum palpite avaliado ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.map((prediction) => (
                  <TableRow key={prediction.id}>
                    <TableCell>
                      {format(new Date(prediction.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium uppercase">
                      {prediction.coin_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getActionColor(prediction.action)}>
                        <span className="flex items-center gap-1">
                          {getActionIcon(prediction.action)}
                          {prediction.action.toUpperCase()}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>{prediction.confidence_level}%</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {prediction.actual_outcome || 'Pendente'}
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${getPerformanceColor(prediction.performance_score)}`}>
                        {prediction.performance_score ? `${prediction.performance_score}%` : '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
