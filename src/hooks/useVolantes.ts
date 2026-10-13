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