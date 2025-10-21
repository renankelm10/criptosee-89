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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const CRYPTOPANIC_KEY = Deno.env.get('CRYPTOPANIC_API_KEY');
    
    if (!CRYPTOPANIC_KEY) {
      console.warn('CRYPTOPANIC_API_KEY not configured, skipping sentiment fetch');
      return new Response(
        JSON.stringify({ message: 'Sentiment API not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { coinId, symbol } = await req.json();
    
    if (!coinId || !symbol) {
      return new Response(
        JSON.stringify({ error: 'coinId and symbol are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Fetching sentiment for ${coinId} (${symbol})...`);

    // Buscar notícias e sentimento da CryptoPanic
    const cryptopanicUrl = `https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_KEY}&currencies=${symbol.toUpperCase()}&kind=news&filter=hot`;
    
    const response = await fetch(cryptopanicUrl);
    
    if (!response.ok) {
      console.error('CryptoPanic API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sentiment data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const data = await response.json();
    const posts = data.results || [];

    console.log(`Found ${posts.length} posts for ${symbol}`);

    // Analisar sentimento
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const recentNews: any[] = [];

    posts.forEach((post: any) => {
      const votes = post.votes || {};
      const positive = votes.positive || 0;
      const negative = votes.negative || 0;
      const important = votes.important || 0;

      // Classificar sentimento baseado em votos
      if (positive > negative) {
        positiveCount++;
      } else if (negative > positive) {
        negativeCount++;
      } else {
        neutralCount++;
      }

      // Guardar notícias recentes
      if (recentNews.length < 5) {
        recentNews.push({
          title: post.title,
          url: post.url,
          published_at: post.published_at,
          sentiment: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral',
          votes: { positive, negative, important }
        });
      }
    });

    const totalMentions = posts.length;
    
    // Calcular score de sentimento (-1 a 1)
    let sentimentScore = 0;
    if (totalMentions > 0) {
      sentimentScore = (positiveCount - negativeCount) / totalMentions;
    }

    // Armazenar no banco
    const { error: insertError } = await supabaseClient
      .from('coin_sentiment')
      .insert({
        coin_id: coinId,
        sentiment_score: sentimentScore,
        positive_mentions: positiveCount,
        negative_mentions: negativeCount,
        neutral_mentions: neutralCount,
        total_mentions: totalMentions,
        recent_news: recentNews,
        sources: { cryptopanic: true },
        timestamp: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting sentiment:', insertError);
    }

    console.log(`Sentiment saved for ${coinId}: score ${sentimentScore.toFixed(2)}, ${totalMentions} mentions`);

    return new Response(
      JSON.stringify({
        coinId,
        symbol,
        sentiment_score: sentimentScore,
        positive_mentions: positiveCount,
        negative_mentions: negativeCount,
        neutral_mentions: neutralCount,
        total_mentions: totalMentions,
        recent_news: recentNews
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-crypto-sentiment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
