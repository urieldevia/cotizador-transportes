import { memo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  title?: string;
  className?: string;
}

export const AppleCard = memo(({ children, title, className = '' }: Props) => {
  return (
    <div className={`form-card ${className}`}>
      {title && <div className="form-section-titulo">{title}</div>}
      {children}
    </div>
  );
});

AppleCard.displayName = 'AppleCard';