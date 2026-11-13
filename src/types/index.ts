export type TipoOperacion = 'flete' | 'recoleccion' | 'maniobras' | 'suministro' | 'ruta';
export type EstadoServicio = 'pendiente' | 'en_curso' | 'finalizado' | 'cancelado';

export interface UnidadInfo {
  tipo_id: number | null;
  nombre: string;
  con_rampa_hidraulica: boolean;
}

export interface OrigenDestino {
  id: string;
  ubicacion_id: number;
  nombre_ubicacion: string;
  porcentaje_ajuste: number;
}

export interface ExtrasInfo {
  incluye_maniobras: boolean;
  tipo_maniobra: 'ninguna' | 'carga' | 'descarga' | 'ambas';
  monto_maniobras: number;
  incluye_estadia: boolean;
  dias_estadia: number;
  costo_por_dia: number;
  monto_ajuste: number;
  redondear_a: number;
}

export interface AsignacionUnidad {
  id: string;
  unidad_fisica_id: number | null;
  operadores_ids: number[];
  auxiliares_ids: number[];
}

export interface ParadaVolante {
  id_parada: string;
  tipo: 'salida_base' | 'carga' | 'descarga' | 'interno';
  cliente_referencia: string;
  folio_fisico_cliente?: string;
  folio_vinculado?: string;
  ubicacion: string;
  fecha: string;
  hora: string;
  hora_indefinida?: boolean;
  detalle: string;
  unidad_fisica_id?: number | null;
  operadores_ids?: number[];
  auxiliares_ids?: number[];
}

export interface VolanteSeguimiento {
  id?: number;
  folio_interno_maestro: string;
  folio_administrativo: string;
  fecha_apertura: string;
  fecha_realizacion: string;
  clientes: string[]; // <-- Ahora es un arreglo
  pagado: boolean;    // <-- Nuevo campo
  estado_servicio: EstadoServicio;
  unidades_asignadas: AsignacionUnidad[];
  itinerario: ParadaVolante[];
  imagen_path?: string | null;
}

export interface Personal {
  id: number;
  nombre_completo: string;
  apodo?: string | null;
  rol: string;
  telefono?: string | null;
  activo: boolean;
  ine_path?: string | null;
  licencia_path?: string | null;
}

export interface UnidadFisica {
  id: number;
  marca_modelo: string;
  placas: string;
  color?: string | null;
  propietario_id?: number | null;
  tipo_unidad_id?: number | null;
  notas?: string | null;
  activo: boolean;
  poliza_path?: string | null;
  fumigacion_path?: string | null;
}

export interface Cliente {
  id: number;
  nombre: string;
}