import { useState, useMemo } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';

const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

export function VolanteTab() {
  const { unidades, personal } = useCatalogo();

  const [folio, setFolio] = useState('');
  const [fecha, setFecha] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [cliente, setCliente] = useState('');
  const [registroA, setRegistroA] = useState('');
  const [unidadFisicaId, setUnidadFisicaId] = useState<number | null>(null);
  const [operadorId, setOperadorId] = useState<number | null>(null);
  const [auxiliarId, setAuxiliarId] = useState<number | null>(null);
  const [costo, setCosto] = useState('');
  const [descripcionServicios, setDescripcionServicios] = useState('');
  const [descripcionCarga, setDescripcionCarga] = useState('');

  const operadores = useMemo(
    () => personal.filter((p) => p.rol === 'chofer' || p.rol === 'ambos'),
    [personal]
  );
  const auxiliares = useMemo(
    () => personal.filter((p) => p.rol === 'auxiliar' || p.rol === 'ambos'),
    [personal]
  );

  const unidadFisica = useMemo(
    () => unidades.find((u) => u.id === unidadFisicaId) || null,
    [unidades, unidadFisicaId]
  );
  const operador = useMemo(
    () => personal.find((p) => p.id === operadorId) || null,
    [personal, operadorId]
  );
  const auxiliar = useMemo(
    () => personal.find((p) => p.id === auxiliarId) || null,
    [personal, auxiliarId]
  );

  const fechaFormateada = useMemo(() => {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    if (!y || !m || !d) return '';
    return `${parseInt(d)} DE ${MESES[parseInt(m) - 1]} DE ${y}`;
  }, [fecha]);

  const nombreUnidad = unidadFisica
    ? `${unidadFisica.marca_modelo}${
        unidadFisica.color ? ` ${unidadFisica.color}` : ''
      }`
    : '';

  const imprimir = () => {
    window.print();
  };

  const limpiar = () => {
    if (!confirm('¿Limpiar todos los campos?')) return;
    setFolio('');
    setFecha('');
    setOrigen('');
    setDestino('');
    setCliente('');
    setRegistroA('');
    setUnidadFisicaId(null);
    setOperadorId(null);
    setAuxiliarId(null);
    setCosto('');
    setDescripcionServicios('');
    setDescripcionCarga('');
  };

  return (
    <div className="volante-tab">
      <div className="no-print">
        <h1>Volante de Registro</h1>

        <div className="form-card">
          <div className="row-2">
            <div className="form-group">
              <label>Folio</label>
              <input
                type="text"
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                placeholder="0532"
              />
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          <div className="row-2">
            <div className="form-group">
              <label>Origen</label>
              <input
                type="text"
                value={origen}
                onChange={(e) => setOrigen(e.target.value.toUpperCase())}
                placeholder="XOCHIMILCO"
              />
            </div>
            <div className="form-group">
              <label>Destino</label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value.toUpperCase())}
                placeholder="REFORMA, 4450, GUADALAJARA JAL."
              />
            </div>
          </div>

          <div className="row-2">
            <div className="form-group">
              <label>Cliente</label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value.toUpperCase())}
                placeholder="SIMA"
              />
            </div>
            <div className="form-group">
              <label>Registró</label>
              <input
                type="text"
                value={registroA}
                onChange={(e) => setRegistroA(e.target.value.toUpperCase())}
                placeholder="RAFAEL RAMIREZ MORENO"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Unidad</label>
            <select
              value={unidadFisicaId ?? ''}
              onChange={(e) =>
                setUnidadFisicaId(Number(e.target.value) || null)
              }
            >
              <option value="">Seleccionar unidad...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.marca_modelo}
                  {u.color ? ` ${u.color}` : ''}
                  {u.placas ? ` · ${u.placas}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="row-2">
            <div className="form-group">
              <label>Operador</label>
              <select
                value={operadorId ?? ''}
                onChange={(e) =>
                  setOperadorId(Number(e.target.value) || null)
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
              <label>Auxiliar</label>
              <select
                value={auxiliarId ?? ''}
                onChange={(e) =>
                  setAuxiliarId(Number(e.target.value) || null)
                }
              >
                <option value="">Sin auxiliar</option>
                {auxiliares.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Costo</label>
            <input
              type="text"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="Opcional"
            />
          </div>

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

          <div className="form-group">
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

        <div className="volante-acciones no-print">
          <button type="button" className="btn-secondary" onClick={limpiar}>
            Limpiar
          </button>
          <button type="button" className="btn-primary" onClick={imprimir}>
            🖨️ Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Área imprimible */}
      <div className="volante-print-area">
        <div className="volante-doc">
          {/* Encabezado */}
          <div className="volante-header">
            <div className="volante-logo">
              <img src="/logo.png" alt="Logo" />
            </div>

            <div className="volante-titulo">
              <div className="volante-empresa">TRANSPORTES RAMIREZ</div>
              <div className="volante-subtitulo">REMISION DE SERVICIO</div>
            </div>

            <div className="volante-folio-fecha">
              <div className="volante-folio">{folio || '0000'}</div>
              <div className="volante-fecha-caja">
                <div className="volante-fecha-label">FECHA</div>
                <div className="volante-fecha-valor">
                  {fechaFormateada || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Cuadrícula de datos */}
          <div className="volante-grid">
            <div className="volante-fila">
              <div className="volante-label">ORIGEN</div>
              <div className="volante-valor">{origen}</div>
            </div>
            <div className="volante-fila">
              <div className="volante-label">UNIDAD</div>
              <div className="volante-valor">{nombreUnidad}</div>
            </div>

            <div className="volante-fila">
              <div className="volante-label">DESTINO</div>
              <div className="volante-valor">{destino}</div>
            </div>
            <div className="volante-fila">
              <div className="volante-label">OPERADOR</div>
              <div className="volante-valor">
                {operador?.nombre_completo ?? ''}
              </div>
            </div>

            <div className="volante-fila">
              <div className="volante-label">CLIENTE</div>
              <div className="volante-valor">{cliente}</div>
            </div>
            <div className="volante-fila">
              <div className="volante-label">AUXILIAR</div>
              <div className="volante-valor">
                {auxiliar?.nombre_completo ?? ''}
              </div>
            </div>

            <div className="volante-fila">
              <div className="volante-label">REGISTRO A</div>
              <div className="volante-valor">{registroA}</div>
            </div>
            <div className="volante-fila">
              <div className="volante-label">COSTO</div>
              <div className="volante-valor">{costo}</div>
            </div>
          </div>

          {/* Descripción de servicios */}
          <div className="volante-seccion">
            <div className="volante-seccion-titulo">DESCRIPCIÓN DE SERVICIOS</div>
            <div className="volante-seccion-contenido">
              {descripcionServicios}
            </div>
          </div>

          {/* Descripción de carga */}
          <div className="volante-seccion">
            <div className="volante-seccion-titulo">DESCRIPCIÓN DE CARGA</div>
            <div className="volante-seccion-contenido">
              {descripcionCarga}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}