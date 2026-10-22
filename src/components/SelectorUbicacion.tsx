import { useState, useEffect, useMemo, useRef } from 'react';
import { useUbicaciones, buscarUbicaciones } from '../hooks/useUbicaciones';
import type { Ubicacion } from '../lib/types';

interface Props {
  label: string;
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
}

export function SelectorUbicacion({ label, value, onChange, placeholder }: Props) {
  const { ubicaciones, cargando: cargandoLista } = useUbicaciones();
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Ubicacion | null>(null);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && ubicaciones.length > 0) {
      const u = ubicaciones.find((x) => x.id === value);
      if (u && u.id !== seleccionado?.id) {
        setSeleccionado(u);
        setQuery(`${u.poblacion}, ${u.estado}`);
      }
    }
    if (!value && seleccionado) {
      setSeleccionado(null);
      setQuery('');
    }
  }, [value, ubicaciones, seleccionado]);

  const resultados = useMemo(() => buscarUbicaciones(ubicaciones, query, 20), [ubicaciones, query]);

  useEffect(() => { setIndiceActivo(resultados.length > 0 ? 0 : -1); }, [resultados.length]);

  useEffect(() => {
    if (indiceActivo >= 0 && listaRef.current) {
      const items = listaRef.current.querySelectorAll<HTMLElement>('.dropdown-item');
      items[indiceActivo]?.scrollIntoView({ block: 'nearest' });
    }
  }, [indiceActivo]);

  const seleccionarOpcion = (op: Ubicacion) => {
    onChange(op.id);
    setSeleccionado(op);
    setQuery(`${op.poblacion}, ${op.estado}`);
    setAbierto(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!abierto) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceActivo(p => p < resultados.length - 1 ? p + 1 : 0); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndiceActivo(p => p > 0 ? p - 1 : resultados.length - 1); }
    if (e.key === 'Enter' && indiceActivo >= 0) { e.preventDefault(); seleccionarOpcion(resultados[indiceActivo]); }
    if (e.key === 'Escape') setAbierto(false);
  };

  return (
    <div className="selector-ubicacion" style={{ position: 'relative', width: '100%' }}>
      {label && <label className="apple-label">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Buscar...'}
        className="apple-input"
        autoComplete="off"
      />
      {abierto && query.length >= 2 && (
        <div ref={listaRef} className="apple-dropdown" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          maxHeight: '220px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.08)'
        }}>
          {cargandoLista && <div className="p-3 text-sm text-gray-500 text-center">Cargando...</div>}
          {!cargandoLista && resultados.length === 0 && <div className="p-3 text-sm text-gray-500 text-center">No hay resultados</div>}
          {resultados.map((op, idx) => (
            <div
              key={op.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => seleccionarOpcion(op)}
              className={`apple-dropdown-item ${indiceActivo === idx ? 'active' : ''}`}
            >
              <span style={{ fontWeight: 600 }}>{op.poblacion}</span> <span style={{ color: '#8E8E93', fontSize: '13px' }}>{op.estado}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}