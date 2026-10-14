import { memo } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
  className?: string;
}

function AppleSegmentedControlInner<T extends string>({
  options,
  value,
  onChange,
  columns,
  className = '',
}: Props<T>) {
  const cols = columns ?? options.length;

  return (
    <div
      className={`subtabs-samsung ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`subtab-item ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <span className="tab-icono">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export const AppleSegmentedControl = memo(
  AppleSegmentedControlInner
) as typeof AppleSegmentedControlInner;

AppleSegmentedControl.displayName = 'AppleSegmentedControl';