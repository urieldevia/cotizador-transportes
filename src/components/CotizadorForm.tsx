import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calcularCotizacion } from '../lib/cotizacionEngine';
import type {
  CotizacionResult,
  TipoServicio,
  Maniobras,
  PuntoCotizacion,
  Unidad,
} from '../lib/types';
import { SelectorUbicacion } from './SelectorUbicacion';
import { DesgloseCotizacion } from './DesgloseCotizacion';

// Componente Toggle Estilo iOS
const IOSToggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (val: boolean) => void }) => (
  <div className="ios-toggle-row" onClick={() => onChange(!checked)}>
    <span className="ios-toggle-label">{label}</span>
    <div className={`ios-switch ${checked ? 'active' : ''}`}>
      <div className="ios-switch-knob" />
    </div>
  </div>
);

export function CotizadorForm() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [unidadId, setUnidadId] = useState<number | null>(null);
  const [tipo, setTipo] = useState<TipoServicio>('flete');

  const [destinoId, setDestinoId] = useState<number | null>(null);

  // SWITCHES LÓGICOS
  const [incluirPuntosCarga, setIncluirPuntosCarga] = useState(false);
  const [aplicaPorcentajeCarga, setAplicaPorcentajeCarga] = useState(false);
  const [aplicaPorcentajeEntrega, setAplicaPorcentajeEntrega] = useState(false);

  // DATOS DE PUNTOS
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

  const [porcentajeCliente, setPorcentajeCliente] = useState(100);

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

  // Cálculo en vivo
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
          tipo,
          unidadId,
          destinoId: destinoId || 0,
          incluirPuntosCarga,
          aplicaPorcentajeCarga,
          aplicaPorcentajeEntrega,
          puntosCarga,
          puntosEntrega,
          maniobras,
          montoManiobras,
          diasEstadia: conEstadia ? diasEstadia : 0,
          costoPorDia: conEstadia ? costoPorDia : 0,
          porcentajeRegreso: 60,
          porcentajeCliente,
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
    tipo, unidadId, destinoId, incluirPuntosCarga, aplicaPorcentajeCarga,
    aplicaPorcentajeEntrega, puntosCarga, puntosEntrega, maniobras,
    montoManiobras, conEstadia, diasEstadia, costoPorDia, porcentajeCliente
  ]);

  // Handlers
  const agregarCarga = () => setPuntosCarga([...puntosCarga, { ubicacionId: null, porcentaje: 100 }]);
  const quitarCarga = (idx: number) => setPuntosCarga(puntosCarga.filter((_, i) => i !== idx));
  const actualizarCarga = (idx: number, patch: Partial<PuntoCotizacion>) => {
    const n = [...puntosCarga]; n[idx] = { ...n[idx], ...patch }; setPuntosCarga(n);
  };

  const agregarEntrega = () => setPuntosEntrega([...puntosEntrega, { ubicacionId: null, porcentaje: 100 }]);
  const quitarEntrega = (idx: number) => setPuntosEntrega(puntosEntrega.filter((_, i) => i !== idx));
  const actualizarEntrega = (idx: number, patch: Partial<PuntoCotizacion>) => {
    const n = [...puntosEntrega]; n[idx] = { ...n[idx], ...patch }; setPuntosEntrega(n);
  };

  return (
    <div className="cotizador pb-28">
      <h1>Cotizador de Transporte</h1>

      <div className="apple-card">
        <label className="apple-label">TIPO DE SERVICIO</label>
        <div className="apple-segmented mb-4">
          {(['flete', 'puro_traer', 'ida_y_regreso', 'multi_punto'] as TipoServicio[]).map((t) => (
            <button
              key={t}
              className={tipo === t ? 'active' : ''}
              onClick={() => setTipo(t)}
            >
              {t === 'flete' ? 'Flete' : t === 'puro_traer' ? 'Traer' : t === 'ida_y_regreso' ? 'Ida/Reg' : 'Multi'}
            </button>
          ))}
        </div>

        <label className="apple-label">UNIDAD</label>
        <select
          className="apple-input"
          value={unidadId ?? ''}
          onChange={(e) => setUnidadId(Number(e.target.value) || null)}
        >
          <option value="">Seleccionar unidad...</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      </div>

      {/* PUNTOS DE ENTREGA */}
      <div className="apple-card">
        <div className="flex-between mb-4">
          <label className="apple-label m-0">PUNTOS DE ENTREGA</label>
          <IOSToggle
            label="Aplicar %"
            checked={aplicaPorcentajeEntrega}
            onChange={setAplicaPorcentajeEntrega}
          />
        </div>

        {puntosEntrega.map((punto, idx) => (
          <div key={idx} className="punto-item mb-2">
            <div className="punto-ubicacion">
              <SelectorUbicacion
                label=""
                value={punto.ubicacionId}
                onChange={(id) => actualizarEntrega(idx, { ubicacionId: id })}
                placeholder="Ciudad o estado de entrega..."
              />
            </div>
            {aplicaPorcentajeEntrega && (
              <div className="punto-pct">
                <input
                  type="number"
                  inputMode="decimal"
                  value={punto.porcentaje === 0 ? '' : punto.porcentaje}
                  onChange={(e) => actualizarEntrega(idx, { porcentaje: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="%"
                />
              </div>
            )}
            {puntosEntrega.length > 1 && (
              <button type="button" className="btn-remove-punto" onClick={() => quitarEntrega(idx)}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className="btn-add-punto" onClick={agregarEntrega}>
          + Agregar punto de entrega
        </button>
      </div>

      {/* PUNTOS DE CARGA (CON SWITCH MAESTRO) */}
      <div className="apple-card">
        <IOSToggle
          label="Incluir Puntos de Carga"
          checked={incluirPuntosCarga}
          onChange={setIncluirPuntosCarga}
        />

        {incluirPuntosCarga && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex-between mb-4">
              <label className="apple-label m-0">PUNTOS DE CARGA</label>
              <IOSToggle
                label="Aplicar %"
                checked={aplicaPorcentajeCarga}
                onChange={setAplicaPorcentajeCarga}
              />
            </div>

            {puntosCarga.map((punto, idx) => (
              <div key={idx} className="punto-item mb-2">
                <div className="punto-ubicacion">
                  <SelectorUbicacion
                    label=""
                    value={punto.ubicacionId}
                    onChange={(id) => actualizarCarga(idx, { ubicacionId: id })}
                    placeholder="Ciudad o estado de carga..."
                  />
                </div>
                {aplicaPorcentajeCarga && (
                  <div className="punto-pct">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={punto.porcentaje === 0 ? '' : punto.porcentaje}
                      onChange={(e) => actualizarCarga(idx, { porcentaje: e.target.value === '' ? 0 : Number(e.target.value) })}
                      placeholder="%"
                    />
                  </div>
                )}
                {puntosCarga.length > 1 && (
                  <button type="button" className="btn-remove-punto" onClick={() => quitarCarga(idx)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn-add-punto" onClick={agregarCarga}>
              + Agregar punto de carga
            </button>
          </div>
        )}
      </div>

      {/* MANIOBRAS */}
      <div className="apple-card">
        <label className="apple-label">MANIOBRAS DE CARGA Y DESCARGA</label>
        <div className="radio-vertical">
          <label className="radio-line">
            <input type="radio" value="incluidas" checked={maniobras === 'incluidas'} onChange={() => { setManiobras('incluidas'); setMontoManiobras(0); }} />
            Incluye maniobras
          </label>
          <label className="radio-line">
            <input type="radio" value="sin_costo" checked={maniobras === 'sin_costo'} onChange={() => { setManiobras('sin_costo'); setMontoManiobras(0); }} />
            Con maniobras incluidas (sin costo extra)
          </label>
          <label className="radio-line">
            <input type="radio" value="mas" checked={maniobras === 'mas'} onChange={() => setManiobras('mas')} />
            Más maniobras
          </label>
        </div>

        {maniobras === 'mas' && (
          <div className="mt-4">
            <label className="apple-label">MONTO DE MANIOBRAS</label>
            <input
              type="number"
              inputMode="decimal"
              className="apple-input"
              value={montoManiobras === 0 ? '' : montoManiobras}
              onChange={(e) => setMontoManiobras(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="$5,000"
            />
          </div>
        )}
      </div>

      {/* ESTADÍAS Y AJUSTE CLIENTE */}
      <div className="apple-card">
        <IOSToggle label="Agregar Estadía" checked={conEstadia} onChange={setConEstadia} />
        {conEstadia && (
          <div className="row-2 mt-4">
            <div>
              <label className="apple-label">DÍAS</label>
              <input
                type="number" inputMode="numeric" className="apple-input"
                value={diasEstadia === 0 ? '' : diasEstadia}
                onChange={(e) => setDiasEstadia(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="apple-label">COSTO POR DÍA</label>
              <input
                type="number" inputMode="decimal" className="apple-input"
                value={costoPorDia === 0 ? '' : costoPorDia}
                onChange={(e) => setCostoPorDia(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="apple-label">% APLICABLE AL CLIENTE</label>
          <input
            type="number" inputMode="decimal" className="apple-input"
            value={porcentajeCliente}
            onChange={(e) => setPorcentajeCliente(Number(e.target.value))}
          />
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {resultado && <DesgloseCotizacion resultado={resultado} />}
    </div>
  );
}