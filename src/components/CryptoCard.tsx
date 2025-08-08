import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency?: number;
  market_cap_rank: number;
  image: string;
  market_cap: number;
  total_volume: number;
}

interface CryptoCardProps {
  crypto: CryptoData;
  index: number;
}

export const CryptoCard = ({ crypto, index }: CryptoCardProps) => {
  const navigate = useNavigate();
  
  // Verificações de segurança para valores nulos
  const safePrice = crypto.current_price || 0;
  const safePriceChange24h = crypto.price_change_percentage_24h || 0;
  const safeHourlyChange = crypto.price_change_percentage_1h_in_currency || 0;
  const safeMarketCap = crypto.market_cap || 0;
  const safeTotalVolume = crypto.total_volume || 0;
  
  const isPositive = safePriceChange24h > 0;
  const isHourlyPositive = safeHourlyChange > 0;
  
  const formatPrice = (price: number) => {
    const safePrice = price || 0;
    if (safePrice < 1) {
      return `$${safePrice.toFixed(6)}`;
    }
    return `$${safePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatLargeNumber = (num: number) => {
    const safeNum = num || 0;
    if (safeNum >= 1e9) {
      return `$${(safeNum / 1e9).toFixed(2)}B`;
    }
    if (safeNum >= 1e6) {
      return `$${(safeNum / 1e6).toFixed(2)}M`;
    }
    return `$${safeNum.toLocaleString()}`;
  };

  const getVolatilityLevel = () => {
    const change = Math.abs(safePriceChange24h);
    if (change > 20) return "EXTREMA";
    if (change > 10) return "ALTA";
    if (change > 5) return "MÉDIA";
    return "BAIXA";
  };

  const getVolatilityColor = () => {
    const change = Math.abs(safePriceChange24h);
    if (change > 20) return "bg-crypto-highlight";
    if (change > 10) return "bg-crypto-accent";
    if (change > 5) return "bg-primary";
    return "bg-muted";
  };

  return (
    <Card 
      className="relative p-6 bg-gradient-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute top-4 right-4">
        <Badge variant="outline" className={`${getVolatilityColor()} text-foreground`}>
          {getVolatilityLevel()}
        </Badge>
      </div>

      <div className="flex items-start gap-4">
        <div className="relative">
          <img 
            src={crypto.image} 
            alt={crypto.name}
            className="w-12 h-12 rounded-full ring-2 ring-primary/20"
          />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
            #{crypto.market_cap_rank}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-foreground truncate">{crypto.name}</h3>
            <span className="text-sm text-muted-foreground uppercase font-mono">
              {crypto.symbol}
            </span>
          </div>

          <div className="text-2xl font-bold text-foreground mb-3">
            {formatPrice(safePrice)}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className={`w-4 h-4 text-crypto-gain`} />
              ) : (
                <TrendingDown className={`w-4 h-4 text-crypto-loss`} />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                {isPositive ? '+' : ''}{safePriceChange24h.toFixed(2)}%
              </span>
              <span className="text-xs text-muted-foreground">24h</span>
            </div>

            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${isHourlyPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`} />
              <span className={`text-sm font-medium ${isHourlyPositive ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                {isHourlyPositive ? '+' : ''}{safeHourlyChange.toFixed(2)}%
              </span>
              <span className="text-xs text-muted-foreground">1h</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <div className="text-muted-foreground">Market Cap</div>
                <div className="font-semibold">{formatLargeNumber(safeMarketCap)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Volume 24h</div>
                <div className="font-semibold">{formatLargeNumber(safeTotalVolume)}</div>
              </div>
            </div>
            
            <Button 
              onClick={() => {
                console.log('🔍 Clicando no card:', crypto.name, 'ID:', crypto.id);
                console.log('📍 Navegando para:', `/crypto/${crypto.id}`);
                try {
                  navigate(`/crypto/${crypto.id}`);
                } catch (error) {
                  console.error('❌ Erro na navegação:', error);
                }
              }}
              className="w-full"
              variant="outline"
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Detalhes & Calcular
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};