import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  AlertCircle,
  Target,
  Clock,
  Activity,
  BarChart3,
  Gauge,
  Zap,
  ExternalLink
} from "lucide-react";

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

interface PredictionDetailDialogProps {
  prediction: Prediction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPlan: "free" | "basic" | "premium";
}

export const PredictionDetailDialog = ({
  prediction,
  open,
  onOpenChange,
  userPlan
}: PredictionDetailDialogProps) => {
  if (!prediction) return null;

  const getActionColor = (action: string) => {
    switch (action) {
      case "buy": return "text-green-500 bg-green-500/10";
      case "sell": return "text-red-500 bg-red-500/10";
      case "hold": return "text-yellow-500 bg-yellow-500/10";
      case "watch": return "text-blue-500 bg-blue-500/10";
      case "alert": return "text-orange-500 bg-orange-500/10";
      default: return "text-gray-500 bg-gray-500/10";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "buy": return <TrendingUp className="w-6 h-6" />;
      case "sell": return <TrendingDown className="w-6 h-6" />;
      default: return <Eye className="w-6 h-6" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return "text-green-500";
    if (score <= 7) return "text-yellow-500";
    return "text-red-500";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${getActionColor(prediction.action)}`}>
                {getActionIcon(prediction.action)}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {prediction.coin_id.toUpperCase()}
                </DialogTitle>
                <DialogDescription>
                  Análise gerada em {new Date(prediction.created_at).toLocaleString('pt-BR')}
                </DialogDescription>
              </div>
            </div>
            <Link to={`/crypto/${prediction.coin_id}`}>
              <Button variant="default" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Página Completa
              </Button>
            </Link>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Action and Confidence */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Ação Recomendada</span>
              </div>
              <div className={`flex items-center gap-2 ${getActionColor(prediction.action)} p-3 rounded-lg`}>
                {getActionIcon(prediction.action)}
                <span className="font-bold uppercase text-lg">
                  {getActionLabel(prediction.action)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="w-4 h-4" />
                <span className="text-sm font-medium">Confiança</span>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">
                  {prediction.confidence_level}%
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reasoning */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Análise Detalhada</span>
            </div>
            <p className="text-foreground leading-relaxed">
              {prediction.reasoning}
            </p>
          </div>

          <Separator />

          {/* Risk Score */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Avaliação de Risco</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getRiskColor(prediction.risk_score)} bg-current transition-all`}
                    style={{ width: `${(prediction.risk_score / 10) * 100}%` }}
                  />
                </div>
              </div>
              <Badge variant={prediction.risk_score <= 3 ? "default" : prediction.risk_score <= 7 ? "secondary" : "destructive"}>
                {prediction.risk_score}/10
              </Badge>
            </div>
          </div>

          {/* Technical Indicators (Basic/Premium) */}
          {userPlan !== "free" && prediction.technical_indicators && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Indicadores Técnicos Calculados</span>
                </div>
                
                {/* RSI com visualização */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">RSI (14 períodos)</span>
                    <Badge variant={
                      (prediction.technical_indicators?.rsi || 50) < 30 ? "default" : 
                      (prediction.technical_indicators?.rsi || 50) > 70 ? "destructive" : "secondary"
                    }>
                      {(prediction.technical_indicators?.rsi || 50).toFixed(2)}
                    </Badge>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        (prediction.technical_indicators?.rsi || 50) < 30 
                          ? 'bg-green-500' 
                          : (prediction.technical_indicators?.rsi || 50) > 70 
                          ? 'bg-red-500' 
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${prediction.technical_indicators?.rsi || 50}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(prediction.technical_indicators?.rsi || 50) < 30 && '🟢 Oversold - Potencial oportunidade de compra'}
                    {(prediction.technical_indicators?.rsi || 50) > 70 && '🔴 Overbought - Potencial correção'}
                    {(prediction.technical_indicators?.rsi || 50) >= 30 && (prediction.technical_indicators?.rsi || 50) <= 70 && '⚪ Zona neutra'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Volatilidade</p>
                    <Badge variant="secondary" className="text-sm">
                      {prediction.technical_indicators.volatility}
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Tendência</p>
                    <Badge variant="secondary" className="text-sm">
                      {prediction.technical_indicators.trend}
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Momentum</p>
                    <Badge variant="secondary" className="text-sm">
                      {prediction.technical_indicators.momentum}
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Mudança 24h</p>
                    <Badge variant={(prediction.technical_indicators?.priceChange24h || 0) > 0 ? "default" : "destructive"}>
                      {(prediction.technical_indicators?.priceChange24h || 0).toFixed(2)}%
                    </Badge>
                  </div>
                </div>

                {prediction.technical_indicators.volumeSpike && (
                  <div className="p-3 bg-orange-500/10 border border-orange-500/50 rounded-lg">
                    <p className="text-sm font-medium text-orange-500 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Volume Spike Detectado (+50% acima da média)
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Price Projection (Premium) */}
          {userPlan === "premium" && prediction.price_projection && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Projeção de Preço</span>
                </div>
                <div className="p-4 bg-gradient-primary/10 rounded-lg border border-primary/20">
                  <p className="text-3xl font-bold text-foreground mb-1">
                    ${prediction.price_projection.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{prediction.timeframe}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Expiration */}
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Validade</span>
            </div>
            <p className="text-sm text-foreground">
              Expira em: {new Date(prediction.expires_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
