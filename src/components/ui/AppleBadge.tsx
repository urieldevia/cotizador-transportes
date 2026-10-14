import { memo, type ReactNode } from 'react';

type Variant = 'blue' | 'green' | 'red' | 'gray' | 'indigo';

interface Props {
  children: ReactNode;
  variant?: Variant;
}

export const AppleBadge = memo(({ children, variant = 'gray' }: Props) => {
  const styles: Record<Variant, React.CSSProperties> = {
    blue: {
      background: 'var(--apple-blue-tint)',
      color: 'var(--apple-blue)',
    },
    green: {
      background: 'var(--apple-green-tint)',
      color: 'var(--apple-green)',
    },
    red: {
      background: 'var(--apple-red-tint)',
      color: 'var(--apple-red)',
    },
    gray: {
      background: 'var(--bg-input)',
      color: 'var(--text-primary)',
    },
    indigo: {
      background: 'rgba(88, 86, 214, 0.12)',
      color: 'var(--apple-indigo)',
    },
  };

  return (
    <span
      style={{
        ...styles[variant],
        padding: '4px 10px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
});

AppleBadge.displayName = 'AppleBadge';