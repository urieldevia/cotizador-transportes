export type TipoServicio =
  | 'flete'
  | 'puro_traer'
  | 'ida_y_regreso'
  | 'multi_punto';

export type Maniobras = 'incluidas' | 'sin_costo' | 'mas';

export interface PuntoCotizacion {
  ubicacionId: number | null;
  porcentaje: number;
}

export interface CotizacionRequest {
  tipo: TipoServicio;
  unidadId: number;
  destinoId: number;

  // NUEVOS SWITCHES LÓGICOS
  incluirPuntosCarga: boolean;
  aplicaPorcentajeCarga: boolean;
  aplicaPorcentajeEntrega: boolean;

  // Puntos
  puntosCarga: PuntoCotizacion[];
  puntosEntrega: PuntoCotizacion[];

  // Maniobras
  maniobras: Maniobras;
  montoManiobras: number;

  // Otros
  diasEstadia: number;
  costoPorDia: number;
  porcentajeRegreso: number;
  porcentajeCliente: number;
}

export interface DesgloseItem {
  concepto: string;
  monto: number;
  detalle?: string;
}

export interface CotizacionResult {
  folio: string;
  unidad: string;
  tipoServicio: string;
  descripcion: string;
  desglose: DesgloseItem[];
  subtotalBase: number;
  total: number;
  fecha: string;
}

export interface Unidad {
  id: number;
  nombre: string;
}

export interface Ubicacion {
  id: number;
  poblacion: string;
  estado: string;
  zona_base: boolean;
}