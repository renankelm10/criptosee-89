import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Ticker {
  market: {
    name: string;
    identifier: string;
    logo?: string | null;
  };
  base: string;
  target: string;
  last: number;
  converted_last?: { usd?: number };
  volume: number; // base volume
  trust_score?: "green" | "yellow" | "red" | null;
  trade_url?: string | null;
}

interface CryptoMarketsTableProps {
  coinId: string;
}

export const CryptoMarketsTable = ({ coinId }: CryptoMarketsTableProps) => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(20);

  useEffect(() => {
    let aborted = false;

    const fetchTickers = async (retry = 0) => {
      try {
        setLoading(true);
        setError(null);
        if (retry > 0) await new Promise(r => setTimeout(r, retry * 1500));

        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/tickers?include_exchange_logo=true`);

        if (res.status === 429) {
          if (retry < 2) return fetchTickers(retry + 1);
          throw new Error("Rate limit na API de mercados. Tente novamente.");
        }
        if (!res.ok) throw new Error(`Erro ${res.status} ao buscar mercados`);

        const data = await res.json();
        if (!aborted) {
          const list: Ticker[] = (data.tickers || []) as Ticker[];
          setTickers(list);
        }
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    fetchTickers();
    return () => {
      aborted = true;
    };
  }, [coinId]);

  const sorted = useMemo(() => {
    return [...tickers].sort((a, b) => (b.volume || 0) - (a.volume || 0));
  }, [tickers]);

  const rows = sorted.slice(0, visible);

  const formatPrice = (n: number) => {
    if (n < 1) return `$${n.toFixed(6)}`;
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const formatVol = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
    return `$${n.toLocaleString()}`;
  };
  const trustLabel = (t?: Ticker["trust_score"]) => t === "green" ? "High" : t === "yellow" ? "Medium" : t === "red" ? "Low" : "-";
  const trustClass = (t?: Ticker["trust_score"]) =>
    t === "green"
      ? "text-crypto-gain"
      : t === "yellow"
      ? "text-foreground"
      : t === "red"
      ? "text-crypto-loss"
      : "text-muted-foreground";

  if (loading) {
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-destructive text-sm">{error}</div>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card className="p-6">
        <div className="text-muted-foreground text-sm">Sem mercados disponíveis.</div>
      </Card>
    );
  }

  return (
    <Card className="p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Exchange</TableHead>
            <TableHead>Par</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Volume 24h</TableHead>
            <TableHead>Confiança</TableHead>
            <TableHead className="w-28">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t, i) => {
            const price = t.converted_last?.usd ?? t.last ?? 0;
            return (
              <TableRow key={`${t.market.identifier}-${t.base}-${t.target}-${i}`}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {t.market.logo ? (
                      <img src={t.market.logo} alt={`${t.market.name} logo`} className="w-5 h-5 rounded-sm" loading="lazy" />
                    ) : (
                      <div className="w-5 h-5 rounded-sm bg-muted" />
                    )}
                    <span className="text-foreground">{t.market.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{t.base}/{t.target}</TableCell>
                <TableCell className="text-right">{formatPrice(price)}</TableCell>
                <TableCell className="text-right">{formatVol(t.volume || 0)}</TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${trustClass(t.trust_score)}`}>{trustLabel(t.trust_score)}</span>
                </TableCell>
                <TableCell>
                  {t.trade_url ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={t.trade_url} target="_blank" rel="noopener noreferrer">Negociar</a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {visible < sorted.length && (
        <div className="p-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setVisible(v => v + 20)}>Mostrar mais</Button>
        </div>
      )}
    </Card>
  );
};
