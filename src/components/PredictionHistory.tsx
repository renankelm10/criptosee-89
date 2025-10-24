import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Activity, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoadingSpinner } from "./LoadingSpinner";
import { VotingCell } from "./VotingCell";
import { PredictionAnalytics } from "./PredictionAnalytics";

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
  correct_votes?: number;
  incorrect_votes?: number;
  total_votes?: number;
  accuracy_percentage?: number;
  user_vote?: 'correct' | 'incorrect' | null;
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
  const [consensusFilter, setConsensusFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
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
  const [analyticsData, setAnalyticsData] = useState({
    totalPredictions: 0,
    highAgreement: 0,
    moderateAgreement: 0,
    divergent: 0,
    avgAiScore: 0,
    avgCommunityScore: 0,
    byAction: {
      buy: { total: 0, communityAccuracy: 0 },
      sell: { total: 0, communityAccuracy: 0 },
      hold: { total: 0, communityAccuracy: 0 }
    }
  });

  useEffect(() => {
    fetchUserPlan();
  }, []);

  useEffect(() => {
    if (userPlan) {
      fetchPredictionHistory();
    }
  }, [userPlan]);

  useEffect(() => {
    const channel = supabase
      .channel('prediction-votes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prediction_votes'
        },
        () => {
          fetchPredictionHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userPlan]);

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
      const predictionIds = data.map(p => p.id);
      
      const { data: voteCounts } = await supabase
        .from('prediction_vote_counts')
        .select('*')
        .in('prediction_id', predictionIds);

      const { data: userVotes } = await supabase
        .from('prediction_votes')
        .select('prediction_id, vote_type')
        .eq('user_id', user.id)
        .in('prediction_id', predictionIds);

      const enrichedData: PredictionHistoryItem[] = data.map(prediction => {
        const votes = voteCounts?.find(v => v.prediction_id === prediction.id);
        const userVote = userVotes?.find(v => v.prediction_id === prediction.id);
        
        return {
          ...prediction,
          correct_votes: votes?.correct_votes || 0,
          incorrect_votes: votes?.incorrect_votes || 0,
          total_votes: votes?.total_votes || 0,
          accuracy_percentage: votes?.accuracy_percentage || 0,
          user_vote: (userVote?.vote_type as 'correct' | 'incorrect') || null
        };
      });
      
      setPredictions(enrichedData);
      calculateMetrics(enrichedData);
      calculateAnalytics(enrichedData);
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

  const calculateAnalytics = (data: PredictionHistoryItem[]) => {
    const total = data.length;
    const highAgreement = data.filter(p => {
      if (!p.total_votes || p.total_votes < 10) return false;
      const diff = Math.abs((p.performance_score || 0) - (p.accuracy_percentage || 0));
      return diff < 10;
    }).length;

    const moderateAgreement = data.filter(p => {
      if (!p.total_votes || p.total_votes < 10) return false;
      const diff = Math.abs((p.performance_score || 0) - (p.accuracy_percentage || 0));
      return diff >= 10 && diff < 30;
    }).length;

    const divergent = data.filter(p => {
      if (!p.total_votes || p.total_votes < 10) return false;
      const diff = Math.abs((p.performance_score || 0) - (p.accuracy_percentage || 0));
      return diff >= 30;
    }).length;

    const avgAiScore = data.reduce((acc, p) => acc + (p.performance_score || 0), 0) / (total || 1);
    const votedPredictions = data.filter(p => (p.total_votes || 0) > 0);
    const avgCommunityScore = votedPredictions.reduce((acc, p) => acc + (p.accuracy_percentage || 0), 0) / (votedPredictions.length || 1);

    const byAction = {
      buy: { total: 0, communityAccuracy: 0 },
      sell: { total: 0, communityAccuracy: 0 },
      hold: { total: 0, communityAccuracy: 0 }
    };

    (['buy', 'sell', 'hold'] as const).forEach(action => {
      const actionPredictions = data.filter(p => p.action === action && (p.total_votes || 0) > 0);
      byAction[action].total = actionPredictions.length;
      if (actionPredictions.length > 0) {
        byAction[action].communityAccuracy = actionPredictions.reduce((acc, p) => acc + (p.accuracy_percentage || 0), 0) / actionPredictions.length;
      }
    });

    setAnalyticsData({
      totalPredictions: total,
      highAgreement,
      moderateAgreement,
      divergent,
      avgAiScore,
      avgCommunityScore,
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

  const filteredPredictions = predictions.filter(p => {
    if (consensusFilter !== 'all') {
      const accuracy = p.accuracy_percentage || 0;
      const total = p.total_votes || 0;
      
      if (consensusFilter === 'high' && !(accuracy >= 80 && total >= 10)) return false;
      if (consensusFilter === 'good' && !(accuracy >= 60 && accuracy < 80 && total >= 5)) return false;
      if (consensusFilter === 'moderate' && !(accuracy >= 40 && accuracy < 60)) return false;
      if (consensusFilter === 'low' && !(accuracy < 40 && total >= 5)) return false;
      if (consensusFilter === 'divergent' && !(total >= 10 && Math.abs((p.performance_score || 0) - accuracy) >= 30)) return false;
      if (consensusFilter === 'no_votes' && total > 0) return false;
    }

    if (confidenceFilter !== 'all') {
      const total = p.total_votes || 0;
      if (confidenceFilter === 'high' && total < 20) return false;
      if (confidenceFilter === 'medium' && (total < 10 || total >= 20)) return false;
      if (confidenceFilter === 'low' && (total < 5 || total >= 10)) return false;
      if (confidenceFilter === 'very_low' && total >= 5) return false;
    }

    if (actionFilter !== 'all' && p.action !== actionFilter) return false;

    return true;
  });

  const activeFiltersCount = [consensusFilter, confidenceFilter, actionFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setConsensusFilter('all');
    setConfidenceFilter('all');
    setActionFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros Avançados</CardTitle>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar ({activeFiltersCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Filtrar por Consenso</label>
              <Select value={consensusFilter} onValueChange={setConsensusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="high">Alto Consenso (≥80%)</SelectItem>
                  <SelectItem value="good">Bom Consenso (60-79%)</SelectItem>
                  <SelectItem value="moderate">Moderado (40-59%)</SelectItem>
                  <SelectItem value="low">Baixo Consenso (&lt;40%)</SelectItem>
                  <SelectItem value="divergent">Divergente da IA</SelectItem>
                  <SelectItem value="no_votes">Sem Votos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filtrar por Confiança</label>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="high">Alta Confiança (≥20 votos)</SelectItem>
                  <SelectItem value="medium">Média Confiança (10-19 votos)</SelectItem>
                  <SelectItem value="low">Baixa Confiança (5-9 votos)</SelectItem>
                  <SelectItem value="very_low">Muito Baixa (&lt;5 votos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Ação</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="buy">Comprar</SelectItem>
                  <SelectItem value="sell">Vender</SelectItem>
                  <SelectItem value="hold">Segurar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {consensusFilter !== 'all' && (
                <Badge variant="secondary">
                  Consenso: {consensusFilter}
                </Badge>
              )}
              {confidenceFilter !== 'all' && (
                <Badge variant="secondary">
                  Confiança: {confidenceFilter}
                </Badge>
              )}
              {actionFilter !== 'all' && (
                <Badge variant="secondary">
                  Ação: {actionFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métricas de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Consenso da Comunidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(() => {
                const totalCommunityVotes = predictions.reduce((sum, p) => sum + (p.total_votes || 0), 0);
                const totalCorrect = predictions.reduce((sum, p) => sum + (p.correct_votes || 0), 0);
                return totalCommunityVotes > 0 
                  ? `${((totalCorrect / totalCommunityVotes) * 100).toFixed(0)}%`
                  : '-';
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {predictions.reduce((sum, p) => sum + (p.total_votes || 0), 0)} votos totais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Avançados */}
      <PredictionAnalytics data={analyticsData} />

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
          {filteredPredictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {predictions.length === 0 
                ? 'Nenhum palpite avaliado ainda'
                : 'Nenhum palpite encontrado com os filtros selecionados'}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Mostrando {filteredPredictions.length} de {predictions.length} palpites
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead className="text-center">Votos da Comunidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPredictions.map((prediction) => (
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
                    <TableCell>
                      <VotingCell 
                        predictionId={prediction.id}
                        correctVotes={prediction.correct_votes || 0}
                        incorrectVotes={prediction.incorrect_votes || 0}
                        userVote={prediction.user_vote}
                        onVoteChange={fetchPredictionHistory}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
