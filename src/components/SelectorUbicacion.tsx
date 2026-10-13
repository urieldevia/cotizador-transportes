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
  const cerrandoTimerRef = useRef<number | undefined>(undefined);

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

  // Reset índice activo al cambiar resultados
  useEffect(() => {
    setIndiceActivo(resultados.length > 0 ? 0 : -1);
  }, [resultados.length]);

  // Auto-scroll al elemento activo
  useEffect(() => {
    if (indiceActivo >= 0 && listaRef.current) {
      const items = listaRef.current.querySelectorAll<HTMLElement>(
        '.dropdown-item'
      );
      const item = items[indiceActivo];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [indiceActivo]);

  const cancelarCierre = () => {
    if (cerrandoTimerRef.current) {
      window.clearTimeout(cerrandoTimerRef.current);
      cerrandoTimerRef.current = undefined;
    }
  };

  const programarCierre = () => {
    cancelarCierre();
    cerrandoTimerRef.current = window.setTimeout(() => {
      setAbierto(false);
      setIndiceActivo(-1);
    }, 220);
  };

  const seleccionarOpcion = (op: Ubicacion) => {
    cancelarCierre();
    onChange(op.id);
    setSeleccionado(op);
    setQuery(`${op.poblacion}, ${op.estado}`);
    setAbierto(false);
    setIndiceActivo(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hayResultados = resultados.length > 0;

    // Si el dropdown no está abierto y el usuario presiona ↓, abrirlo
    if (!abierto) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && hayResultados) {
        e.preventDefault();
        e.stopPropagation();
        setAbierto(true);
        setIndiceActivo(0);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        e.stopPropagation();
        if (!hayResultados) return;
        setIndiceActivo((prev) => (prev < resultados.length - 1 ? prev + 1 : 0));
        return;
      }

      case 'ArrowUp': {
        e.preventDefault();
        e.stopPropagation();
        if (!hayResultados) return;
        setIndiceActivo((prev) => (prev > 0 ? prev - 1 : resultados.length - 1));
        return;
      }

      case 'Home': {
        e.preventDefault();
        if (hayResultados) setIndiceActivo(0);
        return;
      }

      case 'End': {
        e.preventDefault();
        if (hayResultados) setIndiceActivo(resultados.length - 1);
        return;
      }

      case 'Enter': {
        e.preventDefault();
        e.stopPropagation();
        if (!hayResultados) return;
        const activo = indiceActivo >= 0 ? indiceActivo : 0;
        seleccionarOpcion(resultados[activo]);
        return;
      }

      case 'Escape': {
        e.preventDefault();
        e.stopPropagation();
        setAbierto(false);
        setIndiceActivo(-1);
        return;
      }

      case 'Tab': {
        setAbierto(false);
        setIndiceActivo(-1);
        return;
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
          if (seleccionado) {
            setSeleccionado(null);
            onChange(0);
          }
        }}
        onFocus={() => {
          cancelarCierre();
          setAbierto(true);
        }}
        onBlur={programarCierre}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Buscar población o estado...'}
        autoComplete="off"
        spellCheck={false}
      />
      {abierto && query.length >= 2 && (
        <div className="dropdown" ref={listaRef}>
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
              className={`dropdown-item ${indiceActivo === idx ? 'activo' : ''}`}
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