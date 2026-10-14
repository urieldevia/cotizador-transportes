import { memo, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const AppleButton = memo(
  ({
    variant = 'primary',
    icon,
    fullWidth = false,
    children,
    className = '',
    ...props
  }: Props) => {
    const variantClass =
      variant === 'primary'
        ? 'btn-primary'
        : variant === 'secondary'
        ? 'btn-secondary'
        : 'btn-danger-outline';

    return (
      <button
        className={`${variantClass} ${fullWidth ? 'full-width' : ''} ${className}`}
        {...props}
      >
        {icon && <span className="btn-icon">{icon}</span>}
        {children}
      </button>
    );
  }
);

AppleButton.displayName = 'AppleButton';