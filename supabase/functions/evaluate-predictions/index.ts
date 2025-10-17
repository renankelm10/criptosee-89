import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting prediction evaluation...');

    // Buscar predições que expiraram mas ainda não foram avaliadas
    const { data: predictions, error: fetchError } = await supabase
      .from('ai_predictions')
      .select('*')
      .is('actual_outcome', null)
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching predictions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${predictions?.length || 0} predictions to evaluate`);

    if (!predictions || predictions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No predictions to evaluate', evaluated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let evaluatedCount = 0;

    for (const prediction of predictions) {
      try {
        // Buscar dados de mercado históricos para comparação
        const createdAt = new Date(prediction.created_at);
        const expiresAt = new Date(prediction.expires_at);
        
        const { data: historyData, error: historyError } = await supabase
          .from('markets_history')
          .select('current_price, price_change_percentage_24h')
          .eq('coin_id', prediction.coin_id)
          .gte('timestamp', createdAt.toISOString())
          .lte('timestamp', expiresAt.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);

        if (historyError || !historyData || historyData.length === 0) {
          console.log(`No historical data for prediction ${prediction.id}`);
          continue;
        }

        const actualData = historyData[0];
        let actualOutcome = '';
        let performanceScore = 0;

        // Avaliar baseado na ação recomendada
        switch (prediction.action) {
          case 'buy':
            // Se recomendou compra, esperava que o preço subisse
            if (actualData.price_change_percentage_24h > 0) {
              actualOutcome = `Preço subiu ${actualData.price_change_percentage_24h.toFixed(2)}%`;
              performanceScore = Math.min(100, 50 + (actualData.price_change_percentage_24h * 5));
            } else {
              actualOutcome = `Preço caiu ${Math.abs(actualData.price_change_percentage_24h).toFixed(2)}%`;
              performanceScore = Math.max(0, 50 - (Math.abs(actualData.price_change_percentage_24h) * 5));
            }
            break;

          case 'sell':
            // Se recomendou venda, esperava que o preço caísse
            if (actualData.price_change_percentage_24h < 0) {
              actualOutcome = `Preço caiu ${Math.abs(actualData.price_change_percentage_24h).toFixed(2)}%`;
              performanceScore = Math.min(100, 50 + (Math.abs(actualData.price_change_percentage_24h) * 5));
            } else {
              actualOutcome = `Preço subiu ${actualData.price_change_percentage_24h.toFixed(2)}%`;
              performanceScore = Math.max(0, 50 - (actualData.price_change_percentage_24h * 5));
            }
            break;

          case 'hold':
            // Se recomendou hold, esperava estabilidade (-2% a +2%)
            const change = Math.abs(actualData.price_change_percentage_24h);
            if (change <= 2) {
              actualOutcome = `Preço estável (${actualData.price_change_percentage_24h.toFixed(2)}%)`;
              performanceScore = 100 - (change * 10);
            } else {
              actualOutcome = `Preço variou ${actualData.price_change_percentage_24h.toFixed(2)}%`;
              performanceScore = Math.max(0, 70 - (change * 5));
            }
            break;

          case 'watch':
          case 'alert':
            // Para watch/alert, avaliação mais simples
            actualOutcome = `Variação de ${actualData.price_change_percentage_24h.toFixed(2)}%`;
            performanceScore = 70; // Score neutro
            break;
        }

        // Ajustar score baseado no nível de confiança
        if (prediction.confidence_level) {
          const confidenceMultiplier = prediction.confidence_level / 100;
          performanceScore = Math.round(performanceScore * confidenceMultiplier + (100 - performanceScore) * (1 - confidenceMultiplier) * 0.5);
        }

        // Atualizar predição com resultado
        const { error: updateError } = await supabase
          .from('ai_predictions')
          .update({
            actual_outcome: actualOutcome,
            performance_score: Math.round(performanceScore)
          })
          .eq('id', prediction.id);

        if (updateError) {
          console.error(`Error updating prediction ${prediction.id}:`, updateError);
        } else {
          evaluatedCount++;
          console.log(`Evaluated prediction ${prediction.id}: ${actualOutcome} (Score: ${performanceScore})`);
        }

      } catch (error) {
        console.error(`Error processing prediction ${prediction.id}:`, error);
      }
    }

    console.log(`Successfully evaluated ${evaluatedCount} predictions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        evaluated: evaluatedCount,
        total: predictions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-predictions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
