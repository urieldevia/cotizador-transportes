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
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  // Sincronizar valor externo
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

  // Resultados de búsqueda
  const resultados = useMemo(() => {
    return buscarUbicaciones(ubicaciones, query, 20);
  }, [ubicaciones, query]);

  // Resetear índice activo cuando cambian los resultados
  useEffect(() => {
    setIndiceActivo(-1);
  }, [resultados.length]);

  // Auto-scroll al elemento activo
  useEffect(() => {
    if (indiceActivo >= 0 && listaRef.current) {
      const items = listaRef.current.querySelectorAll('.dropdown-item');
      const item = items[indiceActivo] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [indiceActivo]);

  const seleccionarOpcion = (op: Ubicacion) => {
    onChange(op.id);
    setSeleccionado(op);
    setQuery(`${op.poblacion}, ${op.estado}`);
    setAbierto(false);
    setIndiceActivo(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Si el dropdown no está abierto, abrir con flecha abajo
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (resultados.length > 0) {
        e.preventDefault();
        setAbierto(true);
        setIndiceActivo(0);
      }
      return;
    }

    if (!abierto) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setIndiceActivo((prev) => {
          if (resultados.length === 0) return -1;
          return prev < resultados.length - 1 ? prev + 1 : 0;
        });
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        setIndiceActivo((prev) => {
          if (resultados.length === 0) return -1;
          return prev > 0 ? prev - 1 : resultados.length - 1;
        });
        break;
      }

      case 'Enter': {
        e.preventDefault();
        if (indiceActivo >= 0 && resultados[indiceActivo]) {
          seleccionarOpcion(resultados[indiceActivo]);
        } else if (resultados.length > 0) {
          seleccionarOpcion(resultados[0]);
        }
        break;
      }

      case 'Escape': {
        e.preventDefault();
        setAbierto(false);
        setIndiceActivo(-1);
        break;
      }

      case 'Tab': {
        // Cerrar sin seleccionar al salir del campo
        setAbierto(false);
        setIndiceActivo(-1);
        break;
      }
    }
  };

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
          setIndiceActivo(-1);
          if (seleccionado) {
            setSeleccionado(null);
            onChange(0);
          }
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          setTimeout(() => setAbierto(false), 180);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Buscar población o estado...'}
        autoComplete="off"
        role="combobox"
        aria-expanded={abierto}
        aria-autocomplete="list"
        aria-controls="ubicacion-listbox"
      />
      {abierto && query.length >= 2 && (
        <div
          className="dropdown"
          ref={listaRef}
          role="listbox"
          id="ubicacion-listbox"
        >
          {cargandoLista && (
            <div className="dropdown-item muted">Cargando ubicaciones...</div>
          )}
          {!cargandoLista && resultados.length === 0 && (
            <div className="dropdown-item muted">Sin resultados</div>
          )}
          {resultados.map((op, idx) => (
            <button
              key={op.id}
              type="button"
              role="option"
              aria-selected={indiceActivo === idx}
              className={`dropdown-item ${
                indiceActivo === idx ? 'activo' : ''
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setIndiceActivo(idx)}
              onClick={() => seleccionarOpcion(op)}
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