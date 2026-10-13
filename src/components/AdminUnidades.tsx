import { useState } from 'react';
import {
  useCatalogo,
  crearUnidadFisica,
  eliminarUnidadFisica,
} from '../hooks/useCatalogo';

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
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  return (
    <div className="admin-seccion">
      <div className="admin-header">
        <h2>Unidades ({unidades.length})</h2>
        <button
          type="button"
          className="btn-add-punto"
          style={{ width: 'auto', padding: '10px 20px' }}
          onClick={() => setMostrarForm(!mostrarForm)}
        >
          {mostrarForm ? 'Cancelar' : '+ Agregar unidad'}
        </button>
      </div>

      {mostrarForm && (
        <div className="form-card">
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

          <div className="form-group">
            <label>Marca y modelo *</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="NISSAN NP300"
            />
          </div>

          <div className="row-2">
            <div className="form-group">
              <label>Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="GRIS"
              />
            </div>
            <div className="form-group">
              <label>Placas</label>
              <input
                type="text"
                value={placas}
                onChange={(e) => setPlacas(e.target.value)}
                placeholder="30D7AA"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notas</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="button" className="btn-primary" onClick={guardar}>
            Guardar unidad
          </button>
        </div>
      )}

      <div className="lista-cards">
        {unidades.map((u) => {
          const prop = propietarios.find((p) => p.id === u.propietario_id);
          return (
            <div key={u.id} className="card-item">
              <div className="card-info">
                <div className="card-titulo">
                  {u.marca_modelo}
                  {u.color ? ` · ${u.color}` : ''}
                </div>
                <div className="card-subtitulo">
                  {u.placas && `Placas: ${u.placas}`}
                  {prop && ` · ${prop.nombre}`}
                </div>
              </div>
              <button
                type="button"
                className="btn-remove-punto"
                onClick={() => eliminar(u.id)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}