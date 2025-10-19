import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting FREE plan predictions generation');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Deletar predições antigas do plano FREE
    const { error: deleteError } = await supabase
      .from('ai_predictions')
      .delete()
      .eq('target_plan', 'free');

    if (deleteError) {
      console.error('Error deleting old predictions:', deleteError);
    } else {
      console.log('✅ Deleted old FREE predictions');
    }

    // Buscar TOP 10 moedas mais estáveis (maior market cap)
    const { data: markets, error: marketsError } = await supabase
      .from('latest_markets')
      .select(`
        *,
        coins!inner(id, symbol, name, image)
      `)
      .order('market_cap_rank', { ascending: true })
      .limit(10);

    if (marketsError) throw marketsError;
    if (!markets || markets.length === 0) {
      throw new Error('No markets data available');
    }

    console.log(`Fetched ${markets.length} top stable coins for FREE plan`);

    const predictions = [];

    // Gerar exatamente 5 palpites de baixo risco
    for (let i = 0; i < Math.min(5, markets.length); i++) {
      const market = markets[i];
      const coin = (market as any).coins;

      const prompt = `Você é um analista de criptomoedas especializado. Analise a seguinte moeda e forneça uma previsão SEGURA E CONSERVADORA para as próximas 24h:

Moeda: ${coin.name} (${coin.symbol})
Preço Atual: $${market.current_price}
Market Cap: $${market.market_cap}
Volume 24h: $${market.total_volume}
Mudança 1h: ${market.price_change_percentage_1h?.toFixed(2)}%
Mudança 24h: ${market.price_change_percentage_24h?.toFixed(2)}%
Mudança 7d: ${market.price_change_percentage_7d?.toFixed(2)}%
ATH: $${market.ath} (${market.ath_change_percentage?.toFixed(2)}%)
ATL: $${market.atl} (${market.atl_change_percentage?.toFixed(2)}%)

IMPORTANTE: Esta análise é para o plano GRATUITO, portanto DEVE SER CONSERVADORA:
- Priorize ações "hold" ou "watch" (evite "buy" e "sell" agressivos)
- riskScore DEVE ser entre 1-3 (muito baixo risco)
- confidenceLevel entre 60-80% (realista, não otimista demais)
- reasoning deve focar em estabilidade e segurança

Com base nesses dados, forneça uma análise em formato JSON:
{
  "action": "hold" | "watch",
  "confidenceLevel": 60-80,
  "reasoning": "string explicando a análise conservadora",
  "indicators": {
    "technical": "análise técnica focada em estabilidade",
    "sentiment": "sentimento do mercado",
    "risk": "análise de risco"
  },
  "priceProjection": número (projeção conservadora para 24h),
  "timeframe": "24h",
  "riskScore": 1-3 (APENAS baixo risco para moedas consolidadas)
}

CRÍTICO: Retorne APENAS o JSON válido, sem texto adicional.`;

      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Você é um analista de criptomoedas conservador que fornece análises seguras para investidores iniciantes no plano gratuito.'
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }),
        });

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error(`OpenAI API error for ${coin.symbol}:`, errorText);
          continue;
        }

        const aiData = await openaiResponse.json();
        const content = aiData.choices[0]?.message?.content;

        if (!content) {
          console.error(`No content from AI for ${coin.symbol}`);
          continue;
        }

        let analysis;
        try {
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

        // Garantir que o riskScore seja baixo (1-3)
        const riskScore = Math.min(3, Math.max(1, analysis.riskScore || 2));

        const prediction = {
          coin_id: coin.id,
          action: analysis.action,
          confidence_level: analysis.confidenceLevel,
          reasoning: analysis.reasoning,
          indicators: analysis.indicators,
          price_projection: analysis.priceProjection,
          timeframe: '24h',
          risk_score: riskScore,
          target_plan: 'free',
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
        };

        const { error: insertError } = await supabase
          .from('ai_predictions')
          .insert(prediction);

        if (insertError) {
          console.error(`Failed to insert prediction for ${coin.symbol}:`, insertError);
        } else {
          console.log(`✅ Prediction created for ${coin.symbol}: ${analysis.action} (${analysis.confidenceLevel}%)`);
          predictions.push(prediction);
        }
      } catch (error) {
        console.error(`Error processing ${coin.symbol}:`, error);
      }
    }

    console.log(`✅ Generated ${predictions.length} predictions for FREE plan`);

    return new Response(JSON.stringify({
      success: true,
      count: predictions.length,
      plan: 'free',
      expires_in_hours: 2
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-predictions-free:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
