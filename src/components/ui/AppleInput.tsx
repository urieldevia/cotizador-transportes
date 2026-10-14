import { memo, forwardRef, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const AppleInput = memo(
  forwardRef<HTMLInputElement, Props>(
    ({ label, hint, error, className = '', ...props }, ref) => {
      return (
        <div className="form-group">
          {label && <label>{label}</label>}
          <input ref={ref} className={className} {...props} />
          {hint && !error && <small className="hint">{hint}</small>}
          {error && <small className="hint error">{error}</small>}
        </div>
      );
    }
  )
);

AppleInput.displayName = 'AppleInput';