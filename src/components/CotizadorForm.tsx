import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calcularCotizacion } from '../lib/cotizacionEngine';
import type {
  CotizacionResult,
  Maniobras,
  PuntoCotizacion,
  Unidad,
} from '../lib/types';
import { SelectorUbicacion } from './SelectorUbicacion';
import { DesgloseCotizacion } from './DesgloseCotizacion';

export function CotizadorForm() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [unidadId, setUnidadId] = useState<number | null>(null);

  const [puntosCarga, setPuntosCarga] = useState<PuntoCotizacion[]>([
    { ubicacionId: null, porcentaje: 100 },
  ]);

  const [puntosEntrega, setPuntosEntrega] = useState<PuntoCotizacion[]>([
    { ubicacionId: null, porcentaje: 100 },
  ]);

  const [maniobras, setManiobras] = useState<Maniobras>('incluidas');
  const [montoManiobras, setMontoManiobras] = useState(0);

  const [conEstadia, setConEstadia] = useState(false);
  const [diasEstadia, setDiasEstadia] = useState(0);
  const [costoPorDia, setCostoPorDia] = useState(0);

  const [resultado, setResultado] = useState<CotizacionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    supabase
      .from('unidades')
      .select('id, nombre')
      .eq('activo', true)
      .order('orden_display')
      .then(({ data }) => setUnidades(data ?? []));
  }, []);

  // ====== CÁLCULO EN VIVO (sin debounce) ======
  useEffect(() => {
    if (!unidadId) {
      setResultado(null);
      setError(null);
      return;
    }

    const hayEntregas = puntosEntrega.some((p) => p.ubicacionId);
    if (!hayEntregas) {
      setResultado(null);
      setError(null);
      return;
    }

    const currentId = ++requestIdRef.current;

    (async () => {
      try {
        const res = await calcularCotizacion({
          unidadId,
          puntosCarga,
          puntosEntrega,
          maniobras,
          montoManiobras,
          diasEstadia: conEstadia ? diasEstadia : 0,
          costoPorDia: conEstadia ? costoPorDia : 0,
        });

        if (currentId === requestIdRef.current) {
          setResultado(res);
          setError(null);
        }
      } catch (e: unknown) {
        if (currentId === requestIdRef.current) {
          setError(e instanceof Error ? e.message : 'Error al calcular');
          setResultado(null);
        }
      }
    })();
  }, [
    unidadId,
    puntosCarga,
    puntosEntrega,
    maniobras,
    montoManiobras,
    conEstadia,
    diasEstadia,
    costoPorDia,
  ]);

  const agregarCarga = () => {
    setPuntosCarga([...puntosCarga, { ubicacionId: null, porcentaje: 100 }]);
  };

  const quitarCarga = (idx: number) => {
    setPuntosCarga(puntosCarga.filter((_, i) => i !== idx));
  };

  const actualizarCarga = (idx: number, patch: Partial<PuntoCotizacion>) => {
    const nuevos = [...puntosCarga];
    nuevos[idx] = { ...nuevos[idx], ...patch };
    setPuntosCarga(nuevos);
  };

  const agregarEntrega = () => {
    setPuntosEntrega([...puntosEntrega, { ubicacionId: null, porcentaje: 100 }]);
  };

  const quitarEntrega = (idx: number) => {
    setPuntosEntrega(puntosEntrega.filter((_, i) => i !== idx));
  };

  const actualizarEntrega = (idx: number, patch: Partial<PuntoCotizacion>) => {
    const nuevos = [...puntosEntrega];
    nuevos[idx] = { ...nuevos[idx], ...patch };
    setPuntosEntrega(nuevos);
  };

  return (
    <div className="cotizador">
      <h1>Cotizador de Transporte</h1>

      <div className="form-card">
        {/* Unidad */}
        <div className="form-group">
          <label>Tipo de Unidad</label>
          <select
            value={unidadId ?? ''}
            onChange={(e) => setUnidadId(Number(e.target.value) || null)}
          >
            <option value="">Seleccionar unidad...</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Puntos de carga */}
        <div className="puntos-seccion">
          <div className="puntos-header">Puntos de carga (opcional)</div>

          {puntosCarga.map((punto, idx) => (
            <div key={idx} className="punto-item">
              <div className="punto-ubicacion">
                <SelectorUbicacion
                  label=""
                  value={punto.ubicacionId}
                  onChange={(id) => actualizarCarga(idx, { ubicacionId: id })}
                  placeholder="Buscar ubicación..."
                />
              </div>

              <div className="punto-pct">
                <label>%</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={200}
                  value={punto.porcentaje === 0 ? '' : punto.porcentaje}
                  onChange={(e) =>
                    actualizarCarga(idx, {
                      porcentaje:
                        e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  placeholder="100"
                />
              </div>

              {puntosCarga.length > 1 && (
                <button
                  type="button"
                  className="btn-remove-punto"
                  onClick={() => quitarCarga(idx)}
                  title="Eliminar"
                >
                  ✕
                </button>
              )}
              {puntosCarga.length === 1 && <div />}
            </div>
          ))}

          <button type="button" className="btn-add-punto" onClick={agregarCarga}>
            + Agregar punto de carga
          </button>
        </div>

        {/* Puntos de entrega */}
        <div className="puntos-seccion puntos-entrega">
          <div className="puntos-header puntos-header-entrega">
            <span className="puntos-icono-entrega">📍</span>
            Puntos de entrega
          </div>

          {puntosEntrega.map((punto, idx) => (
            <div key={idx} className="punto-item">
              <div className="punto-ubicacion">
                <SelectorUbicacion
                  label=""
                  value={punto.ubicacionId}
                  onChange={(id) => actualizarEntrega(idx, { ubicacionId: id })}
                  placeholder="Ciudad o estado de entrega..."
                />
              </div>

              <div className="punto-pct">
                <label>%</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={200}
                  value={punto.porcentaje === 0 ? '' : punto.porcentaje}
                  onChange={(e) =>
                    actualizarEntrega(idx, {
                      porcentaje:
                        e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  placeholder="100"
                />
              </div>

              {puntosEntrega.length > 1 && (
                <button
                  type="button"
                  className="btn-remove-punto"
                  onClick={() => quitarEntrega(idx)}
                  title="Eliminar"
                >
                  ✕
                </button>
              )}
              {puntosEntrega.length === 1 && <div />}
            </div>
          ))}

          <button
            type="button"
            className="btn-add-punto btn-add-punto-entrega"
            onClick={agregarEntrega}
          >
            + Agregar punto de entrega
          </button>
        </div>

        {/* Maniobras */}
        <div className="form-group">
          <label>Maniobras de carga y descarga</label>
          <div className="radio-vertical">
            <label className="radio-line">
              <input
                type="radio"
                value="incluidas"
                checked={maniobras === 'incluidas'}
                onChange={() => {
                  setManiobras('incluidas');
                  setMontoManiobras(0);
                }}
              />
              Incluye maniobras de carga y descarga
            </label>

            <label className="radio-line">
              <input
                type="radio"
                value="sin_costo"
                checked={maniobras === 'sin_costo'}
                onChange={() => {
                  setManiobras('sin_costo');
                  setMontoManiobras(0);
                }}
              />
              Con maniobras incluidas (sin costo extra)
            </label>

            <label className="radio-line">
              <input
                type="radio"
                value="mas"
                checked={maniobras === 'mas'}
                onChange={() => setManiobras('mas')}
              />
              Más maniobras
            </label>
          </div>

          {maniobras === 'mas' && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Monto de maniobras (opcional)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={montoManiobras === 0 ? '' : montoManiobras}
                onChange={(e) =>
                  setMontoManiobras(
                    e.target.value === '' ? 0 : Number(e.target.value)
                  )
                }
                placeholder="Dejar vacío si no aplica costo"
              />
              <small className="hint">
                Si lo dejas vacío, solo aparecerá "Más maniobras" en la
                descripción sin costo extra
              </small>
            </div>
          )}
        </div>

        {/* Estadías */}
        <div className="seccion-estadia">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={conEstadia}
              onChange={(e) => {
                setConEstadia(e.target.checked);
                if (!e.target.checked) {
                  setDiasEstadia(0);
                  setCostoPorDia(0);
                }
              }}
            />
            <strong>Agregar estadía</strong>
          </label>

          {conEstadia && (
            <div className="subseccion">
              <div className="row-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Días</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={diasEstadia === 0 ? '' : diasEstadia}
                    onChange={(e) =>
                      setDiasEstadia(
                        e.target.value === '' ? 0 : Number(e.target.value)
                      )
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Costo por día</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={costoPorDia === 0 ? '' : costoPorDia}
                    onChange={(e) =>
                      setCostoPorDia(
                        e.target.value === '' ? 0 : Number(e.target.value)
                      )
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              {diasEstadia > 0 && costoPorDia > 0 && (
                <div className="estadia-total">
                  Subtotal estadía:{' '}
                  <strong>
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(diasEstadia * costoPorDia)}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <div className="error-box">{error}</div>}

        {!resultado && !error && !unidadId && (
          <div className="info-box">
            Selecciona una unidad para ver el cálculo automático
          </div>
        )}
      </div>

      {resultado && <DesgloseCotizacion resultado={resultado} />}
    </div>
  );
}