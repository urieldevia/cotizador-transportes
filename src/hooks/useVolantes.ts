import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Volante } from '../lib/types';

export function useVolantes() {
  const [volantes, setVolantes] = useState<Volante[]>([]);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('volantes')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setCargando(false);
      return;
    }
    setVolantes((data ?? []) as Volante[]);
    setCargando(false);
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  return { volantes, cargando, refrescar };
}

/**
 * Calcula el siguiente folio rellenando huecos.
 * Ej: si existen VOLANT-754 y VOLANT-756, devuelve VOLANT-755.
 * Si no existe ninguno, empieza en 754.
 */
export async function obtenerSiguienteFolio(): Promise<string> {
  const { data } = await supabase
    .from('volantes')
    .select('folio')
    .like('folio', 'VOLANT-%')
    .eq('activo', true);

  const numeros = (data ?? [])
    .map((v) => {
      const m = v.folio.match(/VOLANT-(\d+)/);
      return m ? parseInt(m[1]) : 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  if (numeros.length === 0) {
    return 'VOLANT-754';
  }

  // Buscar el primer hueco desde 754
  let esperado = 754;
  for (const n of numeros) {
    if (n < 754) continue;
    if (n === esperado) {
      esperado++;
    } else if (n > esperado) {
      // Hueco encontrado
      return `VOLANT-${esperado}`;
    }
  }
  return `VOLANT-${esperado}`;
}

export async function guardarVolante(
  data: Omit<Volante, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  const { data: inserted, error } = await supabase
    .from('volantes')
    .insert(data)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return inserted.id;
}

export async function actualizarVolante(
  id: number,
  data: Partial<Omit<Volante, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('volantes')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function eliminarVolante(id: number): Promise<void> {
  const { error } = await supabase
    .from('volantes')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw new Error(error.message);
}