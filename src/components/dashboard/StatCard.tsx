import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
  onClick?: () => void;
}

export const StatCard = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-primary',
  delay = 0,
}: StatCardProps) => {
  const changeColors = {
    positive: 'text-success bg-success/10',
    negative: 'text-destructive bg-destructive/10',
    neutral: 'text-muted-foreground bg-muted',
  };

  return (
    <div
      className="bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 animate-slide-up opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-3xl font-light text-foreground mt-2 font-sans tabular-nums">{value}</p>
          {change && (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-3 ${changeColors[changeType]}`}>
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl bg-muted/50 ${iconColor}`}>
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};
