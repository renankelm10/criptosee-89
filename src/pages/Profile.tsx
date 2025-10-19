import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Lock, Camera, ArrowLeft, Crown, Zap } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100).trim()
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { user, profile, updateProfile, updatePassword, uploadAvatar } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'basic' | 'premium'>('free');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name || ''
    }
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: ''
    }
  });

  const onUpdateProfile = async (data: ProfileForm) => {
    setIsLoadingProfile(true);
    await updateProfile(data.fullName);
    setIsLoadingProfile(false);
  };

  const onUpdatePassword = async (data: PasswordForm) => {
    setIsLoadingPassword(true);
    const { error } = await updatePassword(data.newPassword);
    if (!error) {
      passwordForm.reset();
    }
    setIsLoadingPassword(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB.');
      return;
    }

    setIsLoadingAvatar(true);
    await uploadAvatar(file);
    setIsLoadingAvatar(false);
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setCurrentPlan(data.plan);
      }
    };

    fetchUserPlan();
  }, [user]);

  const updatePlan = async (newPlan: 'free' | 'basic' | 'premium') => {
    if (!user) return;
    
    setIsUpdatingPlan(true);
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ plan: newPlan })
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentPlan(newPlan);
      toast({
        title: "Plano atualizado!",
        description: `Seu plano foi alterado para ${newPlan === 'premium' ? 'Premium' : newPlan === 'basic' ? 'Básico' : 'Gratuito'}.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar plano",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const getPlanBadge = () => {
    switch (currentPlan) {
      case 'premium':
        return <Badge className="bg-gradient-primary text-white"><Crown className="w-3 h-3 mr-1" />Premium</Badge>;
      case 'basic':
        return <Badge variant="secondary"><Zap className="w-3 h-3 mr-1" />Básico</Badge>;
      default:
        return <Badge variant="outline">Gratuito</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-crypto-primary/5">
      <SEO 
        title="Meu Perfil | Crypto.See" 
        description="Gerencie suas informações de perfil e preferências."
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="space-y-6">
          {/* Header com Avatar */}
          <Card className="p-8 backdrop-blur-lg bg-card/80 border-border">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-gradient-primary text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 cursor-pointer transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isLoadingAvatar}
                  />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold text-foreground">{profile?.full_name || 'Usuário'}</h1>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </Card>

          {/* Plano e Assinatura */}
          <Card className="p-6 backdrop-blur-lg bg-card/80 border-border">
            <div className="flex items-center gap-2 mb-6">
              <Crown className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Plano e Assinatura</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Plano atual</p>
                {getPlanBadge()}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">Alterar plano (Desenvolvimento)</p>
                <div className="flex gap-2">
                  <Button 
                    variant={currentPlan === 'free' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => updatePlan('free')}
                    disabled={isUpdatingPlan || currentPlan === 'free'}
                  >
                    Gratuito
                  </Button>
                  <Button 
                    variant={currentPlan === 'basic' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => updatePlan('basic')}
                    disabled={isUpdatingPlan || currentPlan === 'basic'}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Básico
                  </Button>
                  <Button 
                    variant={currentPlan === 'premium' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => updatePlan('premium')}
                    disabled={isUpdatingPlan || currentPlan === 'premium'}
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ou visite a <span 
                    className="text-primary cursor-pointer hover:underline"
                    onClick={() => navigate('/plans')}
                  >
                    página de planos
                  </span> para mais informações
                </p>
              </div>
            </div>
          </Card>

          {/* Informações Pessoais */}
          <Card className="p-6 backdrop-blur-lg bg-card/80 border-border">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Informações Pessoais</h2>
            </div>

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={profile?.full_name || 'Seu nome'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Email</FormLabel>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={user?.email || ''} 
                      disabled 
                      className="pl-10 bg-muted cursor-not-allowed"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">O email não pode ser alterado</p>
                </div>

                <Button type="submit" disabled={isLoadingProfile}>
                  {isLoadingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </Form>
          </Card>

          {/* Segurança */}
          <Card className="p-6 backdrop-blur-lg bg-card/80 border-border">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Segurança</h2>
            </div>

            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onUpdatePassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoadingPassword} variant="secondary">
                  {isLoadingPassword ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
