import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusItem {
  description: string;
  category?: string;
  created_at: string;
  user?: string | null;
  project?: {
    name?: string | null;
  };
  article_url?: string | null;
}

interface CryptoSocialFeedProps {
  coinId: string;
}

export const CryptoSocialFeed = ({ coinId }: CryptoSocialFeedProps) => {
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;

    const fetchUpdates = async (retry = 0) => {
      try {
        setLoading(true);
        setError(null);
        if (retry > 0) await new Promise(r => setTimeout(r, retry * 1500));

        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/status_updates?per_page=20&page=1`);
        if (res.status === 429) {
          if (retry < 2) return fetchUpdates(retry + 1);
          throw new Error("Rate limit na API de atualizações. Tente novamente.");
        }
        if (!res.ok) throw new Error(`Erro ${res.status} ao buscar atualizações`);
        const data = await res.json();
        if (!aborted) setItems((data.status_updates || []) as StatusItem[]);
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    fetchUpdates();
    return () => { aborted = true; };
  }, [coinId]);

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
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

  if (!items.length) {
    return (
      <Card className="p-6">
        <div className="text-muted-foreground text-sm">Sem atualizações recentes.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <Card key={idx} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                {new Date(it.created_at).toLocaleString()}
                {it.category ? ` • ${it.category}` : ""}
              </div>
              <div className="text-foreground leading-relaxed">
                {it.description}
              </div>
            </div>
            {it.article_url && (
              <a
                href={it.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                Ler mais
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
