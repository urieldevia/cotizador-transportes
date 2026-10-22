import { supabase } from './supabase';
import type { CotizacionRequest, CotizacionResult, DesgloseItem, PuntoCotizacion, Ubicacion } from './types';

let cacheUbicaciones: Map<number, Ubicacion> | null = null;
let cacheTarifas: Map<string, number> | null = null;

async function cargarUbicaciones(): Promise<Map<number, Ubicacion>> {
  if (cacheUbicaciones) return cacheUbicaciones;
  const { data, error } = await supabase.from('ubicaciones').select('id, poblacion, estado, zona_base').eq('activo', true);
  if (error) throw new Error(error.message);
  cacheUbicaciones = new Map((data ?? []).map(u => [u.id, u as Ubicacion]));
  return cacheUbicaciones;
}

async function cargarTarifas(): Promise<Map<string, number>> {
  if (cacheTarifas) return cacheTarifas;
  const { data, error } = await supabase.from('tarifas').select('destino_id, unidad_id, costo').eq('activo', true);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('La tabla de tarifas está vacía en Supabase.');
  cacheTarifas = new Map((data ?? []).map(t => [`${t.destino_id}::${t.unidad_id}`, Number(t.costo)]));
  return cacheTarifas;
}

function formatearMoneda(monto: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(monto);
}

async function procesarPuntos(puntos: PuntoCotizacion[], unidadId: number, tipo: 'carga' | 'entrega', aplicarPorcentaje: boolean, desglose: DesgloseItem[]): Promise<number> {
  if (puntos.length === 0) return 0;
  const ubicaciones = await cargarUbicaciones();
  const tarifas = await cargarTarifas();
  let subtotal = 0;

  for (const punto of puntos) {
    if (!punto.ubicacionId) continue;
    const ubic = ubicaciones.get(punto.ubicacionId);
    const costoBase = tarifas.get(`${punto.ubicacionId}::${unidadId}`);
    
    if (!ubic || costoBase === undefined) {
      throw new Error(`No hay tarifa registrada para ${ubic?.poblacion || 'la ubicación seleccionada'} con esta unidad.`);
    }

    const porcentajeReal = aplicarPorcentaje ? punto.porcentaje : 100;
    const monto = costoBase * (porcentajeReal / 100);
    subtotal += monto;

    desglose.push({
      concepto: `${tipo === 'carga' ? 'Carga' : 'Entrega'}${aplicarPorcentaje && punto.porcentaje !== 100 ? ` (${punto.porcentaje}%)` : ''}`,
      monto,
      detalle: `${ubic.poblacion}, ${ubic.estado}`,
    });
  }
  return subtotal;
}

export async function calcularCotizacion(req: CotizacionRequest): Promise<CotizacionResult> {
  const desglose: DesgloseItem[] = [];
  let subtotalBase = 0;

  // Cálculos
  if (req.incluirPuntosCarga) {
    subtotalBase += await procesarPuntos(req.puntosCarga, req.unidadId, 'carga', req.aplicaPorcentajeCarga, desglose);
  }
  subtotalBase += await procesarPuntos(req.puntosEntrega, req.unidadId, 'entrega', req.aplicaPorcentajeEntrega, desglose);

  // Modalidades
  let descModalidad = '';
  if (req.modalidad === 'regreso') {
    const desc = subtotalBase * 0.20; subtotalBase -= desc;
    desglose.push({ concepto: 'Descuento Regreso (-20%)', monto: -desc }); descModalidad = 'Viaje de regreso.';
  } else if (req.modalidad === 'consolidado') {
    const desc = subtotalBase * 0.10; subtotalBase -= desc;
    desglose.push({ concepto: 'Descuento Consolidado (-10%)', monto: -desc }); descModalidad = 'Carga consolidada.';
  } else if (req.modalidad === 'redondo') {
    const vuelta = subtotalBase * (req.porcentajeRegreso / 100); subtotalBase += vuelta;
    desglose.push({ concepto: `Retorno (${req.porcentajeRegreso}%)`, monto: vuelta }); descModalidad = 'Viaje redondo.';
  } else {
    descModalidad = 'Viaje exclusivo.';
  }

  // Extras
  if (req.maniobras === 'mas' && req.montoManiobras > 0) {
    subtotalBase += req.montoManiobras;
    desglose.push({ concepto: 'Maniobras extra', monto: req.montoManiobras });
  }

  const total = subtotalBase * (req.porcentajeCliente / 100);
  const { data: unidades } = await supabase.from('unidades').select('nombre').eq('id', req.unidadId).single();
  const nombreUnidad = unidades?.nombre || 'Unidad';

  return {
    folio: `COT-${Math.floor(Math.random()*10000)}`,
    unidad: nombreUnidad,
    modalidad: req.modalidad,
    descripcion: `${descModalidad}`,
    mensajeCliente: `Hola, te confirmo tu cotización en unidad ${nombreUnidad}. El costo es de ${formatearMoneda(total)} + IVA.`,
    mensajeOperador: `Asignación: Viaje ${req.modalidad.replace('_', ' ')} con unidad ${nombreUnidad}.`,
    desglose, subtotalBase, total,
    fecha: new Date().toLocaleString('es-MX'),
  };
}