import { useState, useMemo, useRef, useEffect } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';
import { normalizarTexto } from '../hooks/useUbicaciones';
import type { Personal } from '../lib/types';

const NOMBRE_EMPRESA = 'TRANSPORTES RAMÍREZ';

function etiquetaRolCorto(rol: string): string {
  if (rol === 'chofer') return 'Chofer';
  if (rol === 'auxiliar') return 'Auxiliar';
  if (rol === 'ambos') return 'Chofer/Aux';
  return '';
}

export function GenerarTexto() {
  const { unidades, personal, propietarios } = useCatalogo();
  const [unidadFisicaId, setUnidadFisicaId] = useState<number | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [notas, setNotas] = useState('');
  const [fecha, setFecha] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Búsquedas
  const [busquedaUnidad, setBusquedaUnidad] = useState('');
  const [abiertoUnidad, setAbiertoUnidad] = useState(false);
  const [busquedaPersonal, setBusquedaPersonal] = useState('');

  const pickerFechaRef = useRef<HTMLInputElement>(null);
  const unidadWrapRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown de unidad al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (unidadWrapRef.current && !unidadWrapRef.current.contains(e.target as Node)) {
        setAbiertoUnidad(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unidadSeleccionada = useMemo(
    () => unidades.find((u) => u.id === unidadFisicaId) || null,
    [unidades, unidadFisicaId]
  );

  // Filtros optimizados
  const unidadesFiltradas = useMemo(() => {
    if (!busquedaUnidad.trim()) return unidades.slice(0, 10);
    const q = normalizarTexto(busquedaUnidad);
    return unidades.filter((u) => {
      const prop = propietarios.find((p) => p.id === u.propietario_id);
      const texto = normalizarTexto(`${u.marca_modelo} ${u.color || ''} ${u.placas || ''} ${prop?.nombre || ''}`);
      return texto.includes(q);
    }).slice(0, 20);
  }, [unidades, propietarios, busquedaUnidad]);

  const personalFiltrado = useMemo(() => {
    if (!busquedaPersonal.trim()) return personal;
    const q = normalizarTexto(busquedaPersonal);
    return personal.filter(
      (p) => normalizarTexto(p.nombre_completo).includes(q) || (p.apodo && normalizarTexto(p.apodo).includes(q))
    );
  }, [personal, busquedaPersonal]);

  const togglePersonal = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Fecha
  const abrirPicker = () => {
    pickerFechaRef.current?.showPicker?.();
    pickerFechaRef.current?.click();
  };
  
  const fechaISO = useMemo(() => {
    const m = fecha.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (!m) return '';
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }, [fecha]);

  const fechaFormateada = useMemo(() => {
    if (!fechaISO) return '';
    const [y, m, d] = fechaISO.split('-');
    return `${d}/${m}/${y}`;
  }, [fechaISO]);

  const normalizarFechaTexto = () => {
    if (fechaISO) setFecha(fechaFormateada);
  };

  // Texto final
  const texto = useMemo(() => {
    if (!unidadSeleccionada) return '';
    const sepGrueso = '━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const sepFino = '───────────────────────────';
    const partes: string[] = [];

    partes.push(sepGrueso);
    partes.push(`   🚛 ${NOMBRE_EMPRESA}`);
    partes.push(sepGrueso);
    partes.push(sepFino);
    partes.push('📋 DATOS DE LA UNIDAD:');
    partes.push(sepFino);
    partes.push(`🚚 Unidad: ${unidadSeleccionada.marca_modelo}`);
    if (unidadSeleccionada.color) partes.push(`🎨 Color: ${unidadSeleccionada.color}`);
    if (unidadSeleccionada.placas) partes.push(`🔢 Placas: ${unidadSeleccionada.placas}`);

    partes.push(sepFino);
    partes.push('👥 PERSONAL ASIGNADO:');
    partes.push(sepFino);

    const listaPersonal = seleccionados
      .map((id) => personal.find((p) => p.id === id))
      .filter((p): p is Personal => !!p);

    if (listaPersonal.length === 0) {
      partes.push('  (sin personal asignado)');
    } else {
      for (const p of listaPersonal) {
        partes.push(`  • ${p.nombre_completo}`);
      }
    }

    if (notas.trim()) {
      partes.push(sepFino);
      partes.push('📝 NOTAS:');
      partes.push(sepFino);
      partes.push(notas.trim());
    }

    if (fechaFormateada) {
      partes.push(sepFino);
      partes.push(`📅 Fecha: ${fechaFormateada}`);
    }

    partes.push(sepGrueso);
    return partes.join('\n');
  }, [unidadSeleccionada, seleccionados, personal, notas, fechaFormateada]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const t = document.createElement('textarea');
      t.value = texto;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const whatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="generar-texto-mobile pb-28">
      
      {/* BUSCADOR DE UNIDAD (Estilo iOS) */}
      <div className="apple-card">
        <label className="apple-label">UNIDAD</label>
        <div className="cliente-autocomplete" ref={unidadWrapRef}>
          <div 
            className={`apple-select-trigger ${abiertoUnidad ? 'active' : ''}`}
            onClick={() => setAbiertoUnidad(!abiertoUnidad)}
          >
            <span className={unidadSeleccionada ? 'text-primary' : 'text-placeholder'}>
              {unidadSeleccionada 
                ? `${unidadSeleccionada.marca_modelo} ${unidadSeleccionada.color || ''} · ${unidadSeleccionada.placas || ''}`
                : 'Seleccionar unidad...'}
            </span>
            <span className="chevron">▼</span>
          </div>
          
          {abiertoUnidad && (
            <div className="cliente-sugerencias apple-dropdown-large">
              <div className="apple-search-sticky">
                <input
                  type="text"
                  className="apple-input search-input"
                  placeholder="🔍 Buscar unidad, placas o dueño..."
                  value={busquedaUnidad}
                  onChange={(e) => setBusquedaUnidad(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="apple-dropdown-scroll">
                {unidadesFiltradas.map((u) => {
                  const prop = propietarios.find((p) => p.id === u.propietario_id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className="cliente-sugerencia"
                      onClick={() => {
                        setUnidadFisicaId(u.id);
                        setAbiertoUnidad(false);
                        setBusquedaUnidad('');
                      }}
                    >
                      <div className="font-semibold">{u.marca_modelo} {u.color}</div>
                      <div className="text-xs text-secondary">{u.placas} · {prop?.nombre}</div>
                    </button>
                  );
                })}
                {unidadesFiltradas.length === 0 && (
                  <div className="p-4 text-center text-sm text-secondary">No se encontraron unidades</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LISTA DE PERSONAL (Estilo Ajustes iOS) */}
      <div className="apple-card p-0 overflow-hidden">
        <div className="apple-card-header">
          <label className="apple-label">PERSONAL ASIGNADO</label>
          <input
            type="text"
            className="apple-input search-input"
            placeholder="🔍 Buscar operador o auxiliar..."
            value={busquedaPersonal}
            onChange={(e) => setBusquedaPersonal(e.target.value)}
          />
        </div>
        
        <div className="apple-list-scroll">
          {personalFiltrado.map((p) => {
            const activo = seleccionados.includes(p.id);
            return (
              <div
                key={p.id}
                className="apple-list-row"
                onClick={() => togglePersonal(p.id)}
              >
                <div className={`apple-checkbox-circle ${activo ? 'checked' : ''}`}>
                  {activo && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                
                <div className="apple-list-info">
                  <div className="apple-list-title">
                    {p.nombre_completo}
                  </div>
                  {p.apodo && <div className="apple-list-subtitle">({p.apodo})</div>}
                </div>
                
                {p.rol !== 'sin_definir' && (
                  <span className={`apple-badge-rol rol-${p.rol}`}>
                    {etiquetaRolCorto(p.rol)}
                  </span>
                )}
              </div>
            );
          })}
          {personalFiltrado.length === 0 && (
             <div className="p-4 text-center text-sm text-secondary">No se encontró personal</div>
          )}
        </div>
      </div>

      {/* FECHA Y NOTAS */}
      <div className="apple-card">
        <label className="apple-label">FECHA (OPCIONAL)</label>
        <div className="input-with-icon">
          <input
            type="text"
            className="apple-input pr-icon"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            onBlur={normalizarFechaTexto}
            placeholder="DD/MM/AAAA"
            inputMode="numeric"
          />
          <button type="button" className="icon-btn" onClick={abrirPicker}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </button>
          <input
            ref={pickerFechaRef}
            type="date"
            value={fechaISO}
            onChange={(e) => { if(e.target.value) setFecha(e.target.value.split('-').reverse().join('/')); }}
            className="hidden-date-input"
            tabIndex={-1}
          />
        </div>
      </div>

      <div className="apple-card">
        <label className="apple-label">NOTAS (OPCIONAL)</label>
        <textarea
          className="apple-input w-full"
          value={notas}
          onChange={(e) => setNotas(e.target.value.toUpperCase())}
          placeholder="Si no escribes nada, no aparecerá..."
          rows={3}
        />
      </div>

      {/* BARRA FLOTANTE INFERIOR */}
      {unidadSeleccionada && (
        <div className="sticky-bottom-bar">
          <div className="sticky-bottom-content">
             <button
                type="button"
                className={`btn-apple btn-apple-secondary flex-1 ${copiado ? 'success' : ''}`}
                onClick={copiar}
              >
                {copiado ? '✓ Copiado' : '📋 Copiar'}
              </button>
              <button
                type="button"
                className="btn-apple btn-apple-whatsapp flex-1"
                onClick={whatsapp}
              >
                💬 WhatsApp
              </button>
          </div>
        </div>
      )}
    </div>
  );
}