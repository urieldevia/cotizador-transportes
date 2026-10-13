import { useState } from 'react';
import { GenerarTexto } from './GenerarTexto';
import { AdminUnidades } from './AdminUnidades';
import { AdminPersonal } from './AdminPersonal';

type SubTab = 'generar' | 'unidades' | 'personal';

export function DocumentosTab() {
  const [subTab, setSubTab] = useState<SubTab>('generar');

  return (
    <div className="documentos-tab">
      <h1>Documentos</h1>

      <div className="subtabs-samsung">
        <button
          type="button"
          className={`subtab-item ${subTab === 'generar' ? 'active' : ''}`}
          onClick={() => setSubTab('generar')}
        >
          Generar
        </button>
        <button
          type="button"
          className={`subtab-item ${subTab === 'unidades' ? 'active' : ''}`}
          onClick={() => setSubTab('unidades')}
        >
          Unidades
        </button>
        <button
          type="button"
          className={`subtab-item ${subTab === 'personal' ? 'active' : ''}`}
          onClick={() => setSubTab('personal')}
        >
          Personal
        </button>
      </div>

      {subTab === 'generar' && <GenerarTexto />}
      {subTab === 'unidades' && <AdminUnidades />}
      {subTab === 'personal' && <AdminPersonal />}
    </div>
  );
}