export type TipoModalidad = 
  | 'flete_directo'
  | 'con_escalas'
  | 'ruta_fija'
  | 'regreso'
  | 'consolidado'
  | 'redondo'
  | 'local';

export type Maniobras = 'incluidas' | 'sin_costo' | 'mas';

export interface PuntoCotizacion {
  ubicacionId: number | null;
  porcentaje: number;
}

export interface CotizacionRequest {
  modalidad: TipoModalidad;
  unidadId: number;
  destinoId: number;
  
  // SWITCHES
  incluirPuntosCarga: boolean;
  aplicaPorcentajeCarga: boolean;
  aplicaPorcentajeEntrega: boolean;

  // PUNTOS
  puntosCarga: PuntoCotizacion[];
  puntosEntrega: PuntoCotizacion[];

  // EXTRAS
  maniobras: Maniobras;
  montoManiobras: number;
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
  modalidad: string;
  descripcion: string;
  mensajeCliente: string;
  mensajeOperador: string;
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