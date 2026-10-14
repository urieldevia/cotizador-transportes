import { useState, memo } from 'react';
import {
  useCatalogo,
  crearUnidadFisica,
  eliminarUnidadFisica,
} from '../hooks/useCatalogo';
import {
  AppleButton,
  AppleInput,
  AppleCard,
} from './ui';
import type { UnidadFisica, Propietario } from '../lib/types';

interface UnidadRowProps {
  unidad: UnidadFisica;
  propietario?: Propietario;
  onEliminar: (id: number) => void;
}

const UnidadRow = memo(
  ({ unidad, propietario, onEliminar }: UnidadRowProps) => {
    return (
      <div className="card-item">
        <div className="card-info">
          <div className="card-titulo">
            {unidad.marca_modelo}
            {unidad.color && ` · ${unidad.color}`}
          </div>
          <div className="card-subtitulo">
            {unidad.placas && (
              <span
                style={{
                  fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
                  marginRight: 8,
                }}
              >
                {unidad.placas}
              </span>
            )}
            {propietario && (
              <>
                <span style={{ marginRight: 8 }}>·</span>
                {propietario.nombre}
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn-quitar-unidad"
          onClick={() => onEliminar(unidad.id)}
          aria-label="Eliminar unidad"
        >
          ✕
        </button>
      </div>
    );
  }
);

UnidadRow.displayName = 'UnidadRow';

export function AdminUnidades() {
  const { unidades, propietarios, refrescar } = useCatalogo();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [propietarioId, setPropietarioId] = useState<number | null>(null);
  const [marca, setMarca] = useState('');
  const [color, setColor] = useState('');
  const [placas, setPlacas] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setPropietarioId(null);
    setMarca('');
    setColor('');
    setPlacas('');
    setNotas('');
    setError(null);
  };

  const guardar = async () => {
    if (!marca.trim()) {
      setError('La marca/modelo es obligatorio');
      return;
    }
    try {
      await crearUnidadFisica({
        propietario_id: propietarioId,
        marca_modelo: marca.trim().toUpperCase(),
        color: color.trim().toUpperCase() || null,
        placas: placas.trim().toUpperCase() || null,
        tipo_unidad_id: null,
        notas: notas.trim() || null,
      });
      resetForm();
      setMostrarForm(false);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta unidad?')) return;
    try {
      await eliminarUnidadFisica(id);
      await refrescar();
    } catch {
      alert('Error al eliminar');
    }
  };

  return (
    <div className="admin-seccion">
      <div className="admin-header">
        <h2>Unidades ({unidades.length})</h2>
        <AppleButton
          variant="secondary"
          onClick={() => setMostrarForm(!mostrarForm)}
        >
          {mostrarForm ? 'Cancelar' : '+ Agregar'}
        </AppleButton>
      </div>

      {mostrarForm && (
        <AppleCard>
          <div className="form-group">
            <label>Propietario</label>
            <select
              value={propietarioId ?? ''}
              onChange={(e) =>
                setPropietarioId(Number(e.target.value) || null)
              }
            >
              <option value="">Sin propietario</option>
              {propietarios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <AppleInput
            label="Marca y modelo *"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="NISSAN NP300"
          />

          <div className="row-2">
            <AppleInput
              label="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="GRIS"
            />
            <AppleInput
              label="Placas"
              value={placas}
              onChange={(e) => setPlacas(e.target.value)}
              placeholder="30D7AA"
            />
          </div>

          <AppleInput
            label="Notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Opcional"
          />

          {error && <div className="error-box">{error}</div>}

          <AppleButton onClick={guardar} fullWidth>
            Guardar unidad
          </AppleButton>
        </AppleCard>
      )}

      <div className="lista-cards">
        {unidades.length === 0 && (
          <div className="info-box">No hay unidades registradas aún</div>
        )}
        {unidades.map((u) => {
          const prop = propietarios.find(
            (p) => p.id === u.propietario_id
          );
          return (
            <UnidadRow
              key={u.id}
              unidad={u}
              propietario={prop}
              onEliminar={eliminar}
            />
          );
        })}
      </div>
    </div>
  );
}