import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const AppleInput = forwardRef<HTMLInputElement, Props>(
  ({ label, className = '', style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: '4px' }}>
            {label}
          </label>
        )}
        <input ref={ref} className={`input-apple ${className}`} style={style} {...props} />
      </div>
    );
  }
);

AppleInput.displayName = 'AppleInput';