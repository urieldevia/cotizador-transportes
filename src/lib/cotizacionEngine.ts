import { supabase } from './supabase';
import type {
  CotizacionRequest,
  CotizacionResult,
  DesgloseItem,
  PuntoCotizacion,
  Ubicacion,
} from './types';

let cacheUbicaciones: Map<number, Ubicacion> | null = null;
let promesaUbicaciones: Promise<Map<number, Ubicacion>> | null = null;

async function cargarUbicaciones(): Promise<Map<number, Ubicacion>> {
  if (cacheUbicaciones) return cacheUbicaciones;
  if (promesaUbicaciones) return promesaUbicaciones;

  promesaUbicaciones = (async () => {
    const { data, error } = await supabase
      .from('ubicaciones')
      .select('id, poblacion, estado, zona_base')
      .eq('activo', true);

    if (error) throw new Error(`Error cargando ubicaciones: ${error.message}`);

    const map = new Map<number, Ubicacion>();
    (data ?? []).forEach((u) => map.set(u.id, u as Ubicacion));
    cacheUbicaciones = map;
    return map;
  })();

  return promesaUbicaciones;
}

let cacheTarifas: Map<string, number> | null = null;
let promesaTarifas: Promise<Map<string, number>> | null = null;

async function cargarTarifas(): Promise<Map<string, number>> {
  if (cacheTarifas) return cacheTarifas;
  if (promesaTarifas) return promesaTarifas;

  promesaTarifas = (async () => {
    const { data, error } = await supabase
      .from('tarifas')
      .select('destino_id, unidad_id, costo')
      .eq('activo', true);

    if (error) throw new Error(`Error cargando tarifas: ${error.message}`);

    const map = new Map<string, number>();
    (data ?? []).forEach((t) => {
      map.set(`${t.destino_id}::${t.unidad_id}`, Number(t.costo));
    });
    cacheTarifas = map;
    return map;
  })();

  return promesaTarifas;
}

let cacheUnidades: Map<number, string> | null = null;
async function obtenerNombreUnidad(unidadId: number): Promise<string> {
  if (!cacheUnidades) {
    const { data } = await supabase.from('unidades').select('id, nombre');
    cacheUnidades = new Map();
    (data ?? []).forEach((u) => cacheUnidades!.set(u.id, u.nombre));
  }
  return cacheUnidades.get(unidadId) ?? 'Unidad desconocida';
}

function generarFolio(): string {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const aleatorio = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `COT-${fecha}-${aleatorio}`;
}

function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

async function procesarPuntos(
  puntos: PuntoCotizacion[],
  unidadId: number,
  tipo: 'carga' | 'entrega',
  aplicarPorcentaje: boolean, // NUEVO PARÁMETRO
  desglose: DesgloseItem[]
): Promise<number> {
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

    // SI EL SWITCH ESTÁ APAGADO, SE COBRA EL 100%. SI ESTÁ PRENDIDO, SE USA EL VALOR DEL INPUT.
    const porcentajeReal = aplicarPorcentaje ? punto.porcentaje : 100;
    const monto = costoBase * (porcentajeReal / 100);
    
    subtotal += monto;

    const pctTexto = aplicarPorcentaje && punto.porcentaje !== 100 
      ? ` (${punto.porcentaje}%)` 
      : '';
    const etiqueta = tipo === 'carga' ? 'Carga' : 'Entrega';

    desglose.push({
      concepto: `${etiqueta}${pctTexto}`,
      monto,
      detalle: `${ubic.poblacion}, ${ubic.estado}`,
    });
  }

  return subtotal;
}

