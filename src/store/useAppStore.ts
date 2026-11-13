import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  TipoOperacion, UnidadInfo, OrigenDestino, ExtrasInfo,
  AsignacionUnidad, ParadaVolante, VolanteSeguimiento, EstadoServicio, Cliente
} from '../types';

interface AppState {
  // ... (Cotizador y Despacho se mantienen igual, omitidos por brevedad)
  cotizador: any;
  setTipoOperacion: any;
  toggleExcepcion: any;
  setMontoCancelacion: any;
  toggleIncluirOrigenes: any;
  setUnidad: any;
  setUnidadRampa: any;
  addOrigen: any;
  addDestino: any;
  updateOrigenPorcentaje: any;
  updateDestinoPorcentaje: any;
  removeOrigen: any;
  removeDestino: any;
  updateExtras: any;

  despacho: { asignaciones: AsignacionUnidad[]; };
  addAsignacion: any;
  updateAsignacion: any;
  removeAsignacion: any;

  volante: VolanteSeguimiento;
  volantesGuardados: VolanteSeguimiento[];
  clientes: Cliente[];
  cargarClientes: () => Promise<void>;
  agregarCliente: (nombre: string) => Promise<void>;
  editarCliente: (id: number, nombre: string) => Promise<void>;
  eliminarCliente: (id: number) => Promise<void>;
  
  addParada: (parada: ParadaVolante) => void;
  updateParada: (id: string, data: Partial<ParadaVolante>) => void;
  removeParada: (id: string) => void;
  setFolioMaestro: (folio: string) => void;
  setFolioAdministrativo: (folio: string) => void;
  setFechaRealizacion: (fecha: string) => void;
  addClienteVolante: (cliente: string) => void;
  removeClienteVolante: (index: number) => void;
  setEstadoServicio: (estado: EstadoServicio) => void;
  togglePagado: () => void; // <-- NUEVO
  addUnidadVolante: () => void;
  updateUnidadVolante: (id: string, data: Partial<AsignacionUnidad>) => void;
  removeUnidadVolante: (id: string) => void;
  guardarVolante: () => Promise<boolean>;
  cargarVolantes: () => Promise<void>;
  cargarVolantePorId: (volante: VolanteSeguimiento) => void;
  nuevoVolante: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ... cotizador y despacho
  cotizador: {
    tipo_operacion: 'flete',
    excepcion_cancelacion: false,
    monto_cancelacion: 0,
    incluir_origenes: false,
    unidad: { tipo_id: null, nombre: 'Seleccionar unidad', con_rampa_hidraulica: false },
    origenes: [],
    destinos: [],
    extras: { incluye_maniobras: false, tipo_maniobra: 'ninguna', monto_maniobras: 0, incluye_estadia: false, dias_estadia: 0, costo_por_dia: 0, monto_ajuste: 0, redondear_a: 0 },
  },
  setTipoOperacion: (tipo: any) => set((state: any) => ({ cotizador: { ...state.cotizador, tipo_operacion: tipo, excepcion_cancelacion: false } })),
  toggleExcepcion: () => set((state: any) => ({ cotizador: { ...state.cotizador, excepcion_cancelacion: !state.cotizador.excepcion_cancelacion } })),
  setMontoCancelacion: (monto: any) => set((state: any) => ({ cotizador: { ...state.cotizador, monto_cancelacion: monto } })),
  toggleIncluirOrigenes: () => set((state: any) => ({ cotizador: { ...state.cotizador, incluir_origenes: !state.cotizador.incluir_origenes } })),
  setUnidad: (tipo_id: any, nombre: any) => set((state: any) => ({ cotizador: { ...state.cotizador, unidad: { ...state.cotizador.unidad, tipo_id, nombre } } })),
  setUnidadRampa: (rampa: any) => set((state: any) => ({ cotizador: { ...state.cotizador, unidad: { ...state.cotizador.unidad, con_rampa_hidraulica: rampa } } })),
  addOrigen: (origen: any) => set((state: any) => ({ cotizador: { ...state.cotizador, origenes: [...state.cotizador.origenes, origen] } })),
  addDestino: (destino: any) => set((state: any) => ({ cotizador: { ...state.cotizador, destinos: [...state.cotizador.destinos, destino] } })),
  updateOrigenPorcentaje: (id: any, pct: any) => set((state: any) => ({ cotizador: { ...state.cotizador, origenes: state.cotizador.origenes.map((o: any) => o.id === id ? { ...o, porcentaje_ajuste: pct } : o) } })),
  updateDestinoPorcentaje: (id: any, pct: any) => set((state: any) => ({ cotizador: { ...state.cotizador, destinos: state.cotizador.destinos.map((d: any) => d.id === id ? { ...d, porcentaje_ajuste: pct } : d) } })),
  removeOrigen: (id: any) => set((state: any) => ({ cotizador: { ...state.cotizador, origenes: state.cotizador.origenes.filter((o: any) => o.id !== id) } })),
  removeDestino: (id: any) => set((state: any) => ({ cotizador: { ...state.cotizador, destinos: state.cotizador.destinos.filter((d: any) => d.id !== id) } })),
  updateExtras: (extras: any) => set((state: any) => ({ cotizador: { ...state.cotizador, extras: { ...state.cotizador.extras, ...extras } } })),

