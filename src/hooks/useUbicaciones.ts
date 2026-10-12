import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Ubicacion } from '../lib/types';

let cacheUbicaciones: Ubicacion[] | null = null;
let promesaCarga: Promise<Ubicacion[]> | null = null;

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function cargarUbicaciones(): Promise<Ubicacion[]> {
  if (cacheUbicaciones) return cacheUbicaciones;
  if (promesaCarga) return promesaCarga;

  promesaCarga = (async () => {
    const TODAS: Ubicacion[] = [];
    const LOTE = 1000;
    let desde = 0;
    let continuar = true;

    while (continuar) {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('id, poblacion, estado, zona_base')
        .eq('activo', true)
        .order('poblacion')
        .range(desde, desde + LOTE - 1);

      if (error) {
        throw new Error(`Error cargando ubicaciones: ${error.message}`);
      }

      const filas = (data ?? []) as Ubicacion[];
      TODAS.push(...filas);

      if (filas.length < LOTE) {
        continuar = false;
      } else {
        desde += LOTE;
      }
    }

    cacheUbicaciones = TODAS;
    return TODAS;
  })();

  return promesaCarga;
}

export function useUbicaciones() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>(
    cacheUbicaciones ?? []
  );
  const [cargando, setCargando] = useState(!cacheUbicaciones);

  useEffect(() => {
    let activo = true;
    cargarUbicaciones()
      .then((lista) => {
        if (activo) {
          setUbicaciones(lista);
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

  return { ubicaciones, cargando };
}

export function buscarUbicaciones(
  ubicaciones: Ubicacion[],
  query: string,
  limite = 20
): Ubicacion[] {
  const q = normalizarTexto(query);
  if (q.length < 2) return [];

  const resultados: Array<{ u: Ubicacion; score: number }> = [];

  for (const u of ubicaciones) {
    const poblacionNorm = normalizarTexto(u.poblacion);
    const estadoNorm = normalizarTexto(u.estado);

    let score = -1;

    if (poblacionNorm.startsWith(q)) {
      score = 1000 - poblacionNorm.length;
    } else if (new RegExp(`\\b${q}`).test(poblacionNorm)) {
      score = 800 - poblacionNorm.length;
    } else if (poblacionNorm.includes(q)) {
      score = 600 - poblacionNorm.length;
    } else if (estadoNorm.startsWith(q)) {
      score = 400;
    } else if (estadoNorm.includes(q)) {
      score = 200;
    }

    if (score > 0) {
      resultados.push({ u, score });
    }
  }

  return resultados
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.u.poblacion.localeCompare(b.u.poblacion);
    })
    .slice(0, limite)
    .map((r) => r.u);
}