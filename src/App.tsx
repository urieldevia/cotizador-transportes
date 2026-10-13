import { useState } from 'react';
import { CotizadorForm } from './components/CotizadorForm';
import { DocumentosTab } from './components/DocumentosTab';
import { VolanteTab } from './components/VolanteTab';
import { Tabs } from './components/Tabs';
import './App.css';

type Tab = 'cotizador' | 'documentos' | 'volante';

function App() {
  const [tab, setTab] = useState<Tab>('cotizador');

  return (
    <div className="app">
      <div className="no-print">
        <Tabs activo={tab} onChange={setTab} />
      </div>
      {tab === 'cotizador' && <CotizadorForm />}
      {tab === 'documentos' && <DocumentosTab />}
      {tab === 'volante' && <VolanteTab />}
    </div>
  );
}

export default App;