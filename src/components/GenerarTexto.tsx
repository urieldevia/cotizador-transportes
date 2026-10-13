import { useState, useMemo } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';
import type { Personal } from '../lib/types';

const NOMBRE_EMPRESA = 'TRANSPORTES RAMÍREZ';

export function GenerarTexto() {
  const { unidades, personal, propietarios } = useCatalogo();
  const [unidadFisicaId, setUnidadFisicaId] = useState<number | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [notas, setNotas] = useState('');
  const [fecha, setFecha] = useState('');
  const [copiado, setCopiado] = useState(false);

  const unidadFisica = useMemo(
    () => unidades.find((u) => u.id === unidadFisicaId) || null,
    [unidades, unidadFisicaId]
  );

  const propietario = useMemo(() => {
    if (!unidadFisica?.propietario_id) return null;
    return propietarios.find((p) => p.id === unidadFisica.propietario_id);
  }, [unidadFisica, propietarios]);

  const togglePersonal = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const fechaFormateada = useMemo(() => {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  }, [fecha]);

  const texto = useMemo(() => {
    if (!unidadFisica) return '';

    const sepGrueso = '━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const sepFino = '───────────────────────────';

    const partes: string[] = [];

    partes.push(sepGrueso);
    partes.push(`   🚛 ${NOMBRE_EMPRESA}`);
    partes.push(sepGrueso);
    partes.push(sepFino);

    partes.push('📋 DATOS DE LA UNIDAD:');
    partes.push(sepFino);
    partes.push(`🚚 Unidad: ${unidadFisica.marca_modelo}`);
    if (unidadFisica.color) {
      partes.push(`🎨 Color: ${unidadFisica.color}`);
    }
    if (unidadFisica.placas) {
      partes.push(`🔢 Placas: ${unidadFisica.placas}`);
    }

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
  }, [unidadFisica, seleccionados, personal, notas, fechaFormateada]);

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

  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div className="generar-texto">
      {/* Unidad */}
      <div className="form-card">
        <div className="form-group">
          <label>Unidad</label>
          <select
            value={unidadFisicaId ?? ''}
            onChange={(e) => setUnidadFisicaId(Number(e.target.value) || null)}
          >
            <option value="">Seleccionar unidad...</option>
            {unidades.map((u) => {
              const prop = propietarios.find((p) => p.id === u.propietario_id);
              return (
                <option key={u.id} value={u.id}>
                  {u.marca_modelo}
                  {u.color ? ` ${u.color}` : ''}
                  {u.placas ? ` · ${u.placas}` : ''}
                  {prop ? ` · ${prop.nombre}` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {unidadFisica && (
          <div className="unidad-info">
            <div>
              <strong>Marca:</strong> {unidadFisica.marca_modelo}
            </div>
            {unidadFisica.color && (
              <div>
                <strong>Color:</strong> {unidadFisica.color}
              </div>
            )}
            {unidadFisica.placas && (
              <div>
                <strong>Placas:</strong> {unidadFisica.placas}
              </div>
            )}
            {propietario && (
              <div>
                <strong>Propietario:</strong> {propietario.nombre}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal */}
      <div className="form-card">
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Personal asignado</label>
          <small className="hint">
            Selecciona uno o varios. Pueden ser choferes o auxiliares.
          </small>
        </div>

        <div className="personal-lista">
          {personal.map((p) => {
            const activo = seleccionados.includes(p.id);
            return (
              <label
                key={p.id}
                className={`personal-item ${activo ? 'activo' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => togglePersonal(p.id)}
                />
                <div className="personal-info">
                  <span className="personal-nombre">{p.nombre_completo}</span>
                  {p.apodo && (
                    <span className="personal-apodo">({p.apodo})</span>
                  )}
                </div>
                {p.rol !== 'sin_definir' && (
                  <span className={`rol-badge rol-${p.rol}`}>
                    {p.rol === 'chofer'
                      ? 'Chofer'
                      : p.rol === 'auxiliar'
                      ? 'Auxiliar'
                      : 'Chofer/Aux'}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Fecha */}
      <div className="form-card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Fecha (opcional)</label>
          <div className="fecha-row">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="fecha-input"
            />
            {fecha && (
              <button
                type="button"
                className="btn-fecha-hoy"
                onClick={() => setFecha(hoy)}
                title="Usar fecha de hoy"
              >
                Hoy
              </button>
            )}
            {fecha && (
              <button
                type="button"
                className="btn-fecha-clear"
                onClick={() => setFecha('')}
                title="Quitar fecha"
              >
                ✕
              </button>
            )}
          </div>
          <small className="hint">
            Si no seleccionas fecha, no aparecerá en el texto
          </small>
        </div>
      </div>

      {/* Notas */}
      <div className="form-card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Si no escribes nada, no aparecerá en el texto"
            rows={3}
            className="notas-textarea"
          />
        </div>
      </div>

      {/* Preview + acciones */}
      {unidadFisica && (
        <div className="resultado">
          <div className="resultado-header">
            <h2>Vista previa</h2>
          </div>
          <div className="resultado-descripcion">
            <pre className="texto-preview">{texto}</pre>
            <div className="descripcion-acciones">
              <button
                type="button"
                className={`btn-accion ${copiado ? 'copiado' : ''}`}
                onClick={copiar}
              >
                {copiado ? '✓ Copiado' : '📋 Copiar'}
              </button>
              <button
                type="button"
                className="btn-accion btn-whatsapp"
                onClick={whatsapp}
              >
                💬 WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}