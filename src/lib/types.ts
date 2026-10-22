// ==========================================
// 1. TIPOS DEL COTIZADOR (NUEVOS)
// ==========================================
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
  
  incluirPuntosCarga: boolean;
  aplicaPorcentajeCarga: boolean;
  aplicaPorcentajeEntrega: boolean;

  puntosCarga: PuntoCotizacion[];
  puntosEntrega: PuntoCotizacion[];

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

// ==========================================
// 2. TIPOS DE CATÁLOGOS (ADMIN)
// ==========================================
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

// ==========================================
// 3. TIPOS DEL VOLANTE Y TRAZABILIDAD
// ==========================================
export type TipoParada = 'carga' | 'descarga';

export interface Parada {
  id: string;
  tipo: TipoParada;
  direccion: string;
  hora: string;
  notas: string;
}

export interface AsignacionUnidad {
  id: string;
  unidadFisicaId: number | null;
  operadorId: number | null;
  auxiliaresIds: number[];
  destino: string;
  costo: string;
  paradas: Parada[];
}

export interface Volante {
  id: number;
  folio: string;
  fecha: string | null;
  cliente: string;
  origen: string;
  registro_a: string;
  descripcion_servicios: string;
  descripcion_carga: string;
  unidades: AsignacionUnidad[];
  created_at: string;
  updated_at: string;
}