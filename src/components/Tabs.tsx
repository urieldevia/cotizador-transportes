interface Props {
  activo: 'cotizador' | 'documentos' | 'volante';
  onChange: (tab: 'cotizador' | 'documentos' | 'volante') => void;
}

export function Tabs({ activo, onChange }: Props) {
  return (
    <div className="tabs-samsung tabs-3">
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
      <button
        type="button"
        className={`tab-item ${activo === 'volante' ? 'active' : ''}`}
        onClick={() => onChange('volante')}
      >
        <span className="tab-icono">📄</span>
        Volante
      </button>
    </div>
  );
}