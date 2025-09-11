import { useState, useEffect, useCallback } from "react";
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Tipos para os dados, para garantir consistência
interface PriceData {
  price: number;
  volume: number;
  date: string;
}

interface CryptoPriceChartProps {
  cryptoId: string;
}

interface ChartState {
  loading: boolean;
  data: PriceData[] | null;
  error: string | null;
}

// CORREÇÃO: Tipo que representa UMA LINHA da sua tabela 'markets_history'
// Isso ajuda o TypeScript a entender o que esperar do Supabase.
type MarketHistoryRow = {
  created_at: string;
  price: number | null;
  volume_24h: number | null;
};

export const CryptoPriceChart = ({ cryptoId }: CryptoPriceChartProps) => {
  const [state, setState] = useState<ChartState>({
    loading: true,
    data: null,
    error: null,
  });

  const fetchPriceData = useCallback(async () => {
    setState({ loading: true, data: null, error: null });
    
    try {
      // ✅ BUSCANDO DA SUA TABELA `markets_history`
      const { data, error } = await supabase
        .from('markets_history')
        .select('created_at, price, volume_24h')
        .eq('coin_id', cryptoId)
        .order('created_at', { ascending: true });

      // CORREÇÃO: Tratamento de erro explícito. Se houver erro, a função para aqui.
      if (error) {
        throw new Error(`Erro no Supabase: ${error.message}`);
      }
      
      // CORREÇÃO: Se não houver erro, 'data' não pode ser nulo (pode ser um array vazio).
      if (!data) {
        // Isso é uma segurança extra, mas o `if (error)` acima já deve cobrir isso.
        throw new Error('Recebemos uma resposta vazia do banco de dados.');
      }
      
      if (data.length === 0) {
        setState({ loading: false, data: [], error: null });
        return; // Não é um erro, apenas não há dados.
      }

      // CORREÇÃO: Mapeamento seguro. O TypeScript agora sabe que 'data' é um array de 'MarketHistoryRow'.
      const formattedData: PriceData[] = data.map((point: MarketHistoryRow) => ({
        price: Number(point.price) || 0,
        volume: Number(point.volume_24h) || 0,
        date: new Date(point.created_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
      }));

      setState({ loading: false, data: formattedData, error: null });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';
      setState({ loading: false, data: null, error: errorMessage });
    }
  }, [cryptoId]);

  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);
  
  const formatPrice = (value: number) => {
    if (value < 1) return `$${value.toFixed(6)}`;
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const renderContent = () => {
    if (state.loading) {
        return <div className="h-[420px] flex items-center justify-center"><LoadingSpinner /></div>;
    }
    if (state.error) {
        return (
            <div className="h-[420px] flex items-center justify-center">
                <Card className="p-6 text-center bg-destructive/10 border-destructive/50">
                    <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-3" />
                    <h3 className="text-destructive font-semibold mb-2">Falha ao carregar gráfico</h3>
                    <p className="text-destructive/80 text-sm mb-4 max-w-xs">{state.error}</p>
                    <Button onClick={fetchPriceData} variant="destructive" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
                    </Button>
                </Card>
            </div>
        );
    }
    if (!state.data || state.data.length === 0) {
       return (
        <div className="h-[420px] flex items-center justify-center text-muted-foreground">
          O histórico desta moeda ainda não foi sincronizado.
        </div>
       );
    }
      
    return (
      <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={state.data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="left" hide domain={[0, 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} scale="linear" tickFormatter={formatPrice} />
                  <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      formatter={(value: number, name: string) => {
                          if (name === 'price') return [formatPrice(value), 'Preço'];
                          if (name === 'volume') return [`${(value/1e6).toFixed(2)}M`, 'Volume'];
                          return [value, name];
                      }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Bar yAxisId="left" dataKey="volume" fill="hsl(var(--muted-foreground)/0.3)" />
                  <Area yAxisId="right" type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={0.1} />
              </ComposedChart>
          </ResponsiveContainer>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Histórico de Preço (Últimos 30 dias)</h3>
      {renderContent()}
    </div>
  );
};