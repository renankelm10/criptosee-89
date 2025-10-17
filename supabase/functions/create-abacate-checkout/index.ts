import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { plan } = await req.json();

    // Abacate Pay API configuration
    const abacateApiKey = Deno.env.get("ABACATE_API_KEY");
    if (!abacateApiKey) {
      throw new Error("Abacate Pay API key not configured");
    }

    // Define plan prices
    const prices: Record<string, { amount: number; name: string }> = {
      basic: { amount: 2990, name: "Plano Basic" },
      premium: { amount: 7990, name: "Plano Premium" }
    };

    const selectedPrice = prices[plan];
    if (!selectedPrice) {
      throw new Error("Invalid plan selected");
    }

    // Create checkout with Abacate Pay
    const abacateResponse = await fetch("https://api.abacatepay.com/v1/billing/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${abacateApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        frequency: "monthly",
        methods: ["PIX", "CREDIT_CARD"],
        products: [
          {
            externalId: `${plan}_plan`,
            name: selectedPrice.name,
            description: `Assinatura mensal do ${selectedPrice.name}`,
            quantity: 1,
            price: selectedPrice.amount
          }
        ],
        returnUrl: `${req.headers.get("origin")}/profile`,
        completionUrl: `${req.headers.get("origin")}/profile`,
        metadata: {
          userId: user.id,
          plan: plan
        }
      })
    });

    if (!abacateResponse.ok) {
      const errorData = await abacateResponse.text();
      console.error("Abacate Pay error:", errorData);
      throw new Error("Failed to create checkout with Abacate Pay");
    }

    const checkoutData = await abacateResponse.json();

    return new Response(
      JSON.stringify({ checkoutUrl: checkoutData.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
