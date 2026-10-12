import { useState, useEffect, useMemo, useRef } from 'react';
import { useUbicaciones, buscarUbicaciones } from '../hooks/useUbicaciones';
import type { Ubicacion } from '../lib/types';

interface Props {
  label: string;
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
}

export function SelectorUbicacion({
  label,
  value,
  onChange,
  placeholder,
}: Props) {
  const { ubicaciones, cargando: cargandoLista } = useUbicaciones();
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Ubicacion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const resultados = useMemo(() => {
    return buscarUbicaciones(ubicaciones, query, 20);
  }, [ubicaciones, query]);

  return (
    <div className="selector-ubicacion">
      {label && <label>{label}</label>}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
          if (seleccionado) {
            setSeleccionado(null);
            onChange(0);
          }
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          setTimeout(() => setAbierto(false), 180);
        }}
        placeholder={placeholder ?? 'Buscar población o estado...'}
        autoComplete="off"
      />
      {abierto && query.length >= 2 && (
        <div className="dropdown">
          {cargandoLista && (
            <div className="dropdown-item muted">Cargando ubicaciones...</div>
          )}
          {!cargandoLista && resultados.length === 0 && (
            <div className="dropdown-item muted">Sin resultados</div>
          )}
          {resultados.map((op) => (
            <button
              key={op.id}
              type="button"
              className="dropdown-item"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                onChange(op.id);
                setSeleccionado(op);
                setQuery(`${op.poblacion}, ${op.estado}`);
                setAbierto(false);
              }}
            >
              <strong>{op.poblacion}</strong>{' '}
              <span className="muted">{op.estado}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}