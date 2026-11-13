import { useState, useRef, useEffect } from 'react';
import { AppleInput } from './AppleInput';

export interface LocationOption {
  id: number;
  nombre: string;
  estado?: string;
}

interface Props {
  options: LocationOption[];
  value: string;
  onChange: (val: string) => void;
  onSelect: (opt: LocationOption) => void;
  placeholder?: string;
  label?: string;
}

export function AutocompleteInput({ options, value, onChange, onSelect, placeholder, label }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtramos las opciones según lo que se escriba
  const filtered = options.filter(opt =>
    opt.nombre.toLowerCase().includes(value.toLowerCase())
  );

  // Cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Control de teclado
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
      setHighlightedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (opt: LocationOption) => {
    onChange(opt.nombre);
    onSelect(opt);
    setIsOpen(false);
  };

  // Si el input está abierto, elevamos el z-index del contenedor.
  // Esto evita que las siguientes tarjetas lo tapen.
  return (
    <div ref={containerRef} style={{ position: 'relative', zIndex: isOpen ? 9999 : 1 }}>
      <AppleInput
        label={label}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      
      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 9999,
            marginTop: '4px',
          }}
        >
          {filtered.map((opt, index) => (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                background: index === highlightedIndex ? '#F2F2F7' : 'transparent',
                borderBottom: '1px solid #eee',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{opt.nombre}</div>
              {opt.estado && <div style={{ fontSize: '12px', color: '#666' }}>{opt.estado}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}