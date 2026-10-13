import { useState } from 'react';
import { CotizadorForm } from './components/CotizadorForm';
import { DocumentosTab } from './components/DocumentosTab';
import { Tabs } from './components/Tabs';
import './App.css';

type Tab = 'cotizador' | 'documentos';

function App() {
  const [tab, setTab] = useState<Tab>('cotizador');

  return (
    <div className="app">
      <Tabs activo={tab} onChange={setTab} />
      {tab === 'cotizador' && <CotizadorForm />}
      {tab === 'documentos' && <DocumentosTab />}
    </div>
  );
}

export default App;