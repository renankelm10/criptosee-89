import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  planType: "free" | "basic" | "premium";
}

export const PricingCard = ({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  isCurrentPlan,
  isPopular,
  planType
}: PricingCardProps) => {
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para assinar um plano");
        navigate("/auth");
        return;
      }

      if (planType === "free") {
        toast.info("Você já está no plano gratuito");
        return;
      }

      // Call edge function to create Abacate Pay checkout
      const { data, error } = await supabase.functions.invoke("create-abacate-checkout", {
        body: { plan: planType }
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao processar assinatura. Tente novamente.");
    }
  };

  return (
    <Card className={`relative transition-all duration-300 hover:shadow-xl ${
      isPopular 
        ? "border-primary shadow-lg scale-105 bg-gradient-to-b from-primary/5 to-transparent" 
        : "hover:scale-105"
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
            <Sparkles className="w-4 h-4 animate-pulse" />
            MAIS POPULAR
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      )}
      
      <CardHeader className="text-center pb-6 pt-8">
        <CardTitle className={`text-3xl mb-2 ${isPopular ? "text-primary" : ""}`}>
          {name}
        </CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
        <div className="mt-6">
          <span className={`text-5xl font-bold ${isPopular ? "bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent" : ""}`}>
            {price}
          </span>
          <span className="text-muted-foreground text-lg">{period}</span>
        </div>
      </CardHeader>
      
      <CardContent className="px-6">
        <ul className="space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3 group">
              <Check className={`w-5 h-5 shrink-0 mt-0.5 transition-colors ${
                isPopular ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              }`} />
              <span className="text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter className="pt-6 pb-8 px-6">
        <Button
          className={`w-full h-12 text-base font-semibold transition-all ${
            isPopular ? "shadow-lg hover:shadow-xl" : ""
          }`}
          variant={isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"}
          disabled={isCurrentPlan}
          onClick={handleSubscribe}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
};
