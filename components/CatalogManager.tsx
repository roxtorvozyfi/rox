
import React, { useState, useRef } from 'react';
import { Product, AppSettings } from '../types';
import { Plus, Trash2, Package, Tag, Clock, Scissors, Ruler, FileUp, Loader2, Image as ImageIcon, X, TrendingDown, DollarSign, Download, Share2, AlignLeft, Camera, Instagram, Phone } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

interface Props {
  products: Product[];
  onAdd: (product: Omit<Product, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (product: Product) => void;
  onBulkAdd: (products: Omit<Product, 'id'>[]) => void;
  settings: AppSettings;
}

const CatalogManager: React.FC<Props> = ({ products, onAdd, onDelete, onUpdate, onBulkAdd, settings }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  const [currentUpdatingId, setCurrentUpdatingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    wholesalePrice: 0,
    fabricType: '',
    deliveryTime: '',
    wholesaleDiscount: '',
    sizePriceAdjustment: '',
    imageUrl: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setFormData({ ...formData, imageUrl: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemImageUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUpdatingId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const product = products.find(p => p.id === currentUpdatingId);
        if (product) {
          onUpdate({ ...product, imageUrl: base64 });
        }
        setCurrentUpdatingId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerItemImageUpdate = (id: string) => {
    setCurrentUpdatingId(id);
    itemImageInputRef.current?.click();
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const reader = new FileReader();
      
      const fileData = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const prompt = `
        Analiza este catálogo de Inversiones Roxtor y extrae CADA PRODUCTO.
        
        REGLA DE ORO PÁGINA 2:
        - Producto: "Franela Oversize".
        - Telas: Algodón 20-1 nacional y Terry SPUM.
        - Detal: 25.
        - Mayor: 24.

        PARA TODOS EXTRAE:
        1. name: Nombre comercial.
        2. description: Detalles de confección.
        3. price: Precio detal.
        4. wholesalePrice: Precio mayor.
        5. fabricType: Telas.
        6. sizePriceAdjustment: Busca info de costos adicionales por tallas (ej: XL +2$, XXL +3$).

        Devuelve un array JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: fileData, mimeType: file.type } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                price: { type: Type.NUMBER },
                wholesalePrice: { type: Type.NUMBER },
                fabricType: { type: Type.STRING },
                sizePriceAdjustment: { type: Type.STRING },
              },
              required: ["name", "price"]
            }
          }
        }
      });

      const extracted = JSON.parse(response.text || "[]");
      onBulkAdd(extracted);
      alert(`${extracted.length} productos de Roxtor añadidos.`);
    } catch (error) {
      alert("Error al procesar el catálogo.");
    } finally {
      setIsAnalyzing(false);
      if (bulkFileRef.current) bulkFileRef.current.value = '';
    }
  };

  const exportAsImage = (product: Product) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1920; 

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawHeader = (logoImg?: HTMLImageElement) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, 240);

      if (logoImg) {
        const logoSize = 180;
        ctx.drawImage(logoImg, 60, 30, logoSize, logoSize);
      }

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.font = '900 48px Inter, sans-serif';
      ctx.fillText('INVERSIONES ROXTOR, C.A', logoImg ? 260 : 60, 90);
      
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 24px Inter';
      ctx.fillText('RIF: J-402959737', logoImg ? 260 : 60, 130);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 20px Inter';
      ctx.fillText('0286-9343503 | +58 424 9635252', canvas.width - 60, 85);
      ctx.fillText('+58 424 9639921 | @roxtor.pzo', canvas.width - 60, 125);
    };

    const drawProduct = (img?: HTMLImageElement, logoImg?: HTMLImageElement) => {
      drawHeader(logoImg);

      if (img) {
        const ratio = Math.max(canvas.width / img.width, 1000 / img.height);
        const nw = img.width * ratio;
        const nh = img.height * ratio;
        ctx.drawImage(img, (canvas.width - nw) / 2, 240, nw, nh);
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 240, canvas.width, 1000);
      }

      const grad = ctx.createLinearGradient(0, 1100, 0, 1400);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.3, 'rgba(255,255,255,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 1100, canvas.width, 300);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 75px Inter';
      ctx.fillText(product.name.toUpperCase(), 60, 1380);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 32px Inter';
      const desc = product.description || '';
      const words = desc.split(' ');
      let line = '';
      let y = 1450;
      for(let n=0; n<words.length; n++){
        let test = line + words[n] + ' ';
        if(ctx.measureText(test).width > 960){
          ctx.fillText(line, 60, y);
          line = words[n] + ' ';
          y += 45;
        } else line = test;
      }
      ctx.fillText(line, 60, y);

      y += 80;
      ctx.fillStyle = '#10b981';
      ctx.font = '900 28px Inter';
      ctx.fillText('FICHA TÉCNICA ROXTOR:', 60, y);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 34px Inter';
      ctx.fillText(`TELA: ${product.fabricType.toUpperCase()}`, 60, y + 50);
      
      if(product.sizePriceAdjustment) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'black 30px Inter';
        ctx.fillText(`COSTO POR TALLAS: ${product.sizePriceAdjustment.toUpperCase()}`, 60, y + 100);
      }

      const drawPrice = (l: string, v: string, x: number, py: number, bg: string) => {
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.roundRect(x, py, 450, 150, 35); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Inter'; ctx.fillText(l, x+45, py+55);
        ctx.font = '900 70px Inter'; ctx.fillText(v, x+45, py+125);
      };

      drawPrice('PRECIO DETAL', `$${product.price}`, 60, 1700, '#10b981');
      if(product.wholesalePrice) {
        drawPrice('PRECIO MAYOR', `$${product.wholesalePrice}`, 550, 1700, '#0f172a');
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 24px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('SOLUCIONES CREATIVAS - CALIDAD GARANTIZADA', canvas.width/2, canvas.height - 50);

      const link = document.createElement('a');
      link.download = `Roxtor_${product.name.replace(/\s+/g, '_')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    };

    const prodImg = product.imageUrl ? new Image() : null;
    const logoImg = settings.companyLogo ? new Image() : null;

    if (prodImg) prodImg.crossOrigin = "anonymous";
    if (logoImg) logoImg.crossOrigin = "anonymous";

    let loadedCount = 0;
    const totalToLoad = (prodImg ? 1 : 0) + (logoImg ? 1 : 0);

    const checkReady = () => {
      loadedCount++;
      if (loadedCount >= totalToLoad) {
        drawProduct(prodImg || undefined, logoImg || undefined);
      }
    };

    if (totalToLoad === 0) {
      drawProduct();
    } else {
      if (prodImg) { prodImg.onload = checkReady; prodImg.src = product.imageUrl!; }
      if (logoImg) { logoImg.onload = checkReady; logoImg.src = settings.companyLogo!; }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({ name: '', description: '', price: 0, wholesalePrice: 0, fabricType: '', deliveryTime: '', wholesaleDiscount: '', sizePriceAdjustment: '', imageUrl: '' });
    setImagePreview(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <input type="file" ref={itemImageInputRef} onChange={handleItemImageUpdate} className="hidden" accept="image/*" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Catálogo Roxtor</h2>
          <p className="text-gray-500 font-medium">RIF: J-402959737 | Soluciones Creativas</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="file" ref={bulkFileRef} onChange={handleBulkImport} className="hidden" accept=".pdf,image/*" />
          <button onClick={() => bulkFileRef.current?.click()} disabled={isAnalyzing} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border-2 border-slate-900 text-slate-900 px-4 py-3 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all">
            {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
            <span>{isAnalyzing ? 'Procesando...' : 'Escanear Catálogo'}</span>
          </button>
          <button onClick={() => setIsFormOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:scale-105 transition-transform">
            <Plus size={18} />
            <span>Nuevo Item</span>
          </button>
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-emerald-50 rounded-[40px] p-8 shadow-2xl space-y-6 animate-in zoom-in duration-300">
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="w-full lg:w-1/3">
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-3 text-center">Referencia Visual</label>
              <div onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all overflow-hidden group">
                {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <div className="text-center"><ImageIcon className="mx-auto text-slate-300 mb-2" size={48} /><p className="text-[10px] font-black text-slate-400 uppercase">Cargar Foto</p></div>}
                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Nombre del Producto</label>
                <input required className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Descripción de Confección</label>
                <textarea rows={2} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Precio Detal ($)</label>
                <input required type="number" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Precio Mayor ($)</label>
                <input type="number" className="w-full bg-emerald-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Telas Disponibles</label>
                <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={formData.fabricType} onChange={e => setFormData({...formData, fabricType: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Ajuste por Tallas (Ej: XL +$2, XXL +$3)</label>
                <input className="w-full bg-amber-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-amber-700 outline-none focus:ring-2 focus:ring-emerald-500" value={formData.sizePriceAdjustment} onChange={e => setFormData({...formData, sizePriceAdjustment: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 text-xs font-black text-slate-400 uppercase">Cancelar</button>
            <button type="submit" className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">Guardar Producto</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        {products.map((product) => (
          <div key={product.id} className="bg-white border rounded-[40px] overflow-hidden shadow-sm hover:shadow-2xl transition-all group flex flex-col border-slate-100">
            <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
              {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <button onClick={() => triggerItemImageUpdate(product.id)} className="w-full h-full flex flex-col items-center justify-center text-slate-300 hover:text-emerald-500 transition-colors bg-slate-50"><Camera size={56} className="mb-2" /><span className="text-[10px] font-black uppercase tracking-widest">Cargar Foto</span></button>}
              
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="flex flex-col gap-1.5">
                  <span className="bg-white/95 backdrop-blur-sm text-slate-900 text-[10px] font-black px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2 border border-emerald-50">DETAL: ${product.price}</span>
                  {product.wholesalePrice && <span className="bg-emerald-600 text-white text-[10px] font-black px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2">MAYOR: ${product.wholesalePrice}</span>}
                </div>
                <button onClick={() => exportAsImage(product)} className="bg-white p-3 rounded-2xl text-emerald-600 shadow-xl hover:scale-110 transition-transform"><Download size={20}/></button>
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onDelete(product.id)} className="bg-red-500 text-white p-2.5 rounded-full shadow-lg"><Trash2 size={16}/></button>
                <button onClick={() => triggerItemImageUpdate(product.id)} className="bg-blue-500 text-white p-2.5 rounded-full shadow-lg"><Camera size={16}/></button>
              </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col">
              <h3 className="font-black text-slate-900 text-xl leading-tight mb-2 uppercase tracking-tight">{product.name}</h3>
              {product.sizePriceAdjustment && <span className="inline-block bg-amber-50 text-amber-700 text-[9px] font-black px-3 py-1 rounded-full uppercase mb-4 border border-amber-100">Tallas: {product.sizePriceAdjustment}</span>}
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6 line-clamp-3">{product.description || 'Consulta toda la información técnica en el botón de compartir.'}</p>
              
              <div className="space-y-4 mt-auto pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl">
                  <div className="p-2 bg-white rounded-xl text-emerald-600"><Scissors size={16} /></div>
                  <div className="overflow-hidden">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Telas Roxtor</p>
                    <p className="text-[11px] font-bold text-slate-700 truncate">{product.fabricType}</p>
                  </div>
                </div>
                <button onClick={() => exportAsImage(product)} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-xl hover:bg-emerald-600 transition-all">
                  <Share2 size={16}/> Compartir Ficha Roxtor
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CatalogManager;
