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
  determineMomentum,
  calculateEMA,
  calculateMACD,
  calculateBollingerBands,
  detectSupportResistance,
  calculateCorrelation
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

      // 4. ESTRATÉGIA FOCADA EM VOLATILIDADE - Ampliar busca para TOP 100
      const { data: allMarkets } = await supabase
        .from('latest_markets')
        .select(`
          *,
          coins!inner(id, symbol, name, image)
        `)
        .order('market_cap_rank', { ascending: true })
        .limit(100);

      if (!allMarkets || allMarkets.length === 0) {
        throw new Error('No markets data available');
      }

      // 1. TOP 10 Blue Chips (BTC, ETH, BNB...)
      const blueChips = allMarkets.slice(0, 10);

      // 2. TOP 8 Moedas MAIS VOLÁTEIS (maior mudança absoluta 24h)
      const highVolatility = [...allMarkets]
        .sort((a, b) => 
          Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0)
        )
        .slice(0, 8);

      // 3. TOP 5 Ganhadoras (mudança 7d > 20%)
      const topGainers = [...allMarkets]
        .filter(m => (m.price_change_percentage_7d || 0) > 20)
        .sort((a, b) => (b.price_change_percentage_7d || 0) - (a.price_change_percentage_7d || 0))
        .slice(0, 5);

      // 4. Ganhadoras EXTREMAS (mudança 7d > 50%)
      const { data: extremeGainers } = await supabase
        .from('latest_markets')
        .select(`
          *,
          coins!inner(id, symbol, name, image)
        `)
        .gte('price_change_percentage_7d', 50)
        .order('price_change_percentage_7d', { ascending: false })
        .limit(3);

      // Combinar tudo e remover duplicatas
      const combinedMarkets = [
        ...blueChips,
        ...highVolatility,
        ...topGainers,
        ...(extremeGainers || [])
      ];

      const selectedMarkets = combinedMarkets.filter((market, index, self) =>
        index === self.findIndex(m => (m as any).coin_id === (market as any).coin_id)
      );

      console.log(`📊 Fetched ${selectedMarkets.length} markets (Blue Chips: ${blueChips.length}, High Volatility: ${highVolatility.length}, Gainers: ${topGainers.length}, Extreme: ${extremeGainers?.length || 0})`);

      // ========================================
      // BUSCAR DADOS DO BITCOIN (CONTEXTO GERAL)
      // ========================================
      const { data: btcData } = await supabase
        .from('latest_markets')
        .select('*')
        .eq('coin_id', 'bitcoin')
        .single();

      const { data: btcHistory } = await supabase
        .from('markets_history')
        .select('current_price, timestamp')
        .eq('coin_id', 'bitcoin')
        .order('timestamp', { ascending: false })
        .limit(100);

      const btcPrices = (btcHistory || []).map(h => h.current_price);
      const btcRSI = calculateRSI(btcHistory || []);
      const btcTrend = determineTrend(
        btcData?.price_change_percentage_24h || 0,
        btcData?.price_change_percentage_7d || 0
      );

      console.log(`Bitcoin context: RSI ${btcRSI.toFixed(2)}, Trend ${btcTrend}, 24h ${btcData?.price_change_percentage_24h?.toFixed(2)}%`);

      const predictions = [];

      // 5. Gerar TARGET_COUNT palpites com indicadores técnicos AVANÇADOS
      for (let i = 0; i < Math.min(TARGET_COUNT, selectedMarkets.length); i++) {
        const market = selectedMarkets[i];
        const coin = (market as any).coins;

        // Buscar histórico COMPLETO (100 períodos para MACD e Bollinger)
        const { data: historyData } = await supabase
          .from('markets_history')
          .select('current_price, timestamp, total_volume')
          .eq('coin_id', coin.id)
          .order('timestamp', { ascending: false })
          .limit(100);

        // ========================================
        // CALCULAR INDICADORES TÉCNICOS AVANÇADOS
        // ========================================
        const prices = (historyData || []).map(h => h.current_price);
        
        // Indicadores básicos
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

        // Indicadores avançados
        const macd = calculateMACD(prices);
        const bollinger = calculateBollingerBands(prices);
        const ema50 = calculateEMA(prices, 50);
        const supportResistance = detectSupportResistance(prices, market.current_price || 0);
        
        // Correlação com Bitcoin
        const coinPrices = prices.slice(0, Math.min(14, prices.length));
        const btcPricesSliced = btcPrices.slice(0, Math.min(14, btcPrices.length));
        const correlation = calculateCorrelation(coinPrices, btcPricesSliced);

        // Buscar sentimento (se disponível)
        const { data: sentimentData } = await supabase
          .from('coin_sentiment')
          .select('*')
          .eq('coin_id', coin.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        const sentiment = sentimentData || {
          sentiment_score: 0,
          positive_mentions: 0,
          negative_mentions: 0,
          neutral_mentions: 0,
          total_mentions: 0,
          recent_news: []
        };

        // Determinar action baseado em dados reais
        const suggestedAction = determineAction(
          rsi,
          market.price_change_percentage_7d || 0,
          'premium'
        );

        console.log(`${coin.symbol}: RSI=${rsi.toFixed(2)}, MACD=${macd.histogram.toFixed(2)}, Correlation=${(correlation * 100).toFixed(0)}%, Sentiment=${(sentiment.sentiment_score || 0).toFixed(2)}`);

        // Preparar contexto enriquecido
        const bollingerPosition = market.current_price! > bollinger.upper 
          ? '🔴 ACIMA banda superior (overbought)' 
          : market.current_price! < bollinger.lower 
          ? '🟢 ABAIXO banda inferior (oversold)' 
          : '⚪ Dentro das bandas';

        const emaTrend = market.current_price! > ema50 ? '🟢 Acima EMA50 (tendência alta)' : '🔴 Abaixo EMA50 (tendência baixa)';
        const macdSignal = macd.histogram > 0 ? '🟢 Bullish' : '🔴 Bearish';
        const correlationText = correlation > 0.7 ? '⚠️ ALTA correlação - segue Bitcoin' : correlation < 0.3 ? '✅ BAIXA correlação - movimento independente' : 'MÉDIA correlação';
        const sentimentText = (sentiment.sentiment_score || 0) > 0.3 ? '🟢 POSITIVO' : (sentiment.sentiment_score || 0) < -0.3 ? '🔴 NEGATIVO' : '⚪ NEUTRO';
        const btcContextWarning = btcTrend.includes('Baixa') && correlation > 0.7 ? '\n⚠️ AVISO: Bitcoin em queda forte + alta correlação = risco aumentado\n' : '';

        const prompt = `Você é um analista quantitativo de criptomoedas. Analise ${coin.name} (${coin.symbol}) para as próximas 24h.

${Math.abs(market.price_change_percentage_7d || 0) > 50 ? `⚠️ ATENÇÃO: ${market.price_change_percentage_7d?.toFixed(0)}% em 7 dias - EXTREMA VOLATILIDADE!` : ''}${btcContextWarning}
═══════════════════════════════════════════
📊 1. INDICADORES TÉCNICOS
═══════════════════════════════════════════
• RSI (14): ${rsi.toFixed(2)} ${rsi < 30 ? '🟢 OVERSOLD' : rsi > 70 ? '🔴 OVERBOUGHT' : '⚪ NEUTRO'}
• MACD: ${macdSignal} (Histograma: ${macd.histogram.toFixed(2)})
• Bollinger: ${bollingerPosition}
• EMA 50: $${ema50.toFixed(2)} ${emaTrend}
• Suporte: $${supportResistance.support.toFixed(2)} (${supportResistance.distanceToSupport.toFixed(1)}%)${supportResistance.nearSupport ? ' ⚠️ PRÓXIMO' : ''}
• Resistência: $${supportResistance.resistance.toFixed(2)} (${supportResistance.distanceToResistance.toFixed(1)}%)${supportResistance.nearResistance ? ' ⚠️ PRÓXIMO' : ''}
• Volume 24h: $${market.total_volume?.toLocaleString()} ${volumeSpike ? '⚡ SPIKE' : ''}
• Volatilidade: ${volatility}
• Tendência: ${trend}
• Momentum: ${momentum}

═══════════════════════════════════════════
🌐 2. CONTEXTO BITCOIN
═══════════════════════════════════════════
• Bitcoin RSI: ${btcRSI.toFixed(2)}
• Bitcoin Tendência: ${btcTrend}
• Correlação: ${(correlation * 100).toFixed(0)}% ${correlationText}

═══════════════════════════════════════════
💬 3. SENTIMENTO
═══════════════════════════════════════════
• Sentimento: ${sentimentText} (${(sentiment.sentiment_score || 0).toFixed(2)})
• Menções: ${sentiment.total_mentions || 0} (${sentiment.positive_mentions || 0}+ | ${sentiment.negative_mentions || 0}-)

═══════════════════════════════════════════
⚙️ REGRAS DE DECISÃO
═══════════════════════════════════════════
• RSI < 30 + próximo suporte + sentiment positivo → BUY
• RSI > 70 + próximo resistência + sentiment negativo → SELL
• BTC queda + correlação alta → WATCH
• Volume spike + MACD bullish + sentiment positivo → BUY
• Ação sugerida: "${suggestedAction}"

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
              priceChange7d: market.price_change_percentage_7d,
              macd: macd.histogram,
              ema50,
              bollinger_upper: bollinger.upper,
              bollinger_lower: bollinger.lower
            },
            // Novos campos avançados
            bitcoin_correlation: correlation,
            sentiment_score: sentiment.sentiment_score || 0,
            macd_signal: macdSignal,
            bollinger_position: bollingerPosition,
            ema_trend: emaTrend,
            near_support: supportResistance.nearSupport,
            near_resistance: supportResistance.nearResistance,
            support_price: supportResistance.support,
            resistance_price: supportResistance.resistance,
            volume_analysis: volumeSpike ? 'spike_detected' : 'normal',
            // Adicionar 5 minutos ao tempo de expiração
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
