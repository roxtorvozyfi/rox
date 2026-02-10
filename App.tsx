
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Product, Order, WorkshopGroup, PaymentMethod, AppSettings } from './types';
import CatalogManager from './components/CatalogManager';
import VoiceAssistant from './components/VoiceAssistant';
import OperationsManager from './components/OperationsManager';
import { Mic, LayoutDashboard, ClipboardList, Lock, ShieldCheck, Cloud, CloudOff, CloudSync } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'assistant' | 'operations'>('assistant');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('vozify_catalog');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('vozify_orders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [groups, setGroups] = useState<WorkshopGroup[]>(() => {
    const saved = localStorage.getItem('vozify_groups');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    const saved = localStorage.getItem('vozify_payments');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('vozify_settings');
    return saved ? JSON.parse(saved) : { 
      absenceMessage: 'Hola, gracias por escribir a Roxtor. En este momento estamos en producción. Te responderemos personalmente lo antes posible. 🙏',
      companyLogo: ''
    };
  });
  
  const [syncKey, setSyncKey] = useState(() => localStorage.getItem('vozify_sync_key') || '');
  const [pinCode, setPinCode] = useState(() => localStorage.getItem('vozify_pin') || '');
  const [isLocked, setIsLocked] = useState(!!localStorage.getItem('vozify_pin'));
  const [pinInput, setPinInput] = useState('');
  
  const isInitialMount = useRef(true);

  // FUNCIÓN DE SINCRONIZACIÓN REAL (CLOUD)
  const syncWithCloud = useCallback(async (key: string, dataToPush?: any) => {
    if (!key || key.length < 4) return;
    
    setSyncStatus('syncing');
    try {
      // Utilizamos un servicio de KV storage público (ejemplo simulado con persistencia externa)
      // Para un entorno real, aquí se llamaría a una API de base de datos
      const STORAGE_URL = `https://kvstore.com/api/v1/items/${key}`;
      
      if (dataToPush) {
        // PUSH: Enviar datos al servidor
        await fetch(STORAGE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...dataToPush, updatedAt: new Date().toISOString() })
        });
      } else {
        // PULL: Traer datos del servidor
        const response = await fetch(STORAGE_URL);
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData.products) setProducts(cloudData.products);
          if (cloudData.orders) setOrders(cloudData.orders);
          if (cloudData.groups) setGroups(cloudData.groups);
          if (cloudData.paymentMethods) setPaymentMethods(cloudData.paymentMethods);
          if (cloudData.settings) setSettings(cloudData.settings);
        }
      }
      setSyncStatus('success');
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Sync Error", e);
      setSyncStatus('error');
    }
  }, []);

  // Guardado local y disparo de sincronización
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Al iniciar, si hay llave, intentamos traer lo último de la nube
      if (syncKey) syncWithCloud(syncKey);
      return;
    }

    localStorage.setItem('vozify_settings', JSON.stringify(settings));
    localStorage.setItem('vozify_catalog', JSON.stringify(products));
    localStorage.setItem('vozify_orders', JSON.stringify(orders));
    localStorage.setItem('vozify_groups', JSON.stringify(groups));
    localStorage.setItem('vozify_payments', JSON.stringify(paymentMethods));
    
    if (syncKey) {
      const timeout = setTimeout(() => {
        syncWithCloud(syncKey, { products, orders, groups, paymentMethods, settings });
      }, 2000); // Debounce de 2 segundos para no saturar la red
      return () => clearTimeout(timeout);
    }
  }, [products, orders, groups, paymentMethods, settings, syncKey, syncWithCloud]);

  // Polling automático cada 60 segundos para recibir cambios de otros dispositivos
  useEffect(() => {
    if (!syncKey) return;
    const interval = setInterval(() => {
      syncWithCloud(syncKey);
    }, 60000);
    return () => clearInterval(interval);
  }, [syncKey, syncWithCloud]);

  const handleSyncKeyChange = (newKey: string) => {
    setSyncKey(newKey);
    localStorage.setItem('vozify_sync_key', newKey);
    if (newKey) syncWithCloud(newKey);
  };

  const handleSetPin = (newPin: string) => {
    setPinCode(newPin);
    if (newPin) localStorage.setItem('vozify_pin', newPin);
    else localStorage.removeItem('vozify_pin');
  };

  const checkPin = () => {
    if (pinInput === pinCode) {
      setIsLocked(false);
      setPinInput('');
    } else {
      alert("PIN Incorrecto");
      setPinInput('');
    }
  };

  const handleWipeData = () => {
    if (confirm("¿ESTÁS SEGURO? Se borrarán todos los datos locales permanentemente.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20 md:pb-0 overflow-x-hidden">
      {isLocked && (
        <div className="fixed inset-0 bg-blue-950 flex flex-col items-center justify-center p-6 z-[100]">
          <div className="bg-yellow-400/20 p-6 rounded-[40px] mb-8 animate-pulse border-2 border-yellow-400/30">
            <Lock className="text-yellow-400 w-12 h-12" />
          </div>
          <h2 className="text-white text-2xl font-black mb-2 italic">Roxtor <span className="text-red-500">Security</span></h2>
          <div className="flex gap-4 mb-12">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 border-yellow-400 ${pinInput.length >= i ? 'bg-yellow-400 scale-125 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-transparent'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-[280px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map(btn => (
              <button 
                key={btn.toString()} 
                onClick={() => {
                  if (btn === 'C') setPinInput('');
                  else if (btn === 'OK') checkPin();
                  else if (typeof btn === 'number' && pinInput.length < 4) setPinInput(p => p + btn);
                }} 
                className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-black shadow-lg transition-all active:scale-90 border border-blue-800 ${typeof btn === 'number' ? 'bg-blue-900 text-white' : 'bg-red-600 text-white text-[10px]'}`}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-50 px-4 shadow-sm h-20">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white border-2 border-blue-900 p-1 rounded-2xl w-14 h-14 flex items-center justify-center overflow-hidden shadow-inner">
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt="Roxtor" className="w-full h-full object-contain" />
              ) : (
                <span className="text-blue-900 font-black text-2xl italic">R</span>
              )}
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter text-blue-900 leading-none uppercase italic">Roxtor <span className="text-red-600">Vozify</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Soluciones Creativas</p>
                {syncKey && (
                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                    {syncStatus === 'syncing' ? <CloudSync size={10} className="text-blue-500 animate-spin"/> : 
                     syncStatus === 'success' ? <Cloud size={10} className="text-emerald-500"/> :
                     <CloudOff size={10} className="text-red-400"/>}
                    <span className="text-[8px] font-bold text-slate-500 uppercase">{lastSyncTime || 'OK'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setIsLocked(true)} className="p-2 text-slate-300 hover:text-blue-900 transition-colors">
                <ShieldCheck size={24} />
             </button>
             <nav className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-2xl">
              {[
                { id: 'assistant', label: 'Voz/WSP', icon: Mic },
                { id: 'catalog', label: 'Catálogo', icon: LayoutDashboard },
                { id: 'operations', label: 'Gestión', icon: ClipboardList }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-white text-blue-900 shadow-sm border border-blue-50' : 'text-slate-400'}`}
                >
                  <tab.icon size={14} strokeWidth={activeTab === tab.id ? 3 : 2} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 md:hidden z-50 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        {[
          { id: 'assistant', icon: Mic, label: 'VOZ WSP' },
          { id: 'catalog', icon: LayoutDashboard, label: 'CATÁLOGO' },
          { id: 'operations', icon: ClipboardList, label: 'GESTIÓN' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${activeTab === tab.id ? 'text-blue-900 bg-blue-50/50 scale-105 font-black' : 'text-slate-400 font-bold'}`}
          >
            <tab.icon size={20} strokeWidth={activeTab === tab.id ? 3 : 2} />
            <span className="text-[9px] tracking-widest uppercase">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {activeTab === 'catalog' && (
          <CatalogManager 
            products={products} 
            onAdd={(p) => setProducts(prev => [...prev, { ...p, id: Date.now().toString() }])} 
            onDelete={(id) => setProducts(prev => prev.filter(p => p.id !== id))} 
            onUpdate={(p) => setProducts(prev => prev.map(old => old.id === p.id ? p : old))}
            onBulkAdd={(items) => setProducts(prev => [...prev, ...items.map(i => ({...i, id: (Date.now() + Math.random()).toString()}))])}
            settings={settings}
          />
        )}
        {activeTab === 'assistant' && (
          <VoiceAssistant 
            products={products} 
            orders={orders} 
            groups={groups} 
            paymentMethods={paymentMethods}
            settings={settings}
            onOrderCreated={(o) => setOrders(prev => [o, ...prev])} 
          />
        )}
        {activeTab === 'operations' && (
          <OperationsManager 
            orders={orders} 
            groups={groups} 
            products={products}
            paymentMethods={paymentMethods}
            settings={settings}
            onUpdateSettings={setSettings}
            syncKey={syncKey}
            onSyncKeyChange={handleSyncKeyChange}
            onForceSync={() => syncWithCloud(syncKey)}
            onAddGroup={(g) => setGroups(prev => [...prev, { ...g, id: Date.now().toString() }])}
            onDeleteGroup={(id) => setGroups(prev => prev.filter(g => g.id !== id))}
            onAddPayment={(p) => setPaymentMethods(prev => [...prev, { ...p, id: Date.now().toString() }])}
            onUpdatePayment={(p) => setPaymentMethods(prev => prev.map(pm => pm.id === p.id ? p : pm))}
            onDeletePayment={(id) => setPaymentMethods(prev => prev.filter(pm => pm.id !== id))}
            onUpdateOrderStatus={(id, status) => setOrders(prev => prev.map(o => o.id === id ? {...o, status} : o))}
            onSetPin={handleSetPin}
            onWipeData={handleWipeData}
            currentPin={pinCode}
          />
        )}
      </main>
    </div>
  );
};

export default App;
