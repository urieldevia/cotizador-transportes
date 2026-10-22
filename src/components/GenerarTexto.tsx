import { useState, useMemo, useRef, useEffect } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';
import { normalizarTexto } from '../hooks/useUbicaciones';
import type { Personal } from '../lib/types';

export function GenerarTexto() {
  const { unidades, personal } = useCatalogo();
  const [unidadFisicaId, setUnidadFisicaId] = useState<number | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [notas, setNotas] = useState('');
  const [fecha, setFecha] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [busquedaPersonal, setBusquedaPersonal] = useState('');

  const unidadSeleccionada = useMemo(() => unidades.find((u) => u.id === unidadFisicaId) || null, [unidades, unidadFisicaId]);

  const personalFiltrado = useMemo(() => {
    if (!busquedaPersonal.trim()) return personal;
    const q = normalizarTexto(busquedaPersonal);
    return personal.filter((p) => normalizarTexto(p.nombre_completo).includes(q));
  }, [personal, busquedaPersonal]);

  const togglePersonal = (id: number) => {
    setSeleccionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const texto = useMemo(() => {
    if (!unidadSeleccionada) return '';
    const sep = '━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const partes = [sep, `   🚛 TRANSPORTES RAMÍREZ`, sep, '📋 DATOS DE LA UNIDAD:', `🚚 Unidad: ${unidadSeleccionada.marca_modelo}`];
    if (unidadSeleccionada.color) partes.push(`🎨 Color: ${unidadSeleccionada.color}`);
    if (unidadSeleccionada.placas) partes.push(`🔢 Placas: ${unidadSeleccionada.placas}`);
    partes.push('👥 PERSONAL ASIGNADO:');
    
    const lista = seleccionados.map(id => personal.find(p => p.id === id)).filter((p): p is Personal => !!p);
    if (lista.length === 0) partes.push('  (sin personal asignado)');
    else lista.forEach(p => partes.push(`  • ${p.nombre_completo}`));
    
    if (notas.trim()) { partes.push('📝 NOTAS:', notas.trim()); }
    if (fecha) { partes.push(`📅 Fecha: ${fecha}`); }
    partes.push(sep);
    return partes.join('\n');
  }, [unidadSeleccionada, seleccionados, personal, notas, fecha]);

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="pb-28">
      <div className="apple-card">
        <label className="apple-label">UNIDAD</label>
        <select value={unidadFisicaId ?? ''} onChange={(e) => setUnidadFisicaId(Number(e.target.value) || null)}>
          <option value="">Seleccionar unidad...</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.marca_modelo} {u.placas}</option>)}
        </select>
      </div>

      <div className="apple-card p-0 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <label className="apple-label">PERSONAL ASIGNADO</label>
          <input type="text" className="apple-input text-sm" placeholder="🔍 Buscar personal..." value={busquedaPersonal} onChange={(e) => setBusquedaPersonal(e.target.value)} />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {personalFiltrado.map((p) => {
            const activo = seleccionados.includes(p.id);
            return (
              <div key={p.id} className="apple-list-row" onClick={() => togglePersonal(p.id)}>
                <div className={`apple-checkbox-circle ${activo ? 'checked' : ''}`}>
                  {activo && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="apple-list-title">{p.nombre_completo}</div>
                  {p.apodo && <div className="apple-list-subtitle">({p.apodo})</div>}
                </div>
                <span className={`apple-badge-rol rol-${p.rol}`}>{p.rol}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="apple-card">
        <label className="apple-label">NOTAS</label>
        <textarea className="apple-input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas opcionales..." />
      </div>

      {unidadSeleccionada && (
        <div className="sticky-bottom-bar">
          <div className="sticky-bottom-content">
             <button className="btn-apple btn-apple-secondary flex-1" onClick={copiar}>{copiado ? '✓ Copiado' : '📋 Copiar'}</button>
             <button className="btn-apple btn-apple-whatsapp flex-1" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`)}>💬 WhatsApp</button>
          </div>
        </div>
      )}
    </div>
  );
}