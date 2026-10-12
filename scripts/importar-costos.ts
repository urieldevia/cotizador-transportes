// scripts/importar-costos.ts
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno. Verifica .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const CORRECCIONES_ESTADO: Record<string, string> = {
  'HDO': 'HGO',
  'Tlax': 'TLAX',
  'Q ROO': 'QROO',
};

function parsePrecio(valor: string): number | null {
  if (!valor) return null;
  const limpio = String(valor).replace(/[$,\s]/g, '');
  if (limpio === '' || limpio === '#N/D') return null;
  const numero = parseFloat(limpio);
  return isNaN(numero) ? null : numero;
}

function normalizarEstado(estado: string): string {
  const trimmed = String(estado).trim();
  return CORRECCIONES_ESTADO[trimmed] || trimmed;
}

const UNIDADES_MAP: Array<{ nombre: string; columna: string }> = [
  { nombre: '1 ton',   columna: '1 ton' },
  { nombre: '2 ton',   columna: '2 ton' },
  { nombre: '3.5 ton', columna: '3.5 ton' },
  { nombre: '4 ton',   columna: '4 ton' },
  { nombre: '8 ton',   columna: '8 ton' },
];

async function importar() {
  const csvPath = path.join(process.cwd(), 'datos', 'costos-2027.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ No se encuentra el archivo: ${csvPath}`);
    process.exit(1);
  }

  console.log('📂 Leyendo CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parseResult.errors.length > 0) {
    console.warn('⚠️  Errores de parseo:', parseResult.errors.slice(0, 5));
  }

  const filas = parseResult.data as any[];
  console.log(`📊 ${filas.length} filas leídas`);

  console.log('🔍 Obteniendo unidades...');
  const { data: unidadesDB, error: errUnidades } = await supabase
    .from('unidades')
    .select('id, nombre');

  if (errUnidades || !unidadesDB) {
    console.error('❌ Error obteniendo unidades:', errUnidades);
    process.exit(1);
  }

  const unidadMap = new Map(unidadesDB.map(u => [u.nombre, u.id]));
  console.log(`✅ ${unidadesDB.length} unidades cargadas: ${[...unidadMap.keys()].join(', ')}`);

  console.log('📍 Procesando ubicaciones...');

  const ubicacionesUnicas = new Map<string, { poblacion: string; estado: string }>();
  const duplicados: string[] = [];

  for (const fila of filas) {
    const poblacion = String(fila['Población'] || '').trim();
    const estado = normalizarEstado(String(fila['Estado'] || ''));

    if (!poblacion || !estado) continue;

    const clave = `${poblacion}|||${estado}`;

    if (!ubicacionesUnicas.has(clave)) {
      ubicacionesUnicas.set(clave, { poblacion, estado });
    } else {
      duplicados.push(clave);
    }
  }

  if (duplicados.length > 0) {
    console.warn(`⚠️  ${duplicados.length} duplicados detectados (se conservó el primero):`);
    duplicados.forEach(d => console.warn(`   - ${d.replace('|||', ', ')}`));
  }

  console.log(`✅ ${ubicacionesUnicas.size} ubicaciones únicas`);

  const ubicacionesArray = Array.from(ubicacionesUnicas.values());
  const ubicacionesMap = new Map<string, number>();

  for (let i = 0; i < ubicacionesArray.length; i += 500) {
    const lote = ubicacionesArray.slice(i, i + 500);

    const { data, error } = await supabase
      .from('ubicaciones')
      .upsert(lote, { onConflict: 'poblacion,estado', ignoreDuplicates: false })
      .select('id, poblacion, estado');

    if (error) {
      console.error(`❌ Error insertando lote ${i / 500 + 1}:`, error);
      process.exit(1);
    }

    data?.forEach(u => {
      ubicacionesMap.set(`${u.poblacion}|||${u.estado}`, u.id);
    });

    console.log(`   → Lote ${i / 500 + 1}: ${data?.length || 0} ubicaciones`);
  }

  console.log(`✅ ${ubicacionesMap.size} ubicaciones en la DB`);

  console.log('🏢 Configurando origen por defecto...');

  const { data: cdmxUbic } = await supabase
    .from('ubicaciones')
    .select('id, poblacion, estado')
    .eq('estado', 'CDMX')
    .limit(1)
    .maybeSingle();

  if (!cdmxUbic) {
    console.warn('⚠️  No se encontró ubicación en CDMX. Crea el origen manualmente.');
    process.exit(1);
  }

  const { data: origenData, error: errOrigen } = await supabase
    .from('origenes')
    .upsert({
      nombre: 'CDMX Centro',
      ubicacion_id: cdmxUbic.id,
      es_default: true,
    }, { onConflict: 'nombre' })
    .select('id')
    .single();

  if (errOrigen || !origenData) {
    console.error('❌ Error creando origen:', errOrigen);
    process.exit(1);
  }

  const origenId = origenData.id;
  console.log(`✅ Origen configurado con ID ${origenId}`);

  console.log('💰 Procesando tarifas...');

  const tarifasAInsertar: Array<{
    origen_id: number;
    destino_id: number;
    unidad_id: number;
    costo: number;
  }> = [];

  let filasConError = 0;

  for (const fila of filas) {
    const poblacion = String(fila['Población'] || '').trim();
    const estado = normalizarEstado(String(fila['Estado'] || ''));
    const clave = `${poblacion}|||${estado}`;
    const destinoId = ubicacionesMap.get(clave);

    if (!destinoId) {
      filasConError++;
      continue;
    }

    for (const { nombre, columna } of UNIDADES_MAP) {
      const costo = parsePrecio(String(fila[columna] || ''));
      const unidadId = unidadMap.get(nombre);

      if (costo === null || !unidadId) continue;

      tarifasAInsertar.push({
        origen_id: origenId,
        destino_id: destinoId,
        unidad_id: unidadId,
        costo,
      });
    }
  }

  console.log(`✅ ${tarifasAInsertar.length} tarifas válidas construidas`);
  if (filasConError > 0) {
    console.warn(`⚠️  ${filasConError} filas omitidas por errores`);
  }

  console.log('📤 Insertando tarifas...');
  for (let i = 0; i < tarifasAInsertar.length; i += 1000) {
    const lote = tarifasAInsertar.slice(i, i + 1000);

    const { error } = await supabase
      .from('tarifas')
      .upsert(lote, {
        onConflict: 'origen_id,destino_id,unidad_id,vigente_desde',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`❌ Error en lote ${i / 1000 + 1}:`, error);
    } else {
      console.log(`   → Lote ${i / 1000 + 1}: ${lote.length} tarifas`);
    }
  }

  console.log('\n🎉 ¡Importación completada!');
  console.log(`   Ubicaciones: ${ubicacionesMap.size}`);
  console.log(`   Tarifas:     ${tarifasAInsertar.length}`);
}

importar().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});