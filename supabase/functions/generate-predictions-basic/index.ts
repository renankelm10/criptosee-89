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
    console.log('🚀 Starting BASIC plan predictions generation');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Deletar predições antigas do plano BASIC
    const { error: deleteError } = await supabase
      .from('ai_predictions')
      .delete()
      .eq('target_plan', 'basic');

    if (deleteError) {
      console.error('Error deleting old predictions:', deleteError);
    } else {
      console.log('✅ Deleted old BASIC predictions');
    }

    // Buscar TOP 20-30 moedas estabelecidas
    const { data: markets, error: marketsError } = await supabase
      .from('latest_markets')
      .select(`
        *,
        coins!inner(id, symbol, name, image)
      `)
      .order('market_cap_rank', { ascending: true })
      .range(10, 30)
      .limit(20);

    if (marketsError) throw marketsError;
    if (!markets || markets.length === 0) {
      throw new Error('No markets data available');
    }

    console.log(`Fetched ${markets.length} established coins for BASIC plan`);

    const predictions = [];

    // Gerar exatamente 10 palpites de risco médio
    for (let i = 0; i < Math.min(10, markets.length); i++) {
      const market = markets[i];
      const coin = (market as any).coins;

      const prompt = `Você é um analista de criptomoedas. Analise a seguinte moeda e forneça uma previsão EQUILIBRADA para as próximas 24h:

Moeda: ${coin.name} (${coin.symbol})
Preço Atual: $${market.current_price}
Market Cap: $${market.market_cap}
Volume 24h: $${market.total_volume}
Mudança 1h: ${market.price_change_percentage_1h?.toFixed(2)}%
Mudança 24h: ${market.price_change_percentage_24h?.toFixed(2)}%
Mudança 7d: ${market.price_change_percentage_7d?.toFixed(2)}%
ATH: $${market.ath} (${market.ath_change_percentage?.toFixed(2)}%)
ATL: $${market.atl} (${market.atl_change_percentage?.toFixed(2)}%)

IMPORTANTE: Esta análise é para o plano BASIC:
- Pode usar "buy", "sell", "hold", "watch"
- riskScore DEVE ser entre 2-7 (baixo a médio risco)
- confidenceLevel entre 65-85%
- reasoning deve ser equilibrado entre oportunidade e risco

Com base nesses dados, forneça uma análise em formato JSON:
{
  "action": "buy" | "sell" | "hold" | "watch",
  "confidenceLevel": 65-85,
  "reasoning": "string explicando a análise equilibrada",
  "indicators": {
    "technical": "análise técnica",
    "sentiment": "sentimento do mercado",
    "risk": "análise de risco"
  },
  "priceProjection": número (projeção para 24h),
  "timeframe": "24h",
  "riskScore": 2-7 (moedas estabelecidas = 2-5, mid-cap = 4-7)
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
                content: 'Você é um analista de criptomoedas que fornece análises equilibradas para investidores intermediários no plano básico.'
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

        // Garantir que o riskScore seja médio (2-7)
        const riskScore = Math.min(7, Math.max(2, analysis.riskScore || 5));

        const prediction = {
          coin_id: coin.id,
          action: analysis.action,
          confidence_level: analysis.confidenceLevel,
          reasoning: analysis.reasoning,
          indicators: analysis.indicators,
          price_projection: analysis.priceProjection,
          timeframe: '24h',
          risk_score: riskScore,
          target_plan: 'basic',
          expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hora
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

    console.log(`✅ Generated ${predictions.length} predictions for BASIC plan`);

    return new Response(JSON.stringify({
      success: true,
      count: predictions.length,
      plan: 'basic',
      expires_in_hours: 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-predictions-basic:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
