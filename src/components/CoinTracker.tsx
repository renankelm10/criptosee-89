import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "./LoadingSpinner";
import { Star, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface TrackedCoin {
  id: string;
  coin_id: string;
  created_at: string;
}

interface AvailableCoin {
  id: string;
  name: string;
  symbol: string;
  image: string | null;
}

export const CoinTracker = () => {
  const [trackedCoins, setTrackedCoins] = useState<TrackedCoin[]>([]);
  const [availableCoins, setAvailableCoins] = useState<AvailableCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userPlan, setUserPlan] = useState<'free' | 'basic' | 'premium'>('free');

  useEffect(() => {
    checkUserPlan();
    fetchTrackedCoins();
    fetchAvailableCoins();
  }, []);

  const checkUserPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if (data) setUserPlan(data.plan);
  };

  const fetchTrackedCoins = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_tracked_coins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tracked coins:', error);
      toast.error('Erro ao carregar moedas rastreadas');
    } else {
      setTrackedCoins(data || []);
    }
    setLoading(false);
  };

  const fetchAvailableCoins = async () => {
    const { data, error } = await supabase
      .from('coins')
      .select('id, name, symbol, image')
      .order('market_cap_rank', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching available coins:', error);
    } else {
      setAvailableCoins(data || []);
    }
  };

  const trackCoin = async (coinId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_tracked_coins')
      .insert({
        user_id: user.id,
        coin_id: coinId
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Essa moeda já está sendo rastreada');
      } else {
        console.error('Error tracking coin:', error);
        toast.error('Erro ao adicionar moeda ao rastreamento');
      }
    } else {
      toast.success('Moeda adicionada ao rastreamento!');
      fetchTrackedCoins();
    }
  };

  const untrackCoin = async (id: string) => {
    const { error } = await supabase
      .from('user_tracked_coins')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error untracking coin:', error);
      toast.error('Erro ao remover moeda do rastreamento');
    } else {
      toast.success('Moeda removida do rastreamento');
      fetchTrackedCoins();
    }
  };

  const filteredCoins = availableCoins.filter(coin => 
    !trackedCoins.some(tc => tc.coin_id === coin.id) &&
    (coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (userPlan !== 'premium') {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rastreamento Personalizado
          </CardTitle>
          <CardDescription>
            Recurso exclusivo para usuários Premium
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Faça upgrade para Premium e escolha quais moedas você quer rastrear
            </p>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Upgrade para Premium
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

  return (
    <div className="space-y-6">
      {/* Moedas Rastreadas */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Moedas Rastreadas ({trackedCoins.length})
          </CardTitle>
          <CardDescription>
            Palpites serão gerados prioritariamente para essas moedas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trackedCoins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma moeda rastreada ainda. Adicione moedas abaixo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trackedCoins.map((tracked) => {
                const coin = availableCoins.find(c => c.id === tracked.coin_id);
                return (
                  <div
                    key={tracked.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {coin?.image && (
                        <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                      )}
                      <div>
                        <p className="font-medium">{coin?.name || tracked.coin_id}</p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {coin?.symbol || tracked.coin_id}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => untrackCoin(tracked.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adicionar Novas Moedas */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Moedas
          </CardTitle>
          <CardDescription>
            Escolha moedas para receber palpites prioritários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar moedas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredCoins.slice(0, 20).map((coin) => (
              <div
                key={coin.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {coin.image && (
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                  )}
                  <div>
                    <p className="font-medium">{coin.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{coin.symbol}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => trackCoin(coin.id)}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
