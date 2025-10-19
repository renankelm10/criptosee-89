import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter userId do header de autorização se houver
    const authHeader = req.headers.get('authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const tempClient = createClient(supabaseUrl!, supabaseKey!);
      
      const { data: { user } } = await tempClient.auth.getUser(token);
      userId = user?.id;
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verificar se o usuário tem moedas rastreadas (Premium)
    let trackedCoins: string[] = [];
    if (userId) {
      const { data: tracked } = await supabase
        .from('user_tracked_coins')
        .select('coin_id')
        .eq('user_id', userId);
      
      trackedCoins = tracked?.map(t => t.coin_id) || [];
      console.log(`User ${userId} is tracking ${trackedCoins.length} coins`);
    }

    // Buscar dados de mercado mais recentes
    const { data: markets, error: marketsError } = await supabase
      .from('latest_markets')
      .select('*, coins!inner(id, name, symbol)')
      .order('market_cap', { ascending: false })
      .limit(50);

    if (marketsError) {
      console.error('Error fetching markets:', marketsError);
      throw marketsError;
    }

    console.log(`Fetched ${markets?.length || 0} markets for analysis`);

    // Priorizar moedas rastreadas primeiro
    let selectedCoins = [];
    
    if (trackedCoins.length > 0) {
      // Adicionar moedas rastreadas primeiro (até 10)
      const trackedMarkets = markets?.filter(m => trackedCoins.includes(m.coin_id)) || [];
      selectedCoins = trackedMarkets.slice(0, 10);
      console.log(`Selected ${selectedCoins.length} tracked coins for analysis`);
    }
    
    // Completar com moedas por volatilidade (target: 20-30 total)
    const targetCount = Math.floor(Math.random() * 11) + 20; // 20-30
    const remaining = targetCount - selectedCoins.length;
    if (remaining > 0) {
      const sortedByVolatility = [...(markets || [])]
        .filter(m => !selectedCoins.some(s => s.coin_id === m.coin_id))
        .sort((a, b) => 
          Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0)
        )
        .slice(0, remaining);
      
      selectedCoins = [...selectedCoins, ...sortedByVolatility];
      console.log(`Added ${sortedByVolatility.length} volatile coins, total: ${selectedCoins.length}`);
    }

    const predictions = [];

    for (const market of selectedCoins) {
      const coin = market.coins;
      if (!coin) continue;

      // Preparar contexto para a IA
      const context = `
Analise a criptomoeda ${coin.name} (${coin.symbol.toUpperCase()}) com os seguintes dados:

- Preço atual: $${market.current_price}
- Variação 24h: ${market.price_change_percentage_24h?.toFixed(2)}%
- Variação 7d: ${market.price_change_percentage_7d?.toFixed(2)}%
- Variação 30d: ${market.price_change_percentage_30d?.toFixed(2)}%
- Volume 24h: $${market.total_volume?.toLocaleString()}
- Market Cap: $${market.market_cap?.toLocaleString()}
- Market Cap Rank: ${market.market_cap_rank}
- ATH: $${market.ath} (${market.ath_change_percentage?.toFixed(2)}%)
- ATL: $${market.atl} (${market.atl_change_percentage?.toFixed(2)}%)

IMPORTANTE SOBRE RISK SCORE - Use distribuição balanceada:
- Moedas TOP 10 consolidadas (BTC, ETH, BNB, USDT, SOL): riskScore 1-3
- Moedas TOP 20-50 estabelecidas: riskScore 2-5
- Moedas de média cap com boa liquidez: riskScore 4-7
- Moedas voláteis ou memecoins: riskScore 6-10
- Considere: Baixa volatilidade = Baixo risco, Alta volatilidade = Alto risco

Com base nesses dados, forneça uma análise em formato JSON com a seguinte estrutura:
{
  "action": "buy" | "sell" | "hold" | "watch" | "alert",
  "confidence": 0-100,
  "reasoning": "explicação clara e concisa em português",
  "indicators": {
    "volatility": "high" | "medium" | "low",
    "trend": "bullish" | "bearish" | "neutral",
    "momentum": "strong" | "moderate" | "weak"
  },
  "priceProjection": número (projeção de preço para próximas 24h),
  "timeframe": "24h",
  "riskScore": 1-10 (SEJA REALISTA: top 10 = 1-3, mid cap = 4-7, voláteis = 7-10)
}

IMPORTANTE: Retorne APENAS o JSON válido, sem texto adicional.`;

      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-mini-2025-04-14',
            messages: [
              {
                role: 'system',
                content: 'Você é um analista de criptomoedas experiente. Sempre retorne análises em formato JSON válido.'
              },
              {
                role: 'user',
                content: context
              }
            ],
            max_completion_tokens: 500,
            response_format: { type: "json_object" }
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error for ${coin.symbol}:`, aiResponse.status, errorText);
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        if (!content) {
          console.error(`No content in AI response for ${coin.symbol}`);
          continue;
        }

        // Extrair JSON do conteúdo
        let analysis;
        try {
          // Tentar encontrar JSON no texto
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          } else {
            analysis = JSON.parse(content);
          }
        } catch (parseError) {
          console.error(`Failed to parse AI response for ${coin.symbol}:`, content);
          continue;
        }

        // Inserir palpite no banco
        const { error: insertError } = await supabase
          .from('ai_predictions')
          .insert({
            coin_id: coin.id,
            action: analysis.action,
            confidence_level: analysis.confidence,
            reasoning: analysis.reasoning,
            indicators: analysis.indicators,
            price_projection: analysis.priceProjection,
            timeframe: analysis.timeframe || '24h',
            risk_score: analysis.riskScore || 5,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });

        if (insertError) {
          console.error(`Error inserting prediction for ${coin.symbol}:`, insertError);
        } else {
          predictions.push({
            coin: coin.symbol,
            action: analysis.action,
            confidence: analysis.confidence
          });
          console.log(`✅ Prediction created for ${coin.symbol}: ${analysis.action} (${analysis.confidence}%)`);
        }

      } catch (error) {
        console.error(`Error processing ${coin.symbol}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        predictionsGenerated: predictions.length,
        predictions 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-ai-predictions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
