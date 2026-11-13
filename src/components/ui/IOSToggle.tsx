interface Props {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function IOSToggle({ label, checked, onChange }: Props) {
  return (
    <div className="ios-switch-row" onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="ios-switch-label">{label}</span>
      <div className={`ios-switch ${checked ? 'active' : ''}`}>
        <div className="ios-switch-knob" />
      </div>
    </div>
  );
}