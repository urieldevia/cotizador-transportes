import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Propietario, UnidadFisica, Personal } from '../lib/types';

let cachePropietarios: Propietario[] | null = null;
let cacheUnidades: UnidadFisica[] | null = null;
let cachePersonal: Personal[] | null = null;

async function cargarPropietarios(): Promise<Propietario[]> {
  if (cachePropietarios) return cachePropietarios;
  const { data, error } = await supabase
    .from('propietarios')
    .select('id, nombre, activo')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  cachePropietarios = (data ?? []) as Propietario[];
  return cachePropietarios;
}

async function cargarUnidades(): Promise<UnidadFisica[]> {
  if (cacheUnidades) return cacheUnidades;
  const { data, error } = await supabase
    .from('unidades_fisicas')
    .select('id, propietario_id, marca_modelo, color, placas, tipo_unidad_id, notas, activo')
    .eq('activo', true)
    .order('marca_modelo');
  if (error) throw error;
  cacheUnidades = (data ?? []) as UnidadFisica[];
  return cacheUnidades;
}

async function cargarPersonal(): Promise<Personal[]> {
  if (cachePersonal) return cachePersonal;
  const { data, error } = await supabase
    .from('personal')
    .select('id, nombre_completo, apodo, telefono, rol, activo')
    .eq('activo', true)
    .order('nombre_completo');
  if (error) throw error;
  cachePersonal = (data ?? []) as Personal[];
  return cachePersonal;
}

export function useCatalogo() {
  const [propietarios, setPropietarios] = useState<Propietario[]>(
    cachePropietarios ?? []
  );
  const [unidades, setUnidades] = useState<UnidadFisica[]>(cacheUnidades ?? []);
  const [personal, setPersonal] = useState<Personal[]>(cachePersonal ?? []);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    cachePropietarios = null;
    cacheUnidades = null;
    cachePersonal = null;
    setCargando(true);
    const [p, u, per] = await Promise.all([
      cargarPropietarios(),
      cargarUnidades(),
      cargarPersonal(),
    ]);
    setPropietarios([...p]);
    setUnidades([...u]);
    setPersonal([...per]);
    setCargando(false);
  }, []);

  useEffect(() => {
    let activo = true;
    Promise.all([cargarPropietarios(), cargarUnidades(), cargarPersonal()])
      .then(([p, u, per]) => {
        if (activo) {
          setPropietarios(p);
          setUnidades(u);
          setPersonal(per);
          setCargando(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  return { propietarios, unidades, personal, cargando, refrescar };
}

export async function crearPropietario(nombre: string) {
  const { error } = await supabase.from('propietarios').insert({ nombre });
  if (error) throw new Error(error.message);
  cachePropietarios = null;
}

export async function eliminarPropietario(id: number) {
  const { error } = await supabase
    .from('propietarios')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
  cachePropietarios = null;
}

export async function crearUnidadFisica(data: {
  propietario_id: number | null;
  marca_modelo: string;
  color: string | null;
  placas: string | null;
  tipo_unidad_id: number | null;
  notas: string | null;
}) {
  const { error } = await supabase.from('unidades_fisicas').insert(data);
  if (error) throw new Error(error.message);
  cacheUnidades = null;
}

export async function actualizarUnidadFisica(
  id: number,
  data: Partial<UnidadFisica>
) {
  const { error } = await supabase
    .from('unidades_fisicas')
    .update(data)
    .eq('id', id);
  if (error) throw new Error(error.message);
  cacheUnidades = null;
}

export async function eliminarUnidadFisica(id: number) {
  const { error } = await supabase
    .from('unidades_fisicas')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
  cacheUnidades = null;
}

export async function crearPersonal(data: {
  nombre_completo: string;
  apodo: string | null;
  telefono: string | null;
  rol: string;
}) {
  const { error } = await supabase.from('personal').insert(data);
  if (error) throw new Error(error.message);
  cachePersonal = null;
}

export async function actualizarPersonal(id: number, data: Partial<Personal>) {
  const { error } = await supabase.from('personal').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  cachePersonal = null;
}

export async function eliminarPersonal(id: number) {
  const { error } = await supabase
    .from('personal')
    .update({ activo: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
  cachePersonal = null;
}