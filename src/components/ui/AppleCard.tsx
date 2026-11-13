import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function AppleCard({ children, className = '', onClick, style }: Props) {
  return (
    <div className={`glass-card ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </div>
  );
}