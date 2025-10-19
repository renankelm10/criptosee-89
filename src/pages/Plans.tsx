import { SEO } from "@/components/SEO";
import { PricingCard } from "@/components/PricingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Plans = () => {
  const navigate = useNavigate();

  const plans: Array<{
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    buttonText: string;
    isCurrentPlan?: boolean;
    isPopular?: boolean;
    planType: "free" | "basic" | "premium";
  }> = [
    {
      name: "Gratuito",
      price: "R$ 0",
      period: "/mês",
      description: "Comece sua jornada no mercado cripto",
      features: [
        "3 previsões diárias com IA",
        "Risco baixo (até 3/10)",
        "Dados de mercado em tempo real",
        "Gráficos básicos de preço",
        "Análise de principais moedas"
      ],
      buttonText: "Começar Grátis",
      isCurrentPlan: false,
      planType: "free" as const
    },
    {
      name: "Basic",
      price: "R$ 29,90",
      period: "/mês",
      description: "Para investidores que buscam mais oportunidades",
      features: [
        "10 previsões diárias com IA",
        "Risco médio (até 7/10)",
        "Indicadores técnicos avançados",
        "Histórico de 7 dias de previsões",
        "Rastreamento de até 10 moedas",
        "Alertas de volatilidade",
        "Gráficos avançados",
        "Suporte por email"
      ],
      buttonText: "Começar Agora",
      isPopular: false,
      planType: "basic" as const
    },
    {
      name: "Premium",
      price: "R$ 79,90",
      period: "/mês",
      description: "Máximo poder para traders profissionais",
      features: [
        "Previsões ilimitadas com IA",
        "Todos os níveis de risco (1-10)",
        "Projeções de preço exclusivas",
        "Histórico completo ilimitado",
        "Rastreamento ilimitado de moedas",
        "Indicadores profissionais completos",
        "Alertas personalizados avançados",
        "Análise de sentimento do mercado",
        "Suporte prioritário 24/7",
        "Acesso antecipado a novos recursos"
      ],
      buttonText: "Ser Premium",
      isPopular: true,
      planType: "premium" as const
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Planos e Preços - CriptoSee"
        description="Escolha o melhor plano para suas necessidades de análise e investimento em criptomoedas"
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

        <div className="text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
            <span className="text-primary font-semibold text-sm">Planos e Preços</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Potencialize seus Investimentos
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Escolha o plano ideal e tenha acesso às previsões de IA mais precisas do mercado cripto. 
            <span className="block mt-2 text-primary font-medium">Comece grátis e faça upgrade quando quiser.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        <div className="mt-20 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-8">Por que escolher o CriptoSee?</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="p-6 rounded-lg bg-card border">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="font-semibold mb-2">IA Avançada</h3>
                <p className="text-sm text-muted-foreground">Previsões geradas por inteligência artificial treinada em milhões de dados do mercado cripto</p>
              </div>
              <div className="p-6 rounded-lg bg-card border">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="font-semibold mb-2">Tempo Real</h3>
                <p className="text-sm text-muted-foreground">Dados atualizados constantemente para você tomar decisões precisas no momento certo</p>
              </div>
              <div className="p-6 rounded-lg bg-card border">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="font-semibold mb-2">100% Seguro</h3>
                <p className="text-sm text-muted-foreground">Seus dados protegidos com criptografia de ponta a ponta e armazenamento seguro</p>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground pt-8 border-t">
            <p className="font-medium">💳 Pagamento seguro processado pelo Abacate Pay</p>
            <p className="mt-2">Cancele a qualquer momento. Sem taxas de cancelamento. Satisfação garantida.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
