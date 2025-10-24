import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VotingCellProps {
  predictionId: string;
  correctVotes: number;
  incorrectVotes: number;
  userVote: 'correct' | 'incorrect' | null;
  onVoteChange: () => void;
}

export const VotingCell = ({
  predictionId,
  correctVotes,
  incorrectVotes,
  userVote,
  onVoteChange
}: VotingCellProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();

  const handleVote = async (voteType: 'correct' | 'incorrect') => {
    setIsVoting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para votar",
        variant: "destructive"
      });
      setIsVoting(false);
      return;
    }

    // Se já votou no mesmo tipo, remove o voto
    if (userVote === voteType) {
      const { error } = await supabase
        .from('prediction_votes')
        .delete()
        .eq('prediction_id', predictionId)
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Erro ao remover voto",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Voto removido"
        });
        onVoteChange();
      }
    } else {
      // Insere ou atualiza o voto
      const { error } = await supabase
        .from('prediction_votes')
        .upsert({
          prediction_id: predictionId,
          user_id: user.id,
          vote_type: voteType
        }, {
          onConflict: 'prediction_id,user_id'
        });

      if (error) {
        toast({
          title: "Erro ao votar",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Voto registrado",
          description: voteType === 'correct' ? 'Você votou: Acertou ✓' : 'Você votou: Errou ✗'
        });
        onVoteChange();
      }
    }
    
    setIsVoting(false);
  };

  const totalVotes = correctVotes + incorrectVotes;
  const accuracyRate = totalVotes > 0 
    ? ((correctVotes / totalVotes) * 100).toFixed(0) 
    : '0';

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={userVote === 'correct' ? 'default' : 'outline'}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => handleVote('correct')}
        disabled={isVoting}
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      
      <div className="flex flex-col items-center min-w-[60px]">
        <span className="text-xs text-muted-foreground">
          {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
        </span>
        {totalVotes > 0 && (
          <Badge 
            variant={Number(accuracyRate) >= 70 ? 'default' : Number(accuracyRate) >= 50 ? 'secondary' : 'destructive'}
            className="text-xs mt-1"
          >
            {accuracyRate}% ✓
          </Badge>
        )}
      </div>

      <Button
        variant={userVote === 'incorrect' ? 'destructive' : 'outline'}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => handleVote('incorrect')}
        disabled={isVoting}
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
};
