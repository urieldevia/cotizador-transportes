import { useState } from 'react';
import type { CotizacionResult } from '../lib/types';

export function DesgloseCotizacion({ resultado }: { resultado: CotizacionResult }) {
  const [msgCopiado, setMsgCopiado] = useState<'cliente' | 'operador' | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const copiarMsg = async (texto: string, tipo: 'cliente' | 'operador') => {
    try {
      await navigator.clipboard.writeText(texto);
      setMsgCopiado(tipo);
      setTimeout(() => setMsgCopiado(null), 2000);
    } catch (e) { alert('No se pudo copiar'); }
  };

  const whatsapp = (texto: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="resultado apple-card">
      <div className="resultado-header">
        <h2>{resultado.modalidad.replace('_', ' ').toUpperCase()}</h2>
        <span className="badge">{resultado.folio}</span>
      </div>

      <div className="resultado-descripcion">
        <p>{resultado.descripcion}</p>
        <div className="mt-2 text-sm text-secondary font-semibold">{fmt(resultado.total)} + IVA</div>
      </div>

      <div className="resultado-desglose">
        <h3>Desglose</h3>
        <table>
          <tbody>
            {resultado.desglose.map((item, idx) => (
              <tr key={idx}>
                <td>{item.concepto}</td>
                <td className="right mono">{fmt(item.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="resultado-totales border-t pt-4">
        <h3 className="text-sm font-bold mb-3 uppercase text-secondary">Mensajes Rápidos</h3>
        
        <div className="msg-box mb-3">
          <p className="text-xs font-semibold text-primary mb-1">Mensaje para el Cliente:</p>
          <p className="text-sm bg-gray-50 p-3 rounded-lg mb-2">{resultado.mensajeCliente}</p>
          <div className="flex gap-2">
            <button className={`btn-apple flex-1 ${msgCopiado === 'cliente' ? 'btn-apple-whatsapp' : 'btn-apple-secondary'}`} onClick={() => copiarMsg(resultado.mensajeCliente, 'cliente')}>
              {msgCopiado === 'cliente' ? '✓ Copiado' : '📋 Copiar'}
            </button>
            <button className="btn-apple btn-apple-whatsapp flex-1" onClick={() => whatsapp(resultado.mensajeCliente)}>
              💬 Enviar
            </button>
          </div>
        </div>

        <div className="msg-box">
          <p className="text-xs font-semibold text-primary mb-1">Mensaje para el Operador:</p>
          <p className="text-sm bg-gray-50 p-3 rounded-lg mb-2">{resultado.mensajeOperador}</p>
          <div className="flex gap-2">
            <button className={`btn-apple flex-1 ${msgCopiado === 'operador' ? 'btn-apple-whatsapp' : 'btn-apple-secondary'}`} onClick={() => copiarMsg(resultado.mensajeOperador, 'operador')}>
              {msgCopiado === 'operador' ? '✓ Copiado' : '📋 Copiar'}
            </button>
            <button className="btn-apple btn-apple-whatsapp flex-1" onClick={() => whatsapp(resultado.mensajeOperador)}>
              💬 Enviar
            </button>
          </div>
        </div>

        <div className="row total mt-4">
          <span>Total (+ IVA)</span>
          <span className="mono">{fmt(resultado.total)}</span>
        </div>
      </div>
    </div>
  );
}