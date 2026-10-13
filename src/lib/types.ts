export type Maniobras = 'incluidas' | 'sin_costo' | 'mas';

export interface PuntoCotizacion {
  ubicacionId: number | null;
  porcentaje: number;
}

export interface CotizacionRequest {
  unidadId: number;
  puntosCarga: PuntoCotizacion[];
  puntosEntrega: PuntoCotizacion[];
  maniobras: Maniobras;
  montoManiobras: number;
  diasEstadia: number;
  costoPorDia: number;
}

export interface DesgloseItem {
  concepto: string;
  monto: number;
  detalle?: string;
}

export interface CotizacionResult {
  folio: string;
  unidad: string;
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

// ====== CATÁLOGOS ======

export type RolPersonal = 'chofer' | 'auxiliar' | 'ambos' | 'sin_definir';

export interface Propietario {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface UnidadFisica {
  id: number;
  propietario_id: number | null;
  marca_modelo: string;
  color: string | null;
  placas: string | null;
  tipo_unidad_id: number | null;
  notas: string | null;
  activo: boolean;
}

export interface Personal {
  id: number;
  nombre_completo: string;
  apodo: string | null;
  telefono: string | null;
  rol: RolPersonal;
  activo: boolean;
}