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

export async function obtenerSiguienteFolio(): Promise<string> {
  const { data } = await supabase
    .from('volantes')
    .select('folio')
    .like('folio', 'VOLANT-%')
    .order('id', { ascending: false })
    .limit(20);

  let siguiente = 754;
  if (data && data.length > 0) {
    const numeros = data
      .map((v) => {
        const m = v.folio.match(/VOLANT-(\d+)/);
        return m ? parseInt(m[1]) : 0;
      })
      .filter((n) => n > 0);

    if (numeros.length > 0) {
      siguiente = Math.max(...numeros) + 1;
    }
  }
  return `VOLANT-${siguiente}`;
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