export async function calcularCotizacion(
  req: CotizacionRequest
): Promise<CotizacionResult> {
  await Promise.all([cargarUbicaciones(), cargarTarifas()]);

  const nombreUnidad = await obtenerNombreUnidad(req.unidadId);

  const desglose: DesgloseItem[] = [];
  let subtotalBase = 0;

  // === PUNTOS DE CARGA ===
  // Solo procesar si el switch principal está encendido
  if (req.incluirPuntosCarga) {
    subtotalBase += await procesarPuntos(
      req.puntosCarga,
      req.unidadId,
      'carga',
      req.aplicaPorcentajeCarga, // Pasamos la bandera del switch
      desglose
    );
  }

  // === PUNTOS DE ENTREGA ===
  subtotalBase += await procesarPuntos(
    req.puntosEntrega,
    req.unidadId,
    'entrega',
    req.aplicaPorcentajeEntrega, // Pasamos la bandera del switch
    desglose
  );

  if (subtotalBase === 0) {
    throw new Error('Agrega al menos un punto de entrega con ubicación válida');
  }

  // === MANIOBRAS ===
  if (req.maniobras === 'mas' && req.montoManiobras > 0) {
    subtotalBase += req.montoManiobras;
    desglose.push({
      concepto: 'Maniobras adicionales',
      monto: req.montoManiobras,
      detalle: 'Carga y descarga extra',
    });
  }

  // === ESTADÍAS ===
  let huboEstadia = false;
  if (req.diasEstadia > 0 && req.costoPorDia > 0) {
    const montoEstadia = req.diasEstadia * req.costoPorDia;
    subtotalBase += montoEstadia;
    huboEstadia = true;
    desglose.push({
      concepto: `Estadía (${req.diasEstadia} día${req.diasEstadia > 1 ? 's' : ''})`,
      monto: montoEstadia,
      detalle: `${formatearMoneda(req.costoPorDia)} por día`,
    });
  }

  const total = subtotalBase * (req.porcentajeCliente / 100);

  if (req.porcentajeCliente !== 100) {
    desglose.push({
      concepto: `Ajuste cliente (${req.porcentajeCliente}%)`,
      monto: total - subtotalBase,
      detalle: req.porcentajeCliente > 100 ? 'Incremento' : 'Descuento',
    });
  }

  // === DESCRIPCIÓN ===
  const ubicaciones = await cargarUbicaciones();
  const partes: string[] = [];

  if (req.incluirPuntosCarga) {
    const cargasValidas = req.puntosCarga.filter((p) => p.ubicacionId);
    for (const punto of cargasValidas) {
      const ubic = ubicaciones.get(punto.ubicacionId!);
      if (ubic) partes.push(`Carga en ${ubic.poblacion}, ${ubic.estado}`);
    }
  }

  const entregasValidas = req.puntosEntrega.filter((p) => p.ubicacionId);
  if (entregasValidas.length === 1 && (!req.incluirPuntosCarga || req.puntosCarga.length === 0)) {
    const ubic = ubicaciones.get(entregasValidas[0].ubicacionId!);
    if (ubic) partes.push(`Fleta a ${ubic.poblacion}, ${ubic.estado}`);
  } else {
    for (const punto of entregasValidas) {
      const ubic = ubicaciones.get(punto.ubicacionId!);
      if (ubic) partes.push(`Se entrega en ${ubic.poblacion}, ${ubic.estado}`);
    }
  }

  let descripcion = partes.join('. ') + '. ';
  descripcion += `En unidad ${nombreUnidad} con rampa hidráulica. `;
  descripcion += `${formatearMoneda(total)} + IVA.`;

  if (req.maniobras === 'sin_costo') descripcion += ' Con maniobras incluidas.';
  else if (req.maniobras === 'mas' && req.montoManiobras > 0) descripcion += ' Con maniobras incluidas.';
  else if (req.maniobras === 'mas' && req.montoManiobras === 0) descripcion += ' Más maniobras.';

  if (huboEstadia) descripcion += ' Estadía incluida.';

  return {
    folio: generarFolio(),
    unidad: nombreUnidad,
    tipoServicio: req.tipo,
    descripcion,
    desglose,
    subtotalBase,
    total,
    fecha: new Date().toLocaleString('es-MX'),
  };
}