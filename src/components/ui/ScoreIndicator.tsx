import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  className?: string;
}

export function ScoreIndicator({ score, size = 'md', showTrend = true, className }: ScoreIndicatorProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-indigo-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10';
    if (score >= 60) return 'bg-indigo-500/10';
    if (score >= 40) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  const TrendIcon = score >= 70 ? TrendingUp : score >= 40 ? Minus : TrendingDown;

  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-black',
          getScoreBg(score),
          sizes[size]
        )}
      >
        <span className={getScoreColor(score)}>{score}</span>
      </div>
      {showTrend && (
        <TrendIcon className={getScoreColor(score)} size={iconSizes[size]} />
      )}
    </div>
  );
}