  despacho: { asignaciones: [{ id: 'init-1', unidad_fisica_id: null, operadores_ids: [], auxiliares_ids: [] }] },
  addAsignacion: () => set((state: any) => ({ despacho: { asignaciones: [...state.despacho.asignaciones, { id: `asig-${Date.now()}`, unidad_fisica_id: null, operadores_ids: [], auxiliares_ids: [] }] } })),
  updateAsignacion: (id: any, data: any) => set((state: any) => ({ despacho: { asignaciones: state.despacho.asignaciones.map((a: any) => a.id === id ? { ...a, ...data } : a) } })),
  removeAsignacion: (id: any) => set((state: any) => ({ despacho: { asignaciones: state.despacho.asignaciones.filter((a: any) => a.id !== id) } })),

  volante: {
    folio_interno_maestro: `VOL-${Date.now()}`,
    folio_administrativo: '0814',
    fecha_apertura: new Date().toISOString().split('T')[0],
    fecha_realizacion: new Date().toISOString().split('T')[0],
    clientes: [], // <-- Arreglo de clientes
    pagado: false, // <-- Inicial
    estado_servicio: 'pendiente',
    unidades_asignadas: [{ id: `u-${Date.now()}`, unidad_fisica_id: null, operadores_ids: [], auxiliares_ids: [] }],
    itinerario: [{ 
      id_parada: 'base-1', tipo: 'salida_base', cliente_referencia: 'Salida de Base', ubicacion: 'Base Central', 
      fecha: new Date().toISOString().split('T')[0], hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), detalle: 'Inicio de viaje' 
    }],
  },
  volantesGuardados: [],
  clientes: [],

  cargarClientes: async () => {
    const { data } = await supabase.from('clientes').select('*').order('nombre');
    if (data) set({ clientes: data });
  },

  agregarCliente: async (nombre: string) => {
    if (!nombre.trim()) return;
    const existe = get().clientes.find(c => c.nombre.toLowerCase() === nombre.trim().toLowerCase());
    if (existe) return;
    const { data, error } = await supabase.from('clientes').insert([{ nombre: nombre.trim() }]).select().single();
    if (!error && data) set(state => ({ clientes: [...state.clientes, data].sort((a,b)=>a.nombre.localeCompare(b.nombre)) }));
  },

  editarCliente: async (id, nombre) => {
    if (!nombre.trim()) return;
    await supabase.from('clientes').update({ nombre: nombre.trim() }).eq('id', id);
    set(state => ({ clientes: state.clientes.map(c => c.id === id ? { ...c, nombre: nombre.trim() } : c).sort((a,b)=>a.nombre.localeCompare(b.nombre)) }));
  },

  eliminarCliente: async (id) => {
    await supabase.from('clientes').delete().eq('id', id);
    set(state => ({ clientes: state.clientes.filter(c => c.id !== id) }));
  },
  
  addParada: (parada) => set((state) => ({ volante: { ...state.volante, itinerario: [...state.volante.itinerario, parada] } })),
  updateParada: (id, data) => set((state) => ({ volante: { ...state.volante, itinerario: state.volante.itinerario.map(p => p.id_parada === id ? { ...p, ...data } : p) } })),
  removeParada: (id) => set((state) => ({ volante: { ...state.volante, itinerario: state.volante.itinerario.filter(p => p.id_parada !== id) } })),
  setFolioMaestro: (folio) => set((state) => ({ volante: { ...state.volante, folio_interno_maestro: folio } })),
  setFolioAdministrativo: (folio) => set((state) => ({ volante: { ...state.volante, folio_administrativo: folio } })),
  setFechaRealizacion: (fecha) => set((state) => ({ volante: { ...state.volante, fecha_realizacion: fecha } })),
  
  // Manejo de múltiples clientes
  addClienteVolante: (cliente) => set((state) => {
    if (!state.volante.clientes.includes(cliente)) {
      return { volante: { ...state.volante, clientes: [...state.volante.clientes, cliente] } };
    }
    return state;
  }),
  removeClienteVolante: (index) => set((state) => ({
    volante: { ...state.volante, clientes: state.volante.clientes.filter((_, i) => i !== index) }
  })),
  
  setEstadoServicio: (estado) => set((state) => ({ volante: { ...state.volante, estado_servicio: estado } })),
  togglePagado: () => set((state) => ({ volante: { ...state.volante, pagado: !state.volante.pagado } })),
  
  addUnidadVolante: () => set((state) => ({ volante: { ...state.volante, unidades_asignadas: [...state.volante.unidades_asignadas, { id: `u-${Date.now()}`, unidad_fisica_id: null, operadores_ids: [], auxiliares_ids: [] }] } })),
  updateUnidadVolante: (id, data) => set((state) => ({ volante: { ...state.volante, unidades_asignadas: state.volante.unidades_asignadas.map(u => u.id === id ? { ...u, ...data } : u) } })),
  removeUnidadVolante: (id) => set((state) => ({ volante: { ...state.volante, unidades_asignadas: state.volante.unidades_asignadas.filter(u => u.id !== id) } })),

  guardarVolante: async () => {
    const { volante, volantesGuardados, agregarCliente } = get();

    // Guardar clientes nuevos en el catálogo
    for (const c of volante.clientes) {
      await agregarCliente(c);
    }

    const folioExiste = volantesGuardados.some(v => v.folio_administrativo === volante.folio_administrativo && v.id !== volante.id);
    if (folioExiste) {
      alert('⚠️ El folio ya está en uso.');
      return false;
    }

    const payload = {
      folio: volante.folio_administrativo,
      fecha_apertura: volante.fecha_apertura,
      fecha_realizacion: volante.fecha_realizacion,
      clientes: volante.clientes, // <-- Guardamos el arreglo
      pagado: volante.pagado,     // <-- Guardamos el pago
      estado_servicio: volante.estado_servicio,
      unidades: volante.unidades_asignadas,
      itinerario: volante.itinerario,
      folio_interno: volante.folio_interno_maestro,
    };

    if (volante.id) {
      const { error } = await supabase.from('volantes').update(payload).eq('id', volante.id);
      if (error) { alert('Error al actualizar: ' + error.message); return false; }
      alert(`✅ Actualización del Volante ${volante.folio_administrativo} guardada.`);
      set({ volantesGuardados: volantesGuardados.map(v => v.id === volante.id ? { ...v, ...payload, folio_administrativo: payload.folio } : v) });
      return true;
    } else {
      const { data, error } = await supabase.from('volantes').insert([payload]).select().single();
      if (error) { alert('Error al guardar: ' + error.message); return false; }
      alert(`✅ Volante ${volante.folio_administrativo} creado.`);
      set({
        volante: { ...volante, id: data.id },
        volantesGuardados: [{
          id: data.id,
          folio_administrativo: payload.folio,
          folio_interno_maestro: payload.folio_interno,
          fecha_apertura: payload.fecha_apertura,
          fecha_realizacion: payload.fecha_realizacion,
          clientes: payload.clientes,
          pagado: payload.pagado,
          estado_servicio: payload.estado_servicio as EstadoServicio,
          unidades_asignadas: payload.unidades,
          itinerario: payload.itinerario,
        }, ...volantesGuardados],
      });
      return true;
    }
  },

  cargarVolantes: async () => {
    const { data, error } = await supabase.from('volantes').select('*').order('fecha_apertura', { ascending: false });
    if (!error && data) {
      const mapeados = data.map(d => ({
        id: d.id,
        folio_administrativo: d.folio || 'Sin Folio',
        folio_interno_maestro: d.folio_interno || `VOL-INT-${d.id}`,
        fecha_apertura: d.fecha_apertura || new Date().toISOString().split('T')[0],
        fecha_realizacion: d.fecha_realizacion || d.fecha_apertura || new Date().toISOString().split('T')[0],
        clientes: d.clientes || (d.cliente ? [d.cliente] : []), // Compatibilidad con datos viejos
        pagado: d.pagado || false,
        estado_servicio: (d.estado_servicio || 'pendiente') as EstadoServicio,
        unidades_asignadas: d.unidades || [],
        itinerario: d.itinerario || [],
      }));
      set({ volantesGuardados: mapeados });
    }
  },

  cargarVolantePorId: (volante) => set({ volante }),

  nuevoVolante: () => {
    const { volantesGuardados } = get();
    let maxFolio = 813; 
    volantesGuardados.forEach(v => {
      const num = parseInt(v.folio_administrativo, 10);
      if (!isNaN(num) && num > maxFolio) maxFolio = num;
    });
    const siguienteFolio = (maxFolio + 1).toString().padStart(4, '0');

    set({
      volante: {
        folio_interno_maestro: `VOL-${Date.now()}`,
        folio_administrativo: siguienteFolio,
        fecha_apertura: new Date().toISOString().split('T')[0],
        fecha_realizacion: new Date().toISOString().split('T')[0],
        clientes: [],
        pagado: false,
        estado_servicio: 'pendiente',
        unidades_asignadas: [{ id: `u-${Date.now()}`, unidad_fisica_id: null, operadores_ids: [], auxiliares_ids: [] }],
        itinerario: [{ 
          id_parada: 'base-1', tipo: 'salida_base', cliente_referencia: 'Salida de Base', ubicacion: 'Base Central', 
          fecha: new Date().toISOString().split('T')[0], hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), detalle: 'Inicio de viaje' 
        }],
      },
    });
  },
}));