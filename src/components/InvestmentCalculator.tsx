import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calculator, Target, AlertTriangle } from "lucide-react";

interface InvestmentCalculatorProps {
  cryptoName: string;
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
}

export const InvestmentCalculator = ({ 
  cryptoName, 
  currentPrice, 
  priceChange24h, 
  priceChange7d, 
  priceChange30d 
}: InvestmentCalculatorProps) => {
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [results, setResults] = useState<any>(null);

  const calculateInvestment = () => {
    const investment = parseFloat(investmentAmount);
    const target = parseFloat(targetPrice);

    if (isNaN(investment) || isNaN(target) || investment <= 0 || target <= 0) {
      return;
    }

    const coins = investment / currentPrice;
    const potentialValue = coins * target;
    const potentialGain = potentialValue - investment;
    const percentageGain = ((target - currentPrice) / currentPrice) * 100;

    // Calcular probabilidade baseada no histórico de volatilidade
    const volatility = Math.abs(priceChange24h) + Math.abs(priceChange7d) + Math.abs(priceChange30d);
    const averageChange = (priceChange24h + priceChange7d + priceChange30d) / 3;
    
    // Probabilidade simplificada baseada na tendência e volatilidade
    let probability = 50; // Base neutro
    
    if (percentageGain > 0) {
      // Se o target é para cima
      if (averageChange > 0) {
        probability += Math.min(averageChange * 2, 30); // Máximo +30%
      } else {
        probability -= Math.min(Math.abs(averageChange) * 2, 30); // Máximo -30%
      }
    } else {
      // Se o target é para baixo
      if (averageChange < 0) {
        probability += Math.min(Math.abs(averageChange) * 2, 30);
      } else {
        probability -= Math.min(averageChange * 2, 30);
      }
    }

    // Ajustar baseado na volatilidade (mais volátil = menos previsível)
    if (volatility > 20) {
      probability -= 15;
    } else if (volatility > 10) {
      probability -= 10;
    }

    probability = Math.max(5, Math.min(95, probability)); // Entre 5% e 95%

    const riskLevel = getRiskLevel(percentageGain, volatility);

    setResults({
      coins: coins.toFixed(8),
      potentialValue: potentialValue.toFixed(2),
      potentialGain: potentialGain.toFixed(2),
      percentageGain: percentageGain.toFixed(2),
      probability: probability.toFixed(1),
      riskLevel
    });
  };

  const getRiskLevel = (percentageGain: number, volatility: number) => {
    const absGain = Math.abs(percentageGain);
    
    if (absGain > 100 || volatility > 30) {
      return { level: "EXTREMO", color: "bg-destructive", icon: AlertTriangle };
    } else if (absGain > 50 || volatility > 20) {
      return { level: "ALTO", color: "bg-crypto-highlight", icon: TrendingUp };
    } else if (absGain > 20 || volatility > 10) {
      return { level: "MÉDIO", color: "bg-crypto-accent", icon: Target };
    } else {
      return { level: "BAIXO", color: "bg-crypto-gain", icon: TrendingUp };
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isPositiveGain = results && parseFloat(results.potentialGain) > 0;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="investment">Valor do Investimento (USD)</Label>
          <Input
            id="investment"
            type="number"
            placeholder="Ex: 1000"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="target">Preço Alvo (USD)</Label>
          <Input
            id="target"
            type="number"
            placeholder={`Atual: $${currentPrice.toFixed(6)}`}
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button 
          onClick={calculateInvestment}
          className="w-full"
          disabled={!investmentAmount || !targetPrice}
        >
          <Calculator className="w-4 h-4 mr-2" />
          Calcular Retorno
        </Button>
      </div>

      {/* Results Section */}
      {results && (
        <Card className="p-4 bg-secondary/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Análise do Investimento</h3>
              <Badge className={`${results.riskLevel.color} text-foreground`}>
                <results.riskLevel.icon className="w-3 h-3 mr-1" />
                Risco {results.riskLevel.level}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Quantidade {cryptoName}</div>
                <div className="font-semibold">{results.coins}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Valor Potencial</div>
                <div className="font-semibold">{formatCurrency(results.potentialValue)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Lucro/Prejuízo</div>
                <div className={`font-semibold flex items-center gap-1 ${isPositiveGain ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                  {isPositiveGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatCurrency(results.potentialGain)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Variação %</div>
                <div className={`font-semibold ${isPositiveGain ? 'text-crypto-gain' : 'text-crypto-loss'}`}>
                  {isPositiveGain ? '+' : ''}{results.percentageGain}%
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Probabilidade Estimada</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${results.probability}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{results.probability}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * Baseado na volatilidade e tendência histórica. Não é garantia de resultado.
              </p>
            </div>

            <Card className="p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-semibold">Métricas Base:</div>
                <div>• Mudança 24h: {priceChange24h > 0 ? '+' : ''}{priceChange24h.toFixed(2)}%</div>
                <div>• Mudança 7d: {priceChange7d > 0 ? '+' : ''}{priceChange7d.toFixed(2)}%</div>
                <div>• Mudança 30d: {priceChange30d > 0 ? '+' : ''}{priceChange30d.toFixed(2)}%</div>
              </div>
            </Card>
          </div>
        </Card>
      )}
    </div>
  );
};