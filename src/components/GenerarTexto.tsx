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

  const propietario = useMemo(() => {
    if (!unidadSeleccionada?.propietario_id) return null;
    return propietarios.find((p) => p.id === unidadSeleccionada.propietario_id);
  }, [unidadSeleccionada, propietarios]);

  // Filtros optimizados
  const unidadesFiltradas = useMemo(() => {
    if (!busquedaUnidad.trim()) return unidades.slice(0, 10); // Muestra solo 10 por defecto
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
            className={`apple-input flex justify-between items-center cursor-pointer ${abiertoUnidad ? 'border-apple-blue' : ''}`}
            onClick={() => setAbiertoUnidad(!abiertoUnidad)}
          >
            <span className={unidadSeleccionada ? 'text-black' : 'text-gray-400'}>
              {unidadSeleccionada 
                ? `${unidadSeleccionada.marca_modelo} ${unidadSeleccionada.color || ''} · ${unidadSeleccionada.placas || ''}`
                : 'Seleccionar unidad...'}
            </span>
            <span className="text-gray-400 text-xs">▼</span>
          </div>
          
          {abiertoUnidad && (
            <div className="cliente-sugerencias" style={{ maxHeight: '300px' }}>
              <div className="p-2 sticky top-0 bg-white z-10">
                <input
                  type="text"
                  className="apple-input w-full text-sm"
                  placeholder="Buscar unidad, placas o dueño..."
                  value={busquedaUnidad}
                  onChange={(e) => setBusquedaUnidad(e.target.value)}
                  autoFocus
                />
              </div>
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
                    <div className="text-xs text-gray-500">{u.placas} · {prop?.nombre}</div>
                  </button>
                );
              })}
              {unidadesFiltradas.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500">No se encontraron unidades</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LISTA DE PERSONAL (Estilo Ajustes iOS) */}
      <div className="apple-card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <label className="apple-label mb-2">PERSONAL ASIGNADO</label>
          <input
            type="text"
            className="apple-input w-full text-sm bg-white"
            placeholder="🔍 Buscar operador o auxiliar..."
            value={busquedaPersonal}
            onChange={(e) => setBusquedaPersonal(e.target.value)}
          />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {personalFiltrado.map((p) => {
            const activo = seleccionados.includes(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-4 border-b border-gray-100 active:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => togglePersonal(p.id)}
              >
                {/* Checkbox iOS */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${activo ? 'bg-apple-blue border-apple-blue' : 'border-gray-300'}`}>
                  {activo && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`text-base truncate ${activo ? 'font-semibold text-black' : 'text-gray-800'}`}>
                    {p.nombre_completo}
                  </div>
                  {p.apodo && <div className="text-xs text-gray-500">({p.apodo})</div>}
                </div>
                
                {p.rol !== 'sin_definir' && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide
                    ${p.rol === 'chofer' ? 'bg-blue-100 text-blue-600' : 
                      p.rol === 'auxiliar' ? 'bg-green-100 text-green-600' : 
                      'bg-purple-100 text-purple-600'}`}
                  >
                    {etiquetaRolCorto(p.rol)}
                  </span>
                )}
              </div>
            );
          })}
          {personalFiltrado.length === 0 && (
             <div className="p-4 text-center text-sm text-gray-500">No se encontró personal</div>
          )}
        </div>
      </div>

      {/* FECHA Y NOTAS */}
      <div className="apple-card">
        <label className="apple-label">FECHA (OPCIONAL)</label>
        <div className="relative">
          <input
            type="text"
            className="apple-input w-full pr-10"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            onBlur={normalizarFechaTexto}
            placeholder="DD/MM/AAAA"
            inputMode="numeric"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-apple-blue"
            onClick={abrirPicker}
          >
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
          className="apple-input w-full resize-none"
          value={notas}
          onChange={(e) => setNotas(e.target.value.toUpperCase())}
          placeholder="Si no escribes nada, no aparecerá..."
          rows={3}
        />
      </div>

      {/* BARRA FLOTANTE INFERIOR (Solo si hay unidad seleccionada) */}
      {unidadSeleccionada && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-50 md:relative md:bg-transparent md:border-0 md:p-0 md:mt-4">
          <div className="max-w-[760px] mx-auto flex gap-2">
             <button
                type="button"
                className={`btn-apple flex-1 ${copiado ? 'btn-apple-whatsapp' : 'btn-apple-secondary'}`}
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