import { useState, useMemo, useEffect, useRef } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';
import {
  useVolantes,
  obtenerSiguienteFolio,
  guardarVolante,
  actualizarVolante,
  eliminarVolante,
} from '../hooks/useVolantes';
import { ParadasList } from './ParadasList';
import type { AsignacionUnidad, Volante } from '../lib/types';
import { normalizarTexto } from '../hooks/useUbicaciones';

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const REGISTRADORES = [
  'RAFAEL RAMIREZ MORENO',
  'ERICK RAMIREZ RONQUILLO',
];

function nuevaAsignacion(unidadFisicaId: number): AsignacionUnidad {
  return {
    id: Math.random().toString(36).substring(2, 9),
    unidadFisicaId,
    operadorId: null,
    auxiliaresIds: [],
    destino: '',
    costo: '',
    paradas: [],
  };
}

function fechaTextoAISO(texto: string): string {
  const m = texto.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (!m) return '';
  let [, d, mo, y] = m;
  if (y.length === 2) y = '20' + y;
  return `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function fechaISOATexto(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

export function VolanteTab() {
  const { unidades, personal, propietarios } = useCatalogo();
  const { volantes, refrescar } = useVolantes();

  const [vista, setVista] = useState<'nuevo' | 'guardados'>('nuevo');
  const [volanteId, setVolanteId] = useState<number | null>(null);

  const [folio, setFolio] = useState('');
  const [fechaTexto, setFechaTexto] = useState('');
  const [cliente, setCliente] = useState('');
  const [origen, setOrigen] = useState('');
  const [registroA, setRegistroA] = useState('');

  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<number[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionUnidad[]>([]);

  const [descripcionServicios, setDescripcionServicios] = useState('');
  const [descripcionCarga, setDescripcionCarga] = useState('');

  // Filtros
  const [filtroUnidades, setFiltroUnidades] = useState('');
  const [filtroAuxiliares, setFiltroAuxiliares] = useState('');
  const [clienteSugerenciasAbiertas, setClienteSugerenciasAbiertas] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pickerFechaRef = useRef<HTMLInputElement>(null);
  const clienteWrapRef = useRef<HTMLDivElement>(null);

  // Cargar folio inicial
  useEffect(() => {
    if (vista === 'nuevo' && !volanteId) {
      obtenerSiguienteFolio().then(setFolio);
    }
  }, [vista, volanteId]);

  // Cerrar sugerencias de cliente al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        clienteWrapRef.current &&
        !clienteWrapRef.current.contains(e.target as Node)
      ) {
        setClienteSugerenciasAbiertas(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const operadores = useMemo(
    () => personal.filter((p) => p.rol === 'chofer' || p.rol === 'ambos'),
    [personal]
  );
  const auxiliaresDisponibles = useMemo(() => {
    const base = personal.filter(
      (p) => p.rol === 'auxiliar' || p.rol === 'ambos'
    );
    if (!filtroAuxiliares.trim()) return base;
    const q = normalizarTexto(filtroAuxiliares);
    return base.filter(
      (p) =>
        normalizarTexto(p.nombre_completo).includes(q) ||
        (p.apodo && normalizarTexto(p.apodo).includes(q))
    );
  }, [personal, filtroAuxiliares]);

  const unidadesFiltradas = useMemo(() => {
    if (!filtroUnidades.trim()) return unidades;
    const q = normalizarTexto(filtroUnidades);
    return unidades.filter((u) => {
      const prop = propietarios.find((p) => p.id === u.propietario_id);
      const texto = normalizarTexto(
        `${u.marca_modelo} ${u.color || ''} ${u.placas || ''} ${
          prop?.nombre || ''
        }`
      );
      return texto.includes(q);
    });
  }, [unidades, propietarios, filtroUnidades]);

  // Clientes únicos de volantes previos
  const clientesHistoricos = useMemo(() => {
    const set = new Set<string>();
    volantes.forEach((v) => {
      if (v.cliente && v.cliente.trim()) set.add(v.cliente.trim());
    });
    return Array.from(set).sort();
  }, [volantes]);

  const clientesSugeridos = useMemo(() => {
    if (!cliente.trim() || cliente.length < 2) return [];
    const q = normalizarTexto(cliente);
    return clientesHistoricos
      .filter((c) => normalizarTexto(c).includes(q))
      .slice(0, 6);
  }, [cliente, clientesHistoricos]);

  const fechaISO = useMemo(() => fechaTextoAISO(fechaTexto), [fechaTexto]);

  const fechaFormateada = useMemo(() => {
    if (!fechaISO) return '';
    const [y, m, d] = fechaISO.split('-');
    return `${parseInt(d)} DE ${MESES[parseInt(m) - 1]} DE ${y}`;
  }, [fechaISO]);

  // === Unidades ===
  const toggleUnidad = (unidadId: number) => {
    setUnidadesSeleccionadas((prev) => {
      const yaEsta = prev.includes(unidadId);
      if (yaEsta) {
        setAsignaciones((as) =>
          as.filter((a) => a.unidadFisicaId !== unidadId)
        );
        return prev.filter((x) => x !== unidadId);
      } else {
        setAsignaciones((as) => [...as, nuevaAsignacion(unidadId)]);
        return [...prev, unidadId];
      }
    });
  };

  const actualizarAsignacion = (id: string, patch: Partial<AsignacionUnidad>) => {
    setAsignaciones((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  };

  const duplicarAsignacion = (id: string) => {
    const orig = asignaciones.find((a) => a.id === id);
    if (!orig) return;
    const copia: AsignacionUnidad = {
      ...orig,
      id: Math.random().toString(36).substring(2, 9),
      paradas: orig.paradas.map((p) => ({
        ...p,
        id: Math.random().toString(36).substring(2, 9),
      })),
    };
    setAsignaciones((prev) => [...prev, copia]);
    if (orig.unidadFisicaId) {
      setUnidadesSeleccionadas((prev) =>
        prev.includes(orig.unidadFisicaId!)
          ? prev
          : [...prev, orig.unidadFisicaId!]
      );
    }
  };

  const toggleAuxiliar = (asignacionId: string, personalId: number) => {
    setAsignaciones((prev) =>
      prev.map((a) => {
        if (a.id !== asignacionId) return a;
        const yaEsta = a.auxiliaresIds.includes(personalId);
        return {
          ...a,
          auxiliaresIds: yaEsta
            ? a.auxiliaresIds.filter((x) => x !== personalId)
            : [...a.auxiliaresIds, personalId],
        };
      })
    );
  };

  const heredarDestino = (id: string, index: number) => {
    if (index === 0) return;
    const anterior = asignaciones[index - 1];
    actualizarAsignacion(id, { destino: anterior.destino });
  };

  // Fecha
  const abrirPicker = () => {
    pickerFechaRef.current?.showPicker?.();
    pickerFechaRef.current?.click();
  };
  const onFechaPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) setFechaTexto(fechaISOATexto(iso));
  };
  const normalizarFechaTexto = () => {
    const iso = fechaTextoAISO(fechaTexto);
    if (iso) setFechaTexto(fechaISOATexto(iso));
  };

  // Guardar
  const handleGuardar = async () => {
    if (!folio.trim()) {
      setMsg('El folio es obligatorio');
      return;
    }
    if (asignaciones.length === 0) {
      setMsg('Selecciona al menos una unidad');
      return;
    }
    setGuardando(true);
    setMsg(null);

    const payload = {
      folio: folio.trim(),
      fecha: fechaISO || null,
      cliente: cliente.trim().toUpperCase(),
      origen: origen.trim().toUpperCase(),
      registro_a: registroA.trim().toUpperCase(),
      descripcion_servicios: descripcionServicios.trim(),
      descripcion_carga: descripcionCarga.trim(),
      unidades: asignaciones,
    };

    try {
      if (volanteId) {
        await actualizarVolante(volanteId, payload);
        setMsg('✓ Volante actualizado');
      } else {
        const id = await guardarVolante(payload);
        setVolanteId(id);
        setMsg('✓ Volante guardado');
      }
      await refrescar();
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleNuevo = async () => {
    setVolanteId(null);
    setFechaTexto('');
    setCliente('');
    setOrigen('');
    setRegistroA('');
    setUnidadesSeleccionadas([]);
    setAsignaciones([]);
    setDescripcionServicios('');
    setDescripcionCarga('');
    setFiltroUnidades('');
    setFiltroAuxiliares('');
    setVista('nuevo');
    setMsg(null);
    const f = await obtenerSiguienteFolio();
    setFolio(f);
  };

  const cargarVolante = (v: Volante) => {
    setVolanteId(v.id);
    setFolio(v.folio);
    setFechaTexto(fechaISOATexto(v.fecha || ''));
    setCliente(v.cliente || '');
    setOrigen(v.origen || '');
    setRegistroA(v.registro_a || '');
    setDescripcionServicios(v.descripcion_servicios || '');
    setDescripcionCarga(v.descripcion_carga || '');

    const asigs = Array.isArray(v.unidades) ? v.unidades : [];
    setAsignaciones(asigs);
    setUnidadesSeleccionadas(
      asigs
        .map((a) => a.unidadFisicaId)
        .filter((id): id is number => id !== null)
    );

    setVista('nuevo');
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar este volante?')) return;
    try {
      await eliminarVolante(id);
      await refrescar();
      if (volanteId === id) handleNuevo();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const imprimir = () => window.print();

  // Filas resueltas
  const filas = asignaciones.map((a) => {
    const unidad = unidades.find((u) => u.id === a.unidadFisicaId);
    const operador = personal.find((p) => p.id === a.operadorId);
    const auxiliares = a.auxiliaresIds
      .map((id) => personal.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p);
    return {
      ...a,
      unidadTexto: unidad
        ? `${unidad.marca_modelo}${unidad.color ? ` ${unidad.color}` : ''}${
            unidad.placas ? ` - ${unidad.placas}` : ''
          }`
        : '',
      operadorTexto: operador?.nombre_completo ?? '',
      auxiliaresTexto: auxiliares.map((x) => x.nombre_completo).join(', '),
    };
  });

  const esMultiple = filas.length > 1;

  // Resumen
  const resumen = useMemo(() => {
    const operadoresUnicos = new Set(
      asignaciones.map((a) => a.operadorId).filter((x): x is number => !!x)
    ).size;
    const auxiliaresUnicos = new Set(
      asignaciones.flatMap((a) => a.auxiliaresIds)
    ).size;
    const totalParadas = asignaciones.reduce(
      (sum, a) => sum + a.paradas.length,
      0
    );
    const costoTotal = asignaciones.reduce((sum, a) => {
      const num = parseFloat(
        String(a.costo).replace(/[^0-9.-]/g, '')
      );
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

    return {
      totalUnidades: asignaciones.length,
      operadoresUnicos,
      auxiliaresUnicos,
      totalParadas,
      costoTotal,
    };
  }, [asignaciones]);

  return (
    <div className="volante-tab">
      <div className="no-print">
        <h1>Volante de Registro</h1>

        {/* Toggle vista */}
        <div
          className="subtabs-samsung"
          style={{ gridTemplateColumns: '1fr 1fr' }}
        >
          <button
            type="button"
            className={`subtab-item ${vista === 'nuevo' ? 'active' : ''}`}
            onClick={() => setVista('nuevo')}
          >
            {volanteId ? 'Editando' : 'Nuevo'}
          </button>
          <button
            type="button"
            className={`subtab-item ${vista === 'guardados' ? 'active' : ''}`}
            onClick={() => setVista('guardados')}
          >
            Guardados ({volantes.length})
          </button>
        </div>

        {vista === 'guardados' && (
          <div className="volantes-lista">
            {volantes.length === 0 && (
              <div className="info-box">No hay volantes guardados aún</div>
            )}
            {volantes.map((v) => (
              <div key={v.id} className="card-item">
                <div className="card-info" onClick={() => cargarVolante(v)}>
                  <div className="card-titulo">
                    {v.folio} · {v.cliente || 'Sin cliente'}
                  </div>
                  <div className="card-subtitulo">
                    {v.fecha ? fechaISOATexto(v.fecha) : 'Sin fecha'} ·{' '}
                    {Array.isArray(v.unidades) ? v.unidades.length : 0}{' '}
                    unidad(es)
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-remove-punto"
                  onClick={() => handleEliminar(v.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {vista === 'nuevo' && (
          <>
            {/* Info general */}
            <div className="form-card">
              <div className="form-section-titulo">Información general</div>

              <div className="row-2">
                <div className="form-group">
                  <label>Folio</label>
                  <input
                    type="text"
                    value={folio}
                    onChange={(e) => setFolio(e.target.value)}
                    placeholder="VOLANT-754"
                  />
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <div className="fecha-mixta">
                    <input
                      type="text"
                      value={fechaTexto}
                      onChange={(e) => setFechaTexto(e.target.value)}
                      onBlur={normalizarFechaTexto}
                      placeholder="DD/MM/AAAA"
                    />
                    <button
                      type="button"
                      className="btn-picker-fecha"
                      onClick={abrirPicker}
                    >
                      📅
                    </button>
                    <input
                      ref={pickerFechaRef}
                      type="date"
                      value={fechaISO}
                      onChange={onFechaPickerChange}
                      className="hidden-date-input"
                      tabIndex={-1}
                    />
                  </div>
                </div>
              </div>

              <div className="row-2">
                <div className="form-group">
                  <label>Cliente</label>
                  <div className="cliente-autocomplete" ref={clienteWrapRef}>
                    <input
                      type="text"
                      value={cliente}
                      onChange={(e) => {
                        setCliente(e.target.value.toUpperCase());
                        setClienteSugerenciasAbiertas(true);
                      }}
                      onFocus={() => setClienteSugerenciasAbiertas(true)}
                      placeholder="Buscar o escribir cliente..."
                      autoComplete="off"
                    />
                    {clienteSugerenciasAbiertas &&
                      clientesSugeridos.length > 0 && (
                        <div className="cliente-sugerencias">
                          {clientesSugeridos.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="cliente-sugerencia"
                              onClick={() => {
                                setCliente(c);
                                setClienteSugerenciasAbiertas(false);
                              }}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Registró</label>
                  <select
                    value={registroA}
                    onChange={(e) => setRegistroA(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {REGISTRADORES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Origen</label>
                <input
                  type="text"
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value.toUpperCase())}
                  placeholder="Ingresa dirección de carga u origen"
                />
              </div>
            </div>

            {/* Multi-select unidades */}
            <div className="form-card">
              <div className="form-section-titulo">
                Unidades ({unidadesSeleccionadas.length} seleccionadas)
              </div>

              {unidades.length > 6 && (
                <div className="filtro-input">
                  <input
                    type="text"
                    value={filtroUnidades}
                    onChange={(e) => setFiltroUnidades(e.target.value)}
                    placeholder="🔍 Buscar unidad, placas o propietario..."
                  />
                </div>
              )}

              <div className="unidades-chips">
                {unidadesFiltradas.map((u) => {
                  const activo = unidadesSeleccionadas.includes(u.id);
                  const prop = propietarios.find(
                    (p) => p.id === u.propietario_id
                  );
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className={`unidad-chip ${activo ? 'active' : ''}`}
                      onClick={() => toggleUnidad(u.id)}
                    >
                      <span className="unidad-chip-titulo">
                        {u.marca_modelo}
                        {u.color ? ` ${u.color}` : ''}
                      </span>
                      {u.placas && (
                        <span className="unidad-chip-placas">{u.placas}</span>
                      )}
                      {prop && (
                        <span className="unidad-chip-prop">{prop.nombre}</span>
                      )}
                    </button>
                  );
                })}
                {unidadesFiltradas.length === 0 && (
                  <div className="hint">Sin resultados para esa búsqueda</div>
                )}
              </div>

              {unidadesSeleccionadas.length === 0 && (
                <div className="hint" style={{ marginTop: 14 }}>
                  Toca una o varias unidades para asignarles operador y
                  trazabilidad
                </div>
              )}
            </div>

            {/* Asignaciones por unidad */}
            {asignaciones.map((a, index) => {
              const unidadObj = unidades.find(
                (u) => u.id === a.unidadFisicaId
              );
              return (
                <div key={a.id} className="form-card asignacion-card-master">
                  <div className="asignacion-titulo">
                    <div>
                      <span className="asignacion-num-big">
                        Unidad {index + 1}
                      </span>
                      <span className="asignacion-unidad-texto">
                        {' '}
                        {unidadObj?.marca_modelo}
                        {unidadObj?.color ? ` ${unidadObj.color}` : ''}
                        {unidadObj?.placas ? ` · ${unidadObj.placas}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-duplicar"
                      onClick={() => duplicarAsignacion(a.id)}
                      title="Duplicar esta asignación"
                    >
                      📋 Duplicar
                    </button>
                  </div>

                  <div className="row-2">
                    <div className="form-group">
                      <label>Operador</label>
                      <select
                        value={a.operadorId ?? ''}
                        onChange={(e) =>
                          actualizarAsignacion(a.id, {
                            operadorId: Number(e.target.value) || null,
                          })
                        }
                      >
                        <option value="">Seleccionar operador...</option>
                        {operadores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Costo</label>
                      <input
                        type="text"
                        value={a.costo}
                        onChange={(e) =>
                          actualizarAsignacion(a.id, {
                            costo: e.target.value,
                          })
                        }
                        placeholder="$5,000"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Auxiliares (múltiples)</label>
                    {auxiliaresDisponibles.length > 6 && (
                      <div className="filtro-input" style={{ marginBottom: 10 }}>
                        <input
                          type="text"
                          value={filtroAuxiliares}
                          onChange={(e) => setFiltroAuxiliares(e.target.value)}
                          placeholder="🔍 Buscar auxiliar..."
                        />
                      </div>
                    )}
                    <div className="auxiliares-chips">
                      {auxiliaresDisponibles.map((p) => {
                        const activo = a.auxiliaresIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`auxiliar-chip ${
                              activo ? 'active' : ''
                            }`}
                            onClick={() => toggleAuxiliar(a.id, p.id)}
                          >
                            {p.nombre_completo}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Destino
                      {index > 0 && (
                        <button
                          type="button"
                          className="btn-heredar"
                          onClick={() => heredarDestino(a.id, index)}
                        >
                          ↑ Heredar anterior
                        </button>
                      )}
                    </label>
                    <input
                      type="text"
                      value={a.destino}
                      onChange={(e) =>
                        actualizarAsignacion(a.id, {
                          destino: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="REFORMA, 4450, GUADALAJARA JAL."
                    />
                  </div>

                  <ParadasList
                    paradas={a.paradas}
                    onChange={(paradas) =>
                      actualizarAsignacion(a.id, { paradas })
                    }
                  />
                </div>
              );
            })}

            {/* Resumen */}
            {asignaciones.length > 0 && (
              <div className="form-card resumen-card">
                <div className="form-section-titulo">Resumen</div>
                <div className="resumen-grid">
                  <div className="resumen-item">
                    <span className="resumen-label">Total unidades</span>
                    <span className="resumen-valor">
                      {resumen.totalUnidades}
                    </span>
                  </div>
                  <div className="resumen-item">
                    <span className="resumen-label">Operadores únicos</span>
                    <span className="resumen-valor">
                      {resumen.operadoresUnicos}
                    </span>
                  </div>
                  <div className="resumen-item">
                    <span className="resumen-label">Auxiliares únicos</span>
                    <span className="resumen-valor">
                      {resumen.auxiliaresUnicos}
                    </span>
                  </div>
                  <div className="resumen-item">
                    <span className="resumen-label">Total paradas</span>
                    <span className="resumen-valor">
                      {resumen.totalParadas}
                    </span>
                  </div>
                  {resumen.costoTotal > 0 && (
                    <div className="resumen-item resumen-item-total">
                      <span className="resumen-label">Costo total</span>
                      <span className="resumen-valor">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(resumen.costoTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Descripciones */}
            <div className="form-card">
              <div className="form-section-titulo">Descripciones</div>

              <div className="form-group">
                <label>Descripción de servicios</label>
                <textarea
                  value={descripcionServicios}
                  onChange={(e) =>
                    setDescripcionServicios(e.target.value.toUpperCase())
                  }
                  placeholder="RECOLECCION EN SIMA EL DIA 11 Y ENTREGA EL DIA 12 EN GUADALAJARA"
                  rows={2}
                  className="notas-textarea"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Descripción de carga</label>
                <textarea
                  value={descripcionCarga}
                  onChange={(e) =>
                    setDescripcionCarga(e.target.value.toUpperCase())
                  }
                  placeholder="EQUIPO MEDICO"
                  rows={2}
                  className="notas-textarea"
                />
              </div>
            </div>

            {msg && <div className="info-box">{msg}</div>}

            <div className="volante-acciones">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleNuevo}
              >
                Nuevo
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando
                  ? 'Guardando...'
                  : volanteId
                  ? 'Actualizar'
                  : 'Guardar'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={imprimir}
              >
                🖨️ Imprimir / PDF
              </button>
            </div>
          </>
        )}
      </div>

      {/* IMPRIMIBLE */}
      {vista === 'nuevo' && (
        <div className="volante-print-area">
          <div className="volante-doc">
            <div className="volante-header">
              <div className="volante-logo">
                <img src="/logo.png" alt="Logo" />
              </div>
              <div className="volante-titulo">
                <div className="volante-empresa">TRANSPORTES RAMIREZ</div>
                <div className="volante-subtitulo">REMISION DE SERVICIO</div>
              </div>
              <div className="volante-folio-fecha">
                <div className="volante-folio">{folio || 'VOLANT-000'}</div>
                <div className="volante-fecha-caja">
                  <div className="volante-fecha-label">FECHA</div>
                  <div className="volante-fecha-valor">
                    {fechaFormateada || '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="volante-grid">
              <div className="volante-fila">
                <div className="volante-label">ORIGEN</div>
                <div className="volante-valor">{origen}</div>
              </div>
              <div className="volante-fila">
                <div className="volante-label">CLIENTE</div>
                <div className="volante-valor">{cliente}</div>
              </div>
              <div className="volante-fila">
                <div className="volante-label">REGISTRO A</div>
                <div className="volante-valor">{registroA}</div>
              </div>
              <div className="volante-fila">
                <div className="volante-label">UNIDADES</div>
                <div className="volante-valor">{filas.length}</div>
              </div>
            </div>

            <div className="volante-tabla-titulo">
              {esMultiple ? 'UNIDADES ASIGNADAS' : 'DATOS DE LA UNIDAD'}
            </div>
            <table className="volante-tabla">
              <thead>
                <tr>
                  {esMultiple && <th>#</th>}
                  <th>UNIDAD</th>
                  <th>OPERADOR</th>
                  <th>AUXILIARES</th>
                  <th>DESTINO</th>
                  <th>COSTO</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.id}>
                    {esMultiple && <td>{i + 1}</td>}
                    <td>{f.unidadTexto}</td>
                    <td>{f.operadorTexto}</td>
                    <td>{f.auxiliaresTexto || '—'}</td>
                    <td>{f.destino}</td>
                    <td>{f.costo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filas.some((f) => f.paradas.length > 0) && (
              <>
                <div className="volante-tabla-titulo">
                  TRAZABILIDAD DE PARADAS
                </div>
                {filas.map((f, i) =>
                  f.paradas.length === 0 ? null : (
                    <div key={f.id} className="volante-trace-unidad">
                      <div className="volante-trace-titulo">
                        Unidad {i + 1}: {f.unidadTexto || 'Sin asignar'}
                      </div>
                      <table className="volante-tabla">
                        <thead>
                          <tr>
                            <th>TIPO</th>
                            <th>DIRECCIÓN</th>
                            <th>HORA</th>
                            <th>NOTAS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.paradas.map((p) => (
                            <tr key={p.id}>
                              <td>
                                {p.tipo === 'carga' ? 'CARGA' : 'DESCARGA'}
                              </td>
                              <td>{p.direccion}</td>
                              <td>{p.hora}</td>
                              <td>{p.notas || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </>
            )}

            <div className="volante-seccion">
              <div className="volante-seccion-titulo">
                DESCRIPCIÓN DE SERVICIOS
              </div>
              <div className="volante-seccion-contenido">
                {descripcionServicios}
              </div>
            </div>

            <div className="volante-seccion">
              <div className="volante-seccion-titulo">DESCRIPCIÓN DE CARGA</div>
              <div className="volante-seccion-contenido">
                {descripcionCarga}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}