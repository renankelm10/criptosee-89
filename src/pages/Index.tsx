// src/pages/CryptoDetail.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from "lucide-react";
import { CryptoPriceChart } from "@/components/CryptoPriceChart";
import { CryptoMarketsTable } from "@/components/CryptoMarketsTable";
import { CryptoSocialFeed } from "@/components/CryptoSocialFeed";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

// Mova os tipos para um local centralizado se usar em mais lugares
interface CryptoDetailData {
  id: string;
  name: string;
  symbol: string;
  image: { large: string };
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_rank: number;
  };
  description: { en: string };
}

const CryptoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [crypto, setCrypto] = useState<CryptoDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isCancelled = false;

    const fetchDetails = async () => {
      if (!id) {
        setError("ID da criptomoeda não fornecido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Busca primeiro no Supabase para uma experiência mais rápida e como fallback
        const { data: market, error: supabaseError } = await supabase
          .from('latest_markets')
          .select('*, coin:coins(id, name, symbol, image)')
          .eq('coin_id', id)
          .single();

        if (supabaseError || !market || !market.coin) {
          console.warn('Não encontrado no Supabase, tentando CoinGecko...');
        } else if (!isCancelled) {
          // Constrói um objeto de dados inicial com o que temos
          const initialData: CryptoDetailData = {
            id: market.coin_id,
            name: market.coin.name,
            symbol: market.coin.symbol,
            image: { large: market.coin.image || '' },
            market_data: {
              current_price: { usd: market.price || 0 },
              price_change_percentage_24h: market.price_change_percentage_24h || 0,
              price_change_percentage_7d: market.price_change_percentage_7d || 0,
              price_change_percentage_30d: 0, // Dado não disponível no Supabase
              market_cap: { usd: market.market_cap || 0 },
              total_volume: { usd: market.volume_24h || 0 },
              market_cap_rank: market.market_cap_rank || 0,
            },
            description: { en: 'Carregando descrição...' },
          };
          setCrypto(initialData);
          setLoading(false); // Já mostra a página com os dados básicos
        }

        // 2. Tenta buscar os dados completos da CoinGecko para enriquecer a página
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false`);
        if (!response.ok) {
          if (response.status === 429) throw new Error("API do CoinGecko sobrecarregada. Alguns dados podem estar incompletos.");
          throw new Error("Não foi possível carregar detalhes adicionais do CoinGecko.");
        }
        
        const fullData = await response.json();
        if (!isCancelled) {
          setCrypto(fullData); // Substitui os dados básicos pelos completos
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido.";
        console.error("Falha ao buscar detalhes:", msg);
        if (!crypto) { // Se nem o fallback do Supabase funcionou
          setError(msg);
        } else { // Se o Supabase funcionou mas o CoinGecko falhou
          toast({ title: 'Aviso', description: msg, variant: 'default' });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchDetails();
    return () => { isCancelled = true; };
  }, [id, toast]);

  // Funções de formatação... (iguais às que você já tem)
  const formatPrice = (price: number) => price < 1 ? `$${price.toFixed(6)}` : `$${price.toLocaleString('en-US')}`;

  if (loading) return <LoadingSpinner />;

  if (error && !crypto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-destructive text-lg font-semibold mb-2">Erro</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        </Card>
      </div>
    );
  }

  if (!crypto) return null; // Não deve acontecer se a lógica estiver correta

  const isPositive24h = (crypto.market_data.price_change_percentage_24h ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${crypto.name} (${crypto.symbol.toUpperCase()}) Preço | Crypto.See`}
        description={`Veja o preço atual, gráficos e dados de mercado para ${crypto.name}.`}
      />
      {/* Restante do seu JSX da página de detalhes aqui, sem alterações... */}
      {/* ... */}
    </div>
  );
};

export default CryptoDetail;