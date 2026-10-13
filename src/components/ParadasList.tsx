import type { Parada, TipoParada } from '../lib/types';

interface Props {
  paradas: Parada[];
  onChange: (paradas: Parada[]) => void;
}

function nuevaParada(tipo: TipoParada): Parada {
  return {
    id: Math.random().toString(36).substring(2, 9),
    tipo,
    direccion: '',
    hora: '',
    notas: '',
  };
}

export function ParadasList({ paradas, onChange }: Props) {
  const agregar = (tipo: TipoParada) => {
    onChange([...paradas, nuevaParada(tipo)]);
  };

  const actualizar = (id: string, patch: Partial<Parada>) => {
    onChange(paradas.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const eliminar = (id: string) => {
    onChange(paradas.filter((p) => p.id !== id));
  };

  return (
    <div className="paradas-wrap">
      <div className="paradas-header">
        <span>Trazabilidad ({paradas.length})</span>
        <div className="paradas-botones">
          <button
            type="button"
            className="btn-parada-add carga"
            onClick={() => agregar('carga')}
          >
            + Carga
          </button>
          <button
            type="button"
            className="btn-parada-add descarga"
            onClick={() => agregar('descarga')}
          >
            + Descarga
          </button>
        </div>
      </div>

      {paradas.length === 0 && (
        <div className="paradas-vacio">
          Sin paradas registradas
        </div>
      )}

      <div className="paradas-lista">
        {paradas.map((p, idx) => (
          <div key={p.id} className={`parada-item ${p.tipo}`}>
            <div className="parada-header">
              <span className={`parada-badge ${p.tipo}`}>
                {p.tipo === 'carga' ? '📦 CARGA' : '🏁 DESCARGA'}
              </span>
              <span className="parada-num">#{idx + 1}</span>
              <button
                type="button"
                className="btn-parada-remove"
                onClick={() => eliminar(p.id)}
              >
                ✕
              </button>
            </div>

            <div className="parada-campos">
              <div className="parada-campo">
                <label>Dirección / Punto</label>
                <input
                  type="text"
                  value={p.direccion}
                  onChange={(e) =>
                    actualizar(p.id, {
                      direccion: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="BODEGA CENTRAL"
                />
              </div>
              <div className="parada-campo hora">
                <label>Hora</label>
                <input
                  type="time"
                  value={p.hora}
                  onChange={(e) => actualizar(p.id, { hora: e.target.value })}
                />
              </div>
            </div>

            <div className="parada-campo">
              <label>Notas (opcional)</label>
              <input
                type="text"
                value={p.notas}
                onChange={(e) =>
                  actualizar(p.id, { notas: e.target.value })
                }
                placeholder="Firmó Juan Pérez"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}