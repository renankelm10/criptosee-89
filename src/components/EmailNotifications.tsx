import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Bell, BellOff, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface EmailSubscription {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export const EmailNotifications = () => {
  const [email, setEmail] = useState("");
  const [subscriptions, setSubscriptions] = useLocalStorage<EmailSubscription[]>("email_notifications", []);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, digite um email válido.",
        variant: "destructive",
      });
      return;
    }

    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Email inválido",
        description: "Por favor, digite um email válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const emailLower = email.trim().toLowerCase();
      const existingIndex = subscriptions.findIndex(sub => sub.email === emailLower);
      
      if (existingIndex >= 0) {
        // Atualizar existente
        const updated = [...subscriptions];
        updated[existingIndex] = { ...updated[existingIndex], is_active: true };
        setSubscriptions(updated);
      } else {
        // Adicionar novo
        const newSubscription: EmailSubscription = {
          id: Date.now().toString(),
          email: emailLower,
          is_active: true,
          created_at: new Date().toISOString()
        };
        setSubscriptions([newSubscription, ...subscriptions]);
      }
      
      toast({
        title: "Sucesso!",
        description: "Email adicionado à lista de notificações.",
      });
      
      setEmail("");
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o email. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const updated = subscriptions.map(sub => 
        sub.id === id ? { ...sub, is_active: !currentStatus } : sub
      );
      setSubscriptions(updated);
      
      toast({
        title: "Sucesso!",
        description: `Notificação ${!currentStatus ? 'ativada' : 'desativada'}.`,
      });
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este email da lista?")) {
      return;
    }

    try {
      const updated = subscriptions.filter(sub => sub.id !== id);
      setSubscriptions(updated);
      
      toast({
        title: "Sucesso!",
        description: "Email removido da lista de notificações.",
      });
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o email. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const activeCount = subscriptions.filter(sub => sub.is_active).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Notificações por Email
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Receba alertas quando moedas apresentarem alta volatilidade (variação superior a 5% em 24h)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form para adicionar email */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubscribe()}
            className="flex-1"
          />
          <Button 
            onClick={handleSubscribe} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {loading ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>

        {/* Estatísticas */}
        {subscriptions.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bell className="w-4 h-4" />
              {activeCount} email(s) ativo(s)
            </div>
            <div className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              {subscriptions.length} total
            </div>
          </div>
        )}

        {/* Lista de emails cadastrados */}
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum email cadastrado ainda</p>
            <p className="text-sm">Adicione seu email para receber notificações</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Emails Cadastrados:</h4>
            {subscriptions.map((subscription) => (
              <div 
                key={subscription.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-background"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">{subscription.email}</span>
                  <Badge variant={subscription.is_active ? "default" : "secondary"}>
                    {subscription.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(subscription.id, subscription.is_active)}
                    className="flex items-center gap-1"
                  >
                    {subscription.is_active ? (
                      <>
                        <BellOff className="w-4 h-4" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        Ativar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(subscription.id)}
                    className="flex items-center gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Informações importantes */}
        <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
          <h4 className="font-medium">Como funciona:</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li>• As notificações são armazenadas localmente no seu navegador</li>
            <li>• Esta é uma versão demonstrativa - alertas de email reais requerem servidor backend</li>
            <li>• Você pode ativar/desativar ou remover emails a qualquer momento</li>
            <li>• Os dados são mantidos apenas neste navegador</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};