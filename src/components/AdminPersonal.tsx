import { useState } from 'react';
import {
  useCatalogo,
  crearPersonal,
  eliminarPersonal,
} from '../hooks/useCatalogo';
import type { RolPersonal } from '../lib/types';

function etiquetaRol(rol: string): string {
  if (rol === 'chofer') return 'Chofer';
  if (rol === 'auxiliar') return 'Auxiliar';
  if (rol === 'ambos') return 'Chofer/Aux';
  return 'Sin definir';
}

export function AdminPersonal() {
  const { personal, refrescar } = useCatalogo();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apodo, setApodo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<RolPersonal>('sin_definir');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNombre('');
    setApodo('');
    setTelefono('');
    setRol('sin_definir');
    setError(null);
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    try {
      await crearPersonal({
        nombre_completo: nombre.trim().toUpperCase(),
        apodo: apodo.trim() || null,
        telefono: telefono.trim() || null,
        rol,
      });
      resetForm();
      setMostrarForm(false);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar a esta persona?')) return;
    try {
      await eliminarPersonal(id);
      await refrescar();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  return (
    <div className="admin-seccion">
      <div className="admin-header">
        <h2>Personal ({personal.length})</h2>
        <button
          type="button"
          className="btn-add-punto"
          style={{ width: 'auto', padding: '10px 20px' }}
          onClick={() => setMostrarForm(!mostrarForm)}
        >
          {mostrarForm ? 'Cancelar' : '+ Agregar'}
        </button>
      </div>

      {mostrarForm && (
        <div className="form-card">
          <div className="form-group">
            <label>Nombre completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="SAID HERNANDEZ HERNANDEZ"
            />
          </div>

          <div className="row-2">
            <div className="form-group">
              <label>Apodo</label>
              <input
                type="text"
                value={apodo}
                onChange={(e) => setApodo(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Rol</label>
            <div className="radio-vertical">
              {(
                [
                  ['chofer', 'Chofer'],
                  ['auxiliar', 'Auxiliar'],
                  ['ambos', 'Chofer y Auxiliar'],
                  ['sin_definir', 'Sin definir'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="radio-line">
                  <input
                    type="radio"
                    value={value}
                    checked={rol === value}
                    onChange={() => setRol(value as RolPersonal)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="button" className="btn-primary" onClick={guardar}>
            Guardar
          </button>
        </div>
      )}

      <div className="lista-cards">
        {personal.map((p) => (
          <div key={p.id} className="card-item">
            <div className="card-info">
              <div className="card-titulo">
                {p.nombre_completo}
                {p.apodo && ` (${p.apodo})`}
              </div>
              <div className="card-subtitulo">
                {etiquetaRol(p.rol)}
                {p.telefono && ` · ${p.telefono}`}
              </div>
            </div>
            <button
              type="button"
              className="btn-remove-punto"
              onClick={() => eliminar(p.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}