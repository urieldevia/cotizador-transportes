import { supabase } from './supabase';
import type {
  CotizacionRequest,
  CotizacionResult,
  DesgloseItem,
  PuntoCotizacion,
  Ubicacion,
} from './types';

let cacheUbicaciones: Map<number, Ubicacion> | null = null;
let cacheTarifas: Map<string, number> | null = null;
let cacheUnidades: Map<number, string> | null = null;

async function cargarUbicaciones(): Promise<Map<number, Ubicacion>> {
  if (cacheUbicaciones) return cacheUbicaciones;
  const { data, error } = await supabase.from('ubicaciones').select('id, poblacion, estado, zona_base').eq('activo', true);
  if (error) throw new Error(`Error DB Ubicaciones: ${error.message}`);
  
  const map = new Map<number, Ubicacion>();
  (data ?? []).forEach((u) => map.set(u.id, u as Ubicacion));
  cacheUbicaciones = map;
  return map;
}

async function cargarTarifas(): Promise<Map<string, number>> {
  if (cacheTarifas) return cacheTarifas;
  const { data, error } = await supabase.from('tarifas').select('destino_id, unidad_id, costo').eq('activo', true);
  if (error) throw new Error(`Error DB Tarifas: ${error.message}`);
  
  const map = new Map<string, number>();
  (data ?? []).forEach((t) => map.set(`${t.destino_id}::${t.unidad_id}`, Number(t.costo)));
  cacheTarifas = map;
  return map;
}

async function obtenerNombreUnidad(unidadId: number): Promise<string> {
  if (!cacheUnidades) {
    const { data } = await supabase.from('unidades').select('id, nombre');
    cacheUnidades = new Map();
    (data ?? []).forEach((u) => cacheUnidades!.set(u.id, u.nombre));
  }
  return cacheUnidades.get(unidadId) ?? 'Unidad Desconocida';
}

function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(monto);
}

async function procesarPuntos(puntos: PuntoCotizacion[], unidadId: number, tipo: 'carga' | 'entrega', aplicarPorcentaje: boolean, desglose: DesgloseItem[]): Promise<number> {
  if (puntos.length === 0) return 0;
  const ubicaciones = await cargarUbicaciones();
  const tarifas = await cargarTarifas();
  let subtotal = 0;

  for (const punto of puntos) {
    if (!punto.ubicacionId) continue;
    const ubic = ubicaciones.get(punto.ubicacionId);
    if (!ubic) continue;
    
    const costoBase = tarifas.get(`${punto.ubicacionId}::${unidadId}`);
    if (costoBase === undefined) continue;

    const porcentajeReal = aplicarPorcentaje ? punto.porcentaje : 100;
    const monto = costoBase * (porcentajeReal / 100);
    subtotal += monto;

    const pctTexto = aplicarPorcentaje && punto.porcentaje !== 100 ? ` (${punto.porcentaje}%)` : '';
    desglose.push({
      concepto: `${tipo === 'carga' ? 'Carga' : 'Entrega'}${pctTexto}`,
      monto,
      detalle: `${ubic.poblacion}, ${ubic.estado}`,
    });
  }
  return subtotal;
}

