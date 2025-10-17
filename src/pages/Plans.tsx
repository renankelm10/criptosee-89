import { SEO } from "@/components/SEO";
import { PricingCard } from "@/components/PricingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Plans = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      period: "/mês",
      description: "Para começar a explorar o mercado cripto",
      features: [
        "5 visualizações de previsões por dia",
        "Dados de mercado em tempo real",
        "Gráficos básicos",
        "Análise de até 10 moedas"
      ],
      buttonText: "Plano Atual",
      isCurrentPlan: true,
      planType: "free"
    },
    {
      name: "Basic",
      price: "R$ 29,90",
      period: "/mês",
      description: "Ideal para investidores iniciantes",
      features: [
        "20 visualizações de previsões por dia",
        "Dados de mercado em tempo real",
        "Gráficos avançados",
        "Análise de até 50 moedas",
        "Alertas de preço",
        "Suporte por email"
      ],
      buttonText: "Assinar Basic",
      isPopular: false,
      planType: "basic"
    },
    {
      name: "Premium",
      price: "R$ 79,90",
      period: "/mês",
      description: "Para traders profissionais",
      features: [
        "Visualizações ilimitadas",
        "Rastreamento personalizado",
        "Dados de mercado em tempo real",
        "Gráficos profissionais",
        "Análise ilimitada de moedas",
        "Alertas personalizados",
        "Previsões com IA avançada",
        "Suporte prioritário 24/7"
      ],
      buttonText: "Assinar Premium",
      isPopular: true,
      planType: "premium"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Planos e Preços - CriptoSee"
        description="Escolha o melhor plano para suas necessidades de análise e investimento em criptomoedas"
        keywords="planos, preços, assinatura, premium, basic, criptomoedas"
      />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha seu plano</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Invista com inteligência. Escolha o plano que melhor se adapta às suas necessidades.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>Pagamento seguro processado pelo Abacate Pay</p>
          <p className="mt-2">Cancele a qualquer momento. Sem taxas de cancelamento.</p>
        </div>
      </div>
    </div>
  );
};

export default Plans;
