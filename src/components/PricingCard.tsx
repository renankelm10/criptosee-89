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
    <Card className={`relative ${isPopular ? "border-primary shadow-lg scale-105" : ""}`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            Mais Popular
          </div>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button
          className="w-full"
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
