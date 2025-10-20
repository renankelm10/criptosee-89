import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateRSI,
  detectVolumeSpike,
  calculateAverageVolume,
  classifyOpportunityLevel,
  determineAction,
  calculateVolatilityScore,
  determineTrend,
  determineMomentum
} from "../_shared/technicalIndicators.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const PLAN = 'premium';
  const TARGET_COUNT = 25;
  const EXPIRES_IN_MINUTES = 30;
  const PREP_TIME_MINUTES = 5; // Tempo de preparação antecipada

  try {
    console.log(`🚀 Starting ${PLAN.toUpperCase()} plan predictions generation`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verificar e adquirir lock
    const { data: lockCheck } = await supabase
      .from('generation_locks')
      .select('is_generating, locked_at')
      .eq('plan', PLAN)
      .single();

    // Se lock está preso há mais de 2 minutos, liberar
    if (lockCheck?.is_generating && lockCheck.locked_at) {
      const lockAge = Date.now() - new Date(lockCheck.locked_at).getTime();
      if (lockAge > 120000) {
        console.log('🔓 Releasing stuck lock');
        await supabase
          .from('generation_locks')
          .update({ is_generating: false })
          .eq('plan', PLAN);
      } else {
        console.log('⚠️ Generation already in progress, skipping');
        return new Response(JSON.stringify({ 
          skipped: true, 
          reason: 'already_generating',
          locked_for_ms: lockAge 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Adquirir lock
    await supabase
      .from('generation_locks')
      .update({
        is_generating: true,
        locked_at: new Date().toISOString()
      })
      .eq('plan', PLAN);

    try {
      // 2. Verificar quantos palpites válidos já existem
      // Permitir regeneração se palpites vão expirar em menos de 10 minutos
      const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      const { count: existingCount } = await supabase
        .from('ai_predictions')
        .select('*', { count: 'exact', head: true })
        .eq('target_plan', PLAN)
        .gte('expires_at', tenMinutesFromNow);

      if (existingCount && existingCount >= TARGET_COUNT) {
        console.log(`⚠️ Already have ${existingCount} valid predictions, skipping generation`);
        
        return new Response(JSON.stringify({
          success: true,
          skipped: true,
          reason: 'predictions_already_exist',
          count: existingCount,
          plan: PLAN
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 3. Deletar predições antigas/expiradas do plano
      const { error: deleteError } = await supabase
        .from('ai_predictions')
        .delete()
        .eq('target_plan', PLAN);

      if (deleteError) {
        console.error('Error deleting old predictions:', deleteError);
      } else {
        console.log(`✅ Deleted old ${PLAN.toUpperCase()} predictions`);
      }

      // 4. Buscar TOP 50 moedas (mix de estáveis + voláteis)
      const { data: markets, error: marketsError } = await supabase
        .from('latest_markets')
        .select(`
          *,
          coins!inner(id, symbol, name, image)
        `)
        .order('market_cap_rank', { ascending: true })
        .limit(50);

      if (marketsError) throw marketsError;
      if (!markets || markets.length === 0) {
        throw new Error('No markets data available');
      }

      // Ordenar por volatilidade (abs price change 24h) e pegar mix
      const sortedByVolatility = [...markets].sort((a, b) => 
        Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0)
      );

      // Pegar as 20 mais estáveis (primeiras do ranking) + 10 mais voláteis
      const stableCoins = markets.slice(0, 20);
      const volatileCoins = sortedByVolatility.slice(0, 10);
      
      // Combinar e remover duplicatas
      const selectedMarkets = [...stableCoins];
      volatileCoins.forEach(coin => {
        if (!selectedMarkets.find(m => (m as any).coins.id === (coin as any).coins.id)) {
          selectedMarkets.push(coin);
        }
      });

      console.log(`📊 Fetched ${selectedMarkets.length} coins for ${PLAN.toUpperCase()} plan (${stableCoins.length} stable + ${volatileCoins.length} volatile)`);

      const predictions = [];

      // 5. Gerar TARGET_COUNT palpites com indicadores técnicos reais
      for (let i = 0; i < Math.min(TARGET_COUNT, selectedMarkets.length); i++) {
        const market = selectedMarkets[i];
        const coin = (market as any).coins;

        // Buscar histórico de preços para calcular RSI
        const { data: historyData } = await supabase
          .from('markets_history')
          .select('current_price, timestamp, total_volume')
          .eq('coin_id', coin.id)
          .order('timestamp', { ascending: false })
          .limit(14);

        // Calcular indicadores técnicos reais
        const rsi = calculateRSI(historyData || []);
        const avgVolume = calculateAverageVolume(historyData || []);
        const volumeSpike = detectVolumeSpike(market.total_volume, avgVolume);
        const volatility = calculateVolatilityScore(
          market.price_change_percentage_24h || 0,
          market.price_change_percentage_7d || 0
        );
        const trend = determineTrend(
          market.price_change_percentage_24h || 0,
          market.price_change_percentage_7d || 0
        );
        const momentum = determineMomentum(
          market.price_change_percentage_24h || 0,
          market.price_change_percentage_7d || 0,
          volumeSpike
        );

        // Determinar action baseado em dados reais
        const suggestedAction = determineAction(
          rsi,
          market.price_change_percentage_7d || 0,
          'premium'
        );

        const prompt = `Você é um analista de criptomoedas PREMIUM. Analise a seguinte moeda e forneça uma previsão COMPLETA E PROFUNDA para as próximas 24h:

CONTEXTO TÉCNICO REAL CALCULADO:
- RSI (14): ${rsi.toFixed(2)} ${rsi < 30 ? '🟢 OVERSOLD - FORTE OPORTUNIDADE DE COMPRA!' : rsi > 70 ? '🔴 OVERBOUGHT - RISCO DE CORREÇÃO!' : '⚪ NEUTRO'}
- Volume 24h: $${market.total_volume?.toLocaleString()} ${volumeSpike ? '⚡ SPIKE DETECTADO (+50% do normal)!' : ''}
- Volatilidade: ${volatility}
- Tendência 7d: ${trend}
- Momentum: ${momentum}
- Mudança 7d: ${market.price_change_percentage_7d?.toFixed(2)}% ${Math.abs(market.price_change_percentage_7d || 0) > 15 ? '⚠️ MOVIMENTO EXTREMO!' : ''}

DADOS BÁSICOS:
- Moeda: ${coin.name} (${coin.symbol})
- Preço Atual: $${market.current_price}
- Market Cap: $${market.market_cap?.toLocaleString()}

REGRAS CRÍTICAS:
1. **AÇÃO SUGERIDA PELOS INDICADORES: "${suggestedAction}"** - Use esta ação a menos que tenha uma razão técnica forte para mudar
2. Se RSI < 30: OBRIGATÓRIO usar action "buy" (oportunidade de compra)
3. Se RSI > 70: OBRIGATÓRIO usar action "sell" (risco de correção)
4. Se volume spike + momentum positivo: PRIORIZAR action "buy"
5. confidenceLevel: 75-95% para análises premium
6. riskScore: 1-10 baseado em market cap e volatilidade
7. reasoning: MENCIONAR os indicadores técnicos calculados (RSI, volume, tendência)

Com base nesses dados, forneça uma análise em formato JSON:
{
  "action": "buy" | "sell" | "hold" | "watch",
  "confidenceLevel": 70-95,
  "reasoning": "string com análise técnica profunda",
  "indicators": {
    "technical": "análise técnica detalhada",
    "sentiment": "sentimento do mercado",
    "risk": "análise de risco completa"
  },
  "priceProjection": número (projeção precisa para 24h),
  "timeframe": "24h",
  "riskScore": 1-10 (baseado na volatilidade e posição no mercado)
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
                  content: 'Você é um analista de criptomoedas premium que fornece análises avançadas e detalhadas para investidores experientes.'
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

          // Classificar nível de oportunidade
          const opportunityLevel = classifyOpportunityLevel(
            analysis.action,
            rsi,
            volumeSpike,
            market.price_change_percentage_7d || 0
          );

          const prediction = {
            coin_id: coin.id,
            action: analysis.action,
            confidence_level: analysis.confidenceLevel,
            reasoning: analysis.reasoning,
            indicators: analysis.indicators,
            price_projection: analysis.priceProjection,
            timeframe: '24h',
            risk_score: analysis.riskScore || 5,
            target_plan: PLAN,
            opportunity_level: opportunityLevel,
            technical_indicators: {
              rsi: rsi,
              volumeSpike: volumeSpike,
              volatility: volatility,
              trend: trend,
              momentum: momentum,
              priceChange24h: market.price_change_percentage_24h,
              priceChange7d: market.price_change_percentage_7d
            },
            // Adicionar 5 minutos ao tempo de expiração para compensar a geração antecipada
            expires_at: new Date(Date.now() + (EXPIRES_IN_MINUTES + PREP_TIME_MINUTES) * 60 * 1000).toISOString(),
          };

          const { error: insertError } = await supabase
            .from('ai_predictions')
            .insert(prediction);

          if (insertError) {
            console.error(`Failed to insert prediction for ${coin.symbol}:`, insertError);
          } else {
            console.log(`✅ Prediction created for ${coin.symbol}: ${analysis.action} (${analysis.confidenceLevel}%) [${opportunityLevel.toUpperCase()}] RSI:${rsi.toFixed(0)}`);
            predictions.push(prediction);
          }
        } catch (error) {
          console.error(`Error processing ${coin.symbol}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`
📊 ${PLAN.toUpperCase()} Plan Generation Summary:
  - Target count: ${TARGET_COUNT}
  - Generated predictions: ${predictions.length}
  - Duration: ${duration}ms
  - Expires in: ${EXPIRES_IN_MINUTES} minutes
      `);

      return new Response(JSON.stringify({
        success: true,
        count: predictions.length,
        plan: PLAN,
        expires_in_minutes: EXPIRES_IN_MINUTES,
        duration_ms: duration
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } finally {
      // SEMPRE liberar lock, mesmo em caso de erro
      await supabase
        .from('generation_locks')
        .update({
          is_generating: false,
          last_generated_at: new Date().toISOString()
        })
        .eq('plan', PLAN);
      
      console.log('🔓 Lock released');
    }

  } catch (error) {
    console.error(`Error in generate-predictions-${PLAN}:`, error);
    return new Response(JSON.stringify({
      error: error.message,
      plan: PLAN
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
