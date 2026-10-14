import { toBlob } from 'html-to-image';

const FILE_NAME_PREFIX = 'volante';

/**
 * Captura un elemento DOM y devuelve un Blob PNG.
 * Optimizado para impresión tipo documento (2x pixel ratio).
 */
export async function capturarComoImagen(
  element: HTMLElement
): Promise<Blob> {
  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    width: element.offsetWidth,
    height: element.offsetHeight,
    style: {
      transform: 'none',
      boxShadow: 'none',
      borderRadius: '0',
      border: 'none',
    },
  });

  if (!blob) throw new Error('No se pudo generar la imagen');
  return blob;
}

/**
 * Descarga la imagen como archivo PNG.
 */
export function descargarImagen(blob: Blob, folio: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${FILE_NAME_PREFIX}-${folio || 'sin-folio'}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copia la imagen al portapapeles (solo HTTPS / localhost).
 * Funciona en Chrome, Edge, Safari moderno.
 */
export async function copiarImagenAlPortapapeles(blob: Blob): Promise<void> {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error(
      'Tu navegador no soporta copiar imágenes. Usa "Descargar PNG".'
    );
  }

  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
}

/**
 * Comparte la imagen usando Web Share API (móvil nativo).
 * Si no está disponible, lanza error para hacer fallback.
 */
export async function compartirImagen(
  blob: Blob,
  folio: string,
  texto: string
): Promise<boolean> {
  const file = new File([blob], `${FILE_NAME_PREFIX}-${folio}.png`, {
    type: 'image/png',
  });

  if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
    return false;
  }

  try {
    await navigator.share({
      files: [file],
      title: `Volante ${folio}`,
      text: texto,
    });
    return true;
  } catch (err) {
    if ((err as Error).name === 'AbortError') return true;
    throw err;
  }
}

/**
 * Abre WhatsApp Web con texto (para cuando no hay Web Share API).
 */
export function abrirWhatsAppConTexto(texto: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}