export async function calcularCotizacion(req: CotizacionRequest): Promise<CotizacionResult> {
  const nombreUnidad = await obtenerNombreUnidad(req.unidadId);
  const desglose: DesgloseItem[] = [];
  let subtotalBase = 0;

  // 1. PUNTOS DE CARGA
  if (req.incluirPuntosCarga) {
    subtotalBase += await procesarPuntos(req.puntosCarga, req.unidadId, 'carga', req.aplicaPorcentajeCarga, desglose);
  }

  // 2. PUNTOS DE ENTREGA
  subtotalBase += await procesarPuntos(req.puntosEntrega, req.unidadId, 'entrega', req.aplicaPorcentajeEntrega, desglose);

  if (subtotalBase === 0) throw new Error('Agrega al menos una ubicación con tarifa válida.');

  // 3. LÓGICA DE MODALIDADES
  let descModalidad = '';
  switch (req.modalidad) {
    case 'regreso':
      const descRegreso = subtotalBase * 0.20;
      subtotalBase -= descRegreso;
      desglose.push({ concepto: 'Descuento Flete de Regreso (-20%)', monto: -descRegreso });
      descModalidad = 'Viaje de regreso con tarifa preferencial.';
      break;
    case 'consolidado':
      const descConsolidado = subtotalBase * 0.10;
      subtotalBase -= descConsolidado;
      desglose.push({ concepto: 'Descuento Carga Consolidada (-10%)', monto: -descConsolidado });
      descModalidad = 'Servicio consolidado compartiendo unidad.';
      break;
    case 'redondo':
      const costoVuelta = subtotalBase * (req.porcentajeRegreso / 100);
      subtotalBase += costoVuelta;
      desglose.push({ concepto: `Retorno (${req.porcentajeRegreso}%)`, monto: costoVuelta });
      descModalidad = 'Viaje redondo (ida y vuelta).';
      break;
    case 'flete_directo': descModalidad = 'Viaje exclusivo sin escalas.'; break;
    case 'con_escalas': descModalidad = 'Ruta con paradas múltiples.'; break;
    case 'ruta_fija': descModalidad = 'Ruta de reparto preestablecida.'; break;
    case 'local': descModalidad = 'Flete local / Última milla.'; break;
  }

  // 4. EXTRAS
  if (req.maniobras === 'mas' && req.montoManiobras > 0) {
    subtotalBase += req.montoManiobras;
    desglose.push({ concepto: 'Maniobras adicionales', monto: req.montoManiobras });
  }
  if (req.diasEstadia > 0 && req.costoPorDia > 0) {
    const estadia = req.diasEstadia * req.costoPorDia;
    subtotalBase += estadia;
    desglose.push({ concepto: `Estadía (${req.diasEstadia} días)`, monto: estadia });
  }

  const total = subtotalBase * (req.porcentajeCliente / 100);

  // 5. GENERACIÓN DE MENSAJES
  const ubicaciones = await cargarUbicaciones();
  const origenTxt = req.incluirPuntosCarga && req.puntosCarga[0]?.ubicacionId 
    ? `${ubicaciones.get(req.puntosCarga[0].ubicacionId)?.poblacion}` : 'Origen';
  const destinoTxt = req.puntosEntrega[0]?.ubicacionId 
    ? `${ubicaciones.get(req.puntosEntrega[0].ubicacionId)?.poblacion}` : 'Destino';

  let msgCliente = `Hola [Nombre], te confirmo la cotización de tu **${req.modalidad.replace('_', ' ')}** de ${origenTxt} a ${destinoTxt} en unidad ${nombreUnidad}. `;
  if (req.modalidad === 'flete_directo') msgCliente += `Al ser viaje exclusivo, la entrega se realiza sin escalas. `;
  else if (req.modalidad === 'redondo') msgCliente += `El servicio incluye el retorno a ${origenTxt}. `;
  else if (req.modalidad === 'regreso') msgCliente += `Aprovecha nuestra unidad que retorna a base con tarifa preferencial. `;
  msgCliente += `El costo es de ${formatearMoneda(total)} + IVA.`;

  let msgOperador = `Asignación: Salida de ${origenTxt} hacia ${destinoTxt}. Unidad ${nombreUnidad}. `;
  if (req.incluirPuntosCarga) msgOperador += `Con ${req.puntosCarga.length} punto(s) de carga. `;
  if (req.puntosEntrega.length > 1) msgOperador += `Ruta con ${req.puntosEntrega.length} entregas. `;
  if (req.modalidad === 'redondo') msgOperador += `Al descargar, recargar y volver a ${origenTxt}. `;

  return {
    folio: `COT-${Math.floor(Math.random()*10000)}`,
    unidad: nombreUnidad,
    modalidad: req.modalidad,
    descripcion: `${descModalidad} | ${origenTxt} → ${destinoTxt}`,
    mensajeCliente: msgCliente,
    mensajeOperador: msgOperador,
    desglose,
    subtotalBase: subtotalBase,
    total,
    fecha: new Date().toLocaleString('es-MX'),
  };
}