import React, { useState, useRef } from 'react';
import { Order, WorkshopGroup, Product, PaymentMethod, AppSettings } from '../types';
import { ClipboardList, Users, CheckCircle2, Clock, Printer, Plus, Trash2, Wallet, RefreshCw, Key, Smartphone, Eye, EyeOff, ShieldAlert, ShieldCheck, Lock, Info, Edit2, Share2, Check, X, BellOff, MessageSquareText, Phone, UserCheck, Download, DollarSign, Building, Camera, ExternalLink, MessageCircle } from 'lucide-react';

interface Props {
  orders: Order[];
  groups: WorkshopGroup[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  syncKey: string;
  onSyncKeyChange: (key: string) => void;
  onForceSync: () => void;
  onAddGroup: (group: Omit<WorkshopGroup, 'id'>) => void;
  onDeleteGroup: (id: string) => void;
  onAddPayment: (payment: Omit<PaymentMethod, 'id'>) => void;
  onUpdatePayment: (payment: PaymentMethod) => void;
  onDeletePayment: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onSetPin: (pin: string) => void;
  onWipeData: () => void;
  currentPin: string;
}

const OperationsManager: React.FC<Props> = ({ orders, groups, products, paymentMethods, settings, onUpdateSettings, syncKey, onSyncKeyChange, onForceSync, onAddGroup, onDeleteGroup, onAddPayment, onUpdatePayment, onDeletePayment, onUpdateOrderStatus, onSetPin, onWipeData, currentPin }) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'workshops' | 'payments' | 'security'>('orders');
  const [showWorkshopForm, setShowWorkshopForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [workshopData, setWorkshopData] = useState<Omit<WorkshopGroup, 'id'>>({
    name: '',
    specialty: '',
    dailyCapacity: 10,
    contactName: '',
    contactPhone: ''
  });

  const [paymentData, setPaymentData] = useState<Omit<PaymentMethod, 'id'>>({
    name: '',
    details: ''
  });

  const [localSyncKey, setLocalSyncKey] = useState(syncKey);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await onForceSync();
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateSettings({ ...settings, companyLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddWorkshop = (e: React.FormEvent) => {
    e.preventDefault();
    onAddGroup(workshopData);
    setWorkshopData({ name: '', specialty: '', dailyCapacity: 10, contactName: '', contactPhone: '' });
    setShowWorkshopForm(false);
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPayment(paymentData);
    setPaymentData({ name: '', details: '' });
    setShowPaymentForm(false);
  };

  const exportOrderAsImage = (order: Order) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1000;
    canvas.height = 1400;

    const drawReceipt = (logoImg?: HTMLImageElement) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,1000,1400);
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0,0,1000,260);
      
      if (logoImg) {
        ctx.drawImage(logoImg, 50, 40, 180, 180);
      } else {
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.roundRect(50, 40, 180, 180, 30); ctx.fill();
        ctx.fillStyle = '#1e3a8a'; ctx.font = 'black 120px Inter'; ctx.textAlign = 'center';
        ctx.fillText('R', 140, 175);
      }

      ctx.fillStyle = '#ffffff'; 
      ctx.textAlign = 'left';
      ctx.font = '900 42px Inter'; ctx.fillText('INVERSIONES ROXTOR, C.A', 260, 100);
      ctx.fillStyle = '#facc15'; ctx.font = 'bold 22px Inter'; ctx.fillText('J-402959737 | COMPROBANTE DE PEDIDO', 260, 140);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#bfdbfe'; ctx.font = '600 16px Inter';
      ctx.fillText('0286-9343503', 950, 90);
      ctx.fillText('+58 424 9635252', 950, 120);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = '900 38px Inter'; ctx.fillText(`PEDIDO: ${order.orderNumber}`, 50, 340);
      ctx.font = 'bold 26px Inter'; ctx.fillText(`CLIENTE: ${order.clientName.toUpperCase()}`, 50, 395);
      ctx.font = '500 18px Inter'; ctx.fillStyle = '#64748b'; ctx.fillText(`FECHA: ${new Date().toLocaleDateString()}`, 50, 435);
      
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(50, 480, 900, 70);
      ctx.fillStyle = '#1e3a8a'; ctx.font = 'black 18px Inter';
      ctx.fillText('DESCRIPCIÓN', 70, 525); ctx.fillText('CANT', 600, 525); ctx.fillText('SUBTOTAL', 800, 525);

      let y = 590;
      order.items.forEach(item => {
        ctx.fillStyle = '#334155'; ctx.font = 'bold 22px Inter';
        ctx.fillText(item.name.toUpperCase(), 70, y);
        ctx.fillText(item.quantity.toString(), 610, y);
        ctx.fillText(`$${(item.quantity * item.price).toFixed(2)}`, 810, y);
        y += 60;
      });

      ctx.fillStyle = '#eff6ff'; ctx.fillRect(50, y+40, 900, 160);
      ctx.fillStyle = '#1e3a8a'; ctx.font = 'black 42px Inter';
      ctx.fillText(`TOTAL: $${order.total.toFixed(2)}`, 540, y+115);
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 22px Inter';
      ctx.fillText(`PAGO: $${order.paidAmount.toFixed(2)}`, 540, y+160);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 18px Inter';
      ctx.fillText('SOLUCIONES CREATIVAS EN CONFECCIÓN - ROXTOR PZO', 500, 1350);

      const link = document.createElement('a');
      link.download = `Recibo_Roxtor_${order.orderNumber}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9); link.click();
    };

    if (settings.companyLogo) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => drawReceipt(img);
      img.src = settings.companyLogo;
    } else {
      drawReceipt();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-200/50 p-1.5 rounded-[24px] w-full border border-slate-200 shadow-inner">
        {[
          { id: 'orders', label: 'PEDIDOS', icon: ClipboardList },
          { id: 'workshops', label: 'TALLERES', icon: Users },
          { id: 'payments', label: 'PAGOS', icon: Wallet },
          { id: 'security', label: 'ROXTOR', icon: Building }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 py-3 rounded-[18px] text-[9px] font-black transition-all ${activeSubTab === tab.id ? 'bg-white text-blue-900 shadow-md border border-blue-50' : 'text-slate-500 hover:text-slate-700'}`}>
            <tab.icon size={14} strokeWidth={activeSubTab === tab.id ? 3 : 2} />
            <span className="tracking-widest uppercase">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeSubTab === 'orders' && (
        <div className="space-y-4 pb-20">
          <div className="flex justify-between items-center"><h3 className="font-black text-blue-900 uppercase text-[10px] tracking-[0.2em]">Control de Producción</h3></div>
          <div className="grid grid-cols-1 gap-4">
            {orders.length === 0 ? (
              <div className="bg-white border rounded-[40px] p-24 text-center text-slate-300">
                <ClipboardList size={56} className="mx-auto mb-6 opacity-20"/>
                <p className="text-[10px] font-black uppercase tracking-widest">Sin actividad hoy</p>
              </div>
            ) : orders.map(order => (
              <div key={order.id} className="bg-white border rounded-[36px] p-7 shadow-sm flex flex-col gap-5 border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-blue-900 text-xl tracking-tighter">#{order.orderNumber}</h4>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">{order.clientName}</p>
                  </div>
                  <button onClick={() => exportOrderAsImage(order)} className="p-3 bg-blue-50 text-blue-900 rounded-2xl hover:bg-yellow-400 transition-colors shadow-sm"><Download size={22}/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, idx) => (
                    <span key={idx} className="bg-slate-50 text-[10px] px-4 py-2 rounded-2xl font-black text-slate-500 border border-slate-100">{item.quantity}x {item.name}</span>
                  ))}
                </div>
                <div className="pt-5 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 font-black">T</div>
                    <span className="text-[11px] font-black uppercase text-slate-700">
                      {groups.find(g => g.id === order.workshopGroupId)?.name || 'POR ASIGNAR'}
                    </span>
                  </div>
                  <select value={order.status} onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as any)} className="bg-blue-900 text-white text-[10px] font-black uppercase px-5 py-2.5 rounded-2xl border-none outline-none cursor-pointer shadow-lg active:scale-95 transition-transform">
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">Producción</option>
                    <option value="listo">Completado</option>
                    <option value="entregado">Entregado</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'workshops' && (
        <div className="space-y-4 pb-20">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-blue-900 uppercase text-[10px] tracking-[0.2em]">Talleres de Confección</h3>
            <button onClick={() => setShowWorkshopForm(true)} className="bg-blue-900 text-white p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all border-2 border-yellow-400">
              <Plus size={24}/>
            </button>
          </div>

          {showWorkshopForm && (
            <form onSubmit={handleAddWorkshop} className="bg-white border-2 border-blue-100 rounded-[40px] p-8 shadow-2xl space-y-5 animate-in zoom-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre del Taller</label><input required className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" value={workshopData.name} onChange={e => setWorkshopData({...workshopData, name: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Especialidad</label><input required className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none" value={workshopData.specialty} onChange={e => setWorkshopData({...workshopData, specialty: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">WhatsApp</label><input placeholder="58424..." className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none" value={workshopData.contactPhone} onChange={e => setWorkshopData({...workshopData, contactPhone: e.target.value})}/></div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowWorkshopForm(false)} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">Cerrar</button>
                <button type="submit" className="bg-blue-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl tracking-widest">Registrar Taller</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {groups.map(group => (
              <div key={group.id} className="bg-white border rounded-[40px] p-7 shadow-sm group hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-900 text-yellow-400 rounded-3xl flex items-center justify-center font-black text-2xl shadow-lg italic">T</div>
                    <div><h4 className="font-black text-slate-900 text-base uppercase leading-tight">{group.name}</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{group.specialty}</p></div>
                  </div>
                  <button onClick={() => onDeleteGroup(group.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2"><Trash2 size={18}/></button>
                </div>
                {group.contactPhone && (
                  <button onClick={() => window.open(`https://wa.me/${group.contactPhone.replace(/\+/g, '')}`, '_blank')} className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-900 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-yellow-400 transition-all shadow-sm">
                    <MessageSquareText size={18} className="text-red-500"/> Chat de Producción WhatsApp
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'payments' && (
        <div className="space-y-4 pb-20">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-blue-900 uppercase text-[10px] tracking-[0.2em]">Cuentas de Cobro</h3>
            <button onClick={() => setShowPaymentForm(true)} className="bg-red-600 text-white p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all border-2 border-white">
              <Plus size={24}/>
            </button>
          </div>

          {showPaymentForm && (
            <form onSubmit={handleAddPayment} className="bg-white border-2 border-red-50 rounded-[40px] p-8 shadow-2xl space-y-5 animate-in zoom-in duration-200">
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Banco / Canal</label><input required placeholder="Banesco / Pago Móvil" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none" value={paymentData.name} onChange={e => setPaymentData({...paymentData, name: e.target.value})}/></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Datos Roxtor</label><textarea required placeholder="RIF, Titular, Teléfono..." className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none min-h-[100px]" value={paymentData.details} onChange={e => setPaymentData({...paymentData, details: e.target.value})}/></div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowPaymentForm(false)} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">Cerrar</button>
                <button type="submit" className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl tracking-widest">Guardar Cuenta</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="bg-white border rounded-[40px] p-7 shadow-sm flex flex-col justify-between hover:border-red-200 transition-colors border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-red-50 text-red-600 rounded-3xl shadow-inner"><Wallet size={24}/></div>
                    <h4 className="font-black text-blue-900 text-base uppercase tracking-tight">{pm.name}</h4>
                  </div>
                  <button onClick={() => onDeletePayment(pm.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2"><Trash2 size={18}/></button>
                </div>
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-600 whitespace-pre-wrap leading-relaxed">{pm.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeSubTab === 'security' && (
        <div className="space-y-6 pb-20">
           <div className="bg-white border-2 border-blue-50 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-6 mb-8">
                <div onClick={() => logoInputRef.current?.click()} className="p-5 bg-white rounded-[32px] text-blue-900 cursor-pointer relative overflow-hidden group w-28 h-28 flex items-center justify-center shadow-xl border-4 border-blue-900">
                  {settings.companyLogo ? (
                    <img src={settings.companyLogo} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center"><Camera size={36} /><p className="text-[8px] font-black uppercase mt-1.5 leading-none">Cargar Logo</p></div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Edit2 size={24} className="text-white"/></div>
                  <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </div>
                <div>
                  <h4 className="font-black text-blue-900 text-2xl leading-tight tracking-tighter italic text-nowrap">INVERSIONES ROXTOR, C.A</h4>
                  <p className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mt-1">RIF: J-402959737</p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2 mb-3">
                    <MessageCircle size={14} className="text-red-500" /> Mensaje de Ausencia (Asistente)
                  </label>
                  <textarea 
                    className="w-full bg-white border-none rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] shadow-inner"
                    value={settings.absenceMessage}
                    onChange={(e) => onUpdateSettings({ ...settings, absenceMessage: e.target.value })}
                    placeholder="Escribe el mensaje que el asistente usará cuando no estés disponible..."
                  />
                  <p className="text-[9px] text-slate-400 font-bold mt-2 italic px-2">* Este mensaje se activará automáticamente en el Piloto Automático para consultas personales.</p>
                </div>

                <div className="mt-8 space-y-4">
                  <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] mb-4">Canales de Atención Directa</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => window.open('https://wa.me/584249635252', '_blank')}
                      className="flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <MessageSquareText size={18} /> Ventas 1: +58 424 9635252
                    </button>
                    <button 
                      onClick={() => window.open('https://wa.me/584249639921', '_blank')}
                      className="flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <MessageSquareText size={18} /> Ventas 2: +58 424 9639921
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-6">
                  <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase"><span>Central Telefónica:</span><span className="text-blue-900">0286-9343503</span></div>
                  <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase"><span>Instagram Oficial:</span><span className="text-blue-900">@roxtor.pzo</span></div>
                </div>
              </div>
           </div>
           
           <div className="bg-blue-900 text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden border-2 border-yellow-400">
              <div className="flex justify-between items-start mb-5">
                <h4 className="font-black text-yellow-400 text-sm uppercase tracking-[0.3em]">Sincronización Cloud</h4>
                <button onClick={handleManualSync} className={`text-yellow-400 p-1 hover:rotate-180 transition-transform ${isSyncing ? 'animate-spin' : ''}`}>
                  <RefreshCw size={18} />
                </button>
              </div>
              <div className="flex gap-3">
                <input type="text" className="flex-1 bg-blue-950 border-none rounded-2xl px-6 py-5 text-yellow-400 font-black uppercase outline-none focus:ring-2 focus:ring-yellow-400 tracking-[0.2em] italic" value={localSyncKey} onChange={e => setLocalSyncKey(e.target.value.toUpperCase())} placeholder="CÓDIGO DE EQUIPO..."/>
                <button onClick={() => onSyncKeyChange(localSyncKey)} className="bg-yellow-400 text-blue-900 px-6 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-yellow-300 transition-all active:scale-95">Vincula</button>
              </div>
              <p className="text-[9px] text-blue-300 font-bold mt-4 italic">* Usa el mismo código en todos tus dispositivos para compartir catálogo y pedidos en tiempo real.</p>
           </div>

           <button onClick={onWipeData} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-red-100 hover:bg-red-100 transition-colors">
             <Trash2 size={16}/> Borrar Todos los Datos Locales
           </button>
        </div>
      )}
    </div>
  );
};

export default OperationsManager;