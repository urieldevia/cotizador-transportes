import { toBlob } from 'html-to-image';

const FILE_NAME_PREFIX = 'volante';

/**
 * Captura un elemento DOM y devuelve un Blob PNG.
 * Configuración robusta: ignora fuentes externas, imágenes rotas y CSS problemáticos.
 */
export async function capturarComoImagen(
  element: HTMLElement
): Promise<Blob> {
  // Asegurar visibilidad
  const originalStyles = {
    display: element.style.display,
    visibility: element.style.visibility,
    opacity: element.style.opacity,
  };
  element.style.display = 'block';
  element.style.visibility = 'visible';
  element.style.opacity = '1';

  try {
    // Intento 1: configuración completa
    try {
      const blob = await toBlob(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        skipAutoScale: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: 'none',
          boxShadow: 'none',
          borderRadius: '0',
          border: 'none',
          margin: '0',
        },
        filter: (node) => {
          // Excluir imágenes que puedan fallar (logo.png si no existe)
          if (node instanceof HTMLImageElement) {
            return node.complete && node.naturalWidth > 0;
          }
          return true;
        },
      });

      if (blob) return blob;
    } catch (err1) {
      console.warn('Intento 1 falló, probando configuración mínima:', err1);
    }

    // Intento 2: configuración mínima
    const blob = await toBlob(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
    });

    if (!blob) throw new Error('No se pudo generar la imagen');
    return blob;
  } finally {
    // Restaurar estilos originales
    element.style.display = originalStyles.display;
    element.style.visibility = originalStyles.visibility;
    element.style.opacity = originalStyles.opacity;
  }
}

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

export async function copiarImagenAlPortapapeles(blob: Blob): Promise<void> {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error(
      'Tu navegador no soporta copiar imágenes. Usa "Descargar PNG".'
    );
  }
  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
}

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

export function abrirWhatsAppConTexto(texto: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}