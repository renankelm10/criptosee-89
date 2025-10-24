import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface AnalyticsData {
  totalPredictions: number;
  highAgreement: number;
  moderateAgreement: number;
  divergent: number;
  avgAiScore: number;
  avgCommunityScore: number;
  byAction: {
    buy: { total: number; communityAccuracy: number };
    sell: { total: number; communityAccuracy: number };
    hold: { total: number; communityAccuracy: number };
  };
}

interface PredictionAnalyticsProps {
  data: AnalyticsData;
}

export const PredictionAnalytics = ({ data }: PredictionAnalyticsProps) => {
  const agreementPercentage = data.totalPredictions > 0
    ? ((data.highAgreement / data.totalPredictions) * 100).toFixed(0)
    : '0';

  const bestAction = Object.entries(data.byAction).reduce((best, [action, stats]) => {
    if (stats.total === 0) return best;
    if (!best || stats.communityAccuracy > best.accuracy) {
      return { action, accuracy: stats.communityAccuracy, total: stats.total };
    }
    return best;
  }, null as { action: string; accuracy: number; total: number } | null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">📈 Analytics Avançados</h3>
        <Badge variant="outline" className="text-xs">
          {data.totalPredictions} predições analisadas
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Concordância IA vs Comunidade */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Concordância Alta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {agreementPercentage}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              IA e comunidade concordam
            </p>
          </CardContent>
        </Card>

        {/* Divergências */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Divergências
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {data.divergent}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              predições com opinião dividida
            </p>
          </CardContent>
        </Card>

        {/* Melhor ação por consenso */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Ação Mais Confiável
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary uppercase">
              {bestAction?.action || '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bestAction ? `${bestAction.accuracy.toFixed(0)}% de acerto` : 'Sem dados'}
            </p>
          </CardContent>
        </Card>

        {/* Score geral da comunidade */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-purple-500" />
              Score Médio Comunidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {data.avgCommunityScore.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {data.avgAiScore.toFixed(0)}% da IA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown por ação */}
      <Card className="border-border/50">
        <CardHeader>
          <CardDescription>Confiabilidade por Tipo de Ação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.byAction).map(([action, stats]) => (
              <div key={action} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="uppercase">
                    {action}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {stats.total} predições
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${stats.total > 0 ? stats.communityAccuracy : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium min-w-[45px]">
                    {stats.total > 0 ? `${stats.communityAccuracy.toFixed(0)}%` : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
