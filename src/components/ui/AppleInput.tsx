import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function AppleInput({ label, style, ...props }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && <label style={{ fontSize: '11px', fontWeight: 600, color: 'gray', marginLeft: '4px' }}>{label}</label>}
      <input 
        className="input-apple" 
        style={style}
        {...props} 
      />
    </div>
  );
}