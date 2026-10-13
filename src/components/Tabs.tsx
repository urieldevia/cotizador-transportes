interface Props {
  activo: 'cotizador' | 'documentos';
  onChange: (tab: 'cotizador' | 'documentos') => void;
}

export function Tabs({ activo, onChange }: Props) {
  return (
    <div className="tabs-samsung">
      <button
        type="button"
        className={`tab-item ${activo === 'cotizador' ? 'active' : ''}`}
        onClick={() => onChange('cotizador')}
      >
        <span className="tab-icono">🧮</span>
        Cotizador
      </button>
      <button
        type="button"
        className={`tab-item ${activo === 'documentos' ? 'active' : ''}`}
        onClick={() => onChange('documentos')}
      >
        <span className="tab-icono">📋</span>
        Datos
      </button>
    </div>
  );
}