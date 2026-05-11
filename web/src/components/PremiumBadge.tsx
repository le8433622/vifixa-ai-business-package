'use client';

interface PremiumBadgeProps {
  badgeLabel?: string;
  badgeColor?: string;
  badgeIcon?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  silver: {
    bg: 'bg-gradient-to-r from-gray-100 to-gray-200',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: '🪙',
  },
  gold: {
    bg: 'bg-gradient-to-r from-amber-100 to-yellow-200',
    text: 'text-amber-800',
    border: 'border-amber-300',
    icon: '👑',
  },
  platinum: {
    bg: 'bg-gradient-to-r from-indigo-100 to-purple-200',
    text: 'text-indigo-800',
    border: 'border-indigo-300',
    icon: '💎',
  },
};

const SIZE_CLASSES = {
  sm: { wrapper: 'text-xs px-1.5 py-0.5', icon: 'text-xs' },
  md: { wrapper: 'text-sm px-2.5 py-1', icon: 'text-sm' },
  lg: { wrapper: 'text-base px-3 py-1.5', icon: 'text-lg' },
};

export default function PremiumBadge({ badgeLabel, badgeColor, badgeIcon, size = 'md', showLabel = true }: PremiumBadgeProps) {
  const style = BADGE_STYLES[badgeColor || ''] || BADGE_STYLES.silver;
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border ${style.bg} ${style.text} ${style.border} ${sizeClasses.wrapper}`}
    >
      <span className={sizeClasses.icon}>{badgeIcon || style.icon}</span>
      {showLabel && <span>{badgeLabel || 'Đã xác thực'}</span>}
    </span>
  );
}
