import { Card } from "@/components/ui/card";
import { TrendingUp, Activity, Eye, Zap } from "lucide-react";

interface MarketStatsProps {
  totalMarketCap: number;
  totalVolume: number;
  activeCoins: number;
  dominance: number;
}

export const MarketStats = ({ totalMarketCap, totalVolume, activeCoins, dominance }: MarketStatsProps) => {
  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    }
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    }
    if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  const stats = [
    {
      icon: TrendingUp,
      label: "Market Cap Total",
      value: formatLargeNumber(totalMarketCap),
      color: "text-crypto-gain",
      bgColor: "bg-crypto-gain/10"
    },
    {
      icon: Activity,
      label: "Volume 24h",
      value: formatLargeNumber(totalVolume),
      color: "text-crypto-accent",
      bgColor: "bg-crypto-accent/10"
    },
    {
      icon: Eye,
      label: "Moedas Ativas",
      value: activeCoins.toLocaleString(),
      color: "text-crypto-highlight",
      bgColor: "bg-crypto-highlight/10"
    },
    {
      icon: Zap,
      label: "BTC Dominância",
      value: `${dominance.toFixed(1)}%`,
      color: "text-primary",
      bgColor: "bg-primary/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card key={stat.label} className="p-6 bg-gradient-card border-border hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};