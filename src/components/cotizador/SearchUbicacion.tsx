import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { AppleInput } from '../ui/AppleInput';

interface Ubicacion {
  id: number;
  poblacion: string;
  estado: string | null;
}

interface UbicacionNormalizada extends Ubicacion {
  _busqueda: string; // Campo extra para buscar rápido sin acentos
}

interface Props {
  onSelect: (ubi: Ubicacion) => void;
  placeholder?: string;
}

// Función para quitar acentos y convertir a minúsculas
const normalizarTexto = (texto: string | null | undefined) => {
  if (!texto) return '';
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export function SearchUbicacion({ onSelect, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [ubicaciones, setUbicaciones] = useState<UbicacionNormalizada[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    width: 0,
    zIndex: 99999,
  });

  // 1. DESCARGAR TODAS LAS UBICACIONES (Evitando el límite de 1000)
  useEffect(() => {
    const fetchTodasLasUbicaciones = async () => {
      let todas: Ubicacion[] = [];
      let desde = 0;
      let hasta = 999;
      let hayMas = true;

      while (hayMas) {
        const { data, error } = await supabase
          .from('ubicaciones')
          .select('id, poblacion, estado')
          .range(desde, hasta);

        if (error) {
          console.error("Error cargando ubicaciones:", error);
          break;
        }

        if (data && data.length > 0) {
          todas = [...todas, ...data];
          desde += 1000;
          hasta += 1000;
        } else {
          hayMas = false; // Ya no hay más registros
        }
      }

      // Normalizamos los textos para búsquedas sin acentos
      const normalizadas = todas.map(u => ({
        ...u,
        _busqueda: `${normalizarTexto(u.poblacion)} ${normalizarTexto(u.estado)}`
      }));

      setUbicaciones(normalizadas);
      setCargando(false);
    };

    fetchTodasLasUbicaciones();
  }, []);

  // 2. FILTRAR EN TIEMPO REAL (Sin acentos)
  const queryNormalized = normalizarTexto(query);
  const filtered = query.length > 0 
    ? ubicaciones.filter(u => u._busqueda.includes(queryNormalized))
    : [];

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyles(prev => ({
        ...prev,
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      }));
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.dropdown-portal')) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        handleSelect(filtered[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (ubi: Ubicacion) => {
    onSelect(ubi);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <AppleInput
        placeholder={cargando ? "Cargando directorio..." : placeholder}
        disabled={cargando}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setHighlightIndex(0);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {isOpen && query.length > 0 && createPortal(
        <div
          className="dropdown-portal"
          style={{
            ...dropdownStyles,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            maxHeight: '250px',
            overflowY: 'auto',
          }}
        >
          {filtered.length > 0 ? (
            filtered.slice(0, 100).map((opt, index) => ( // Mostramos max 100 en pantalla para no colapsar el navegador
              <div
                key={opt.id}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setHighlightIndex(index)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: index === highlightIndex ? '#F2F2F7' : 'transparent',
                  borderBottom: '1px solid #eee',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{opt.poblacion}</div>
                {opt.estado && <div style={{ fontSize: '12px', color: '#666' }}>{opt.estado}</div>}
              </div>
            ))
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
              No se encontraron resultados
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}