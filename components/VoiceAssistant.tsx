import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Product, Order, WorkshopGroup, PaymentMethod, AssistantTone, AppSettings } from '../types';
import { Mic, Send, Loader2, Bot, User, MessageCircle, Sparkles, Volume2, Phone, Zap, Heart } from 'lucide-react';

// Decodificador de audio robusto
function decode(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface Message {
  user?: string;
  ai?: string;
  audioData?: string;
  type: 'voice' | 'text' | 'wa_reply';
}

interface Props {
  products: Product[];
  orders: Order[];
  groups: WorkshopGroup[];
  paymentMethods: PaymentMethod[];
  settings: AppSettings;
  onOrderCreated: (order: Order) => void;
}

const VoiceAssistant: React.FC<Props> = ({ products, settings }) => {
  const [tone, setTone] = useState<AssistantTone | 'calido'>('cercano');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const getSystemInstruction = () => {
    const catalogStr = products.map(p => `- ${p.name}: $${p.price} (${p.fabricType})`).join('\n');
    let toneInstruction = '';
    
    if (tone === 'calido') {
      toneInstruction = 'Tono MUY CÁLIDO y entusiasta. Usa palabras como "¡Qué alegría saludarte!", "Es una excelente elección", "Quedarás encantado". Usa bastantes emojis de corazones.';
    } else if (tone === 'cercano') {
      toneInstruction = 'Tono CERCANO y amigable, como si hablaras con un amigo. Usa un lenguaje relajado pero respetuoso. Evita sonar como un robot de ventas.';
    } else {
      toneInstruction = 'Tono PROFESIONAL, ejecutivo y eficiente. Respuestas rápidas y claras con datos precisos.';
    }

    return `
      ERES EL ASISTENTE DE VOZ DE INVERSIONES ROXTOR.
      TU OBJETIVO: Generar respuestas para ser leídas como NOTA DE VOZ por WhatsApp.
      ${toneInstruction}
      
      IMPORTANTE: No uses frases largas. Sé directo pero con la personalidad seleccionada.
      
      INFORMACIÓN DE VENTAS ROXTOR:
      - Ventas 1: +58 424 9635252
      - Ventas 2: +58 424 9639921
      
      CATÁLOGO:
      ${catalogStr}
      
      REGLAS DE ORO:
      1. Máximo 30 palabras por respuesta.
      2. No uses listas ni guiones. Solo oraciones fluidas para hablar.
      3. Si no sabes la respuesta o es algo fuera de ventas, di: "${settings.absenceMessage}".
    `;
  };

  const generateVoiceAndReply = async (input: string) => {
    if (!input.trim() || isProcessing) return;
    initAudio();
    setIsProcessing(true);
    setMessages(prev => [...prev, { user: input, type: 'text' }]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: { systemInstruction: getSystemInstruction() }
      });
      const replyText = response.text || "Lo siento, hubo un problema al generar la respuesta.";

      const voiceName = tone === 'profesional' ? 'Zephyr' : (tone === 'calido' ? 'Kore' : 'Puck');
      const audioResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: replyText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          }
        }
      });

      const audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const newMessageIndex = messages.length + 1;
      
      setMessages(prev => [...prev, { ai: replyText, audioData: audioBase64, type: 'wa_reply' }]);
      
      if (audioBase64) {
        setTimeout(() => playAudio(audioBase64, newMessageIndex), 300);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { ai: "La conexión con el servidor de inteligencia artificial falló. Revisa tu API Key.", type: 'text' }]);
    } finally {
      setIsProcessing(false);
      setTextInput('');
    }
  };

  const playAudio = async (base64: string, index: number) => {
    initAudio();
    if (isPlaying !== null) return;
    try {
      setIsPlaying(index);
      const ctx = audioContextRef.current!;
      const buffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(null);
      source.start();
    } catch (e) {
      console.error("Playback error", e);
      setIsPlaying(null);
    }
  };

  const openWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[650px] gap-4 max-w-2xl mx-auto" onClick={initAudio}>
      <div className="bg-white p-4 rounded-[32px] border shadow-sm space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Modo del Asistente Roxtor</label>
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full gap-1">
          {[
            { id: 'calido', label: 'CÁLIDO', icon: Heart, color: 'text-red-500' },
            { id: 'cercano', label: 'CERCANO', icon: Sparkles, color: 'text-emerald-500' },
            { id: 'profesional', label: 'PRO', icon: User, color: 'text-blue-900' }
          ].map((t) => (
            <button 
              key={t.id}
              onClick={() => { initAudio(); setTone(t.id as any); }} 
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all ${tone === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              <t.icon size={14} className={tone === t.id ? t.color : ''} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-2 pb-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4 opacity-40">
            <div className="p-6 bg-blue-50 rounded-full text-blue-900 shadow-inner"><Bot size={48} /></div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">¿En qué puedo apoyarte con<br/>las ventas de Roxtor hoy?</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.user ? 'items-end' : 'items-start'}`}>
            {m.user && (
              <div className="bg-blue-900 text-white px-5 py-3 rounded-[24px] rounded-tr-none text-sm font-medium max-w-[85%] shadow-md">
                {m.user}
              </div>
            )}
            {m.ai && (
              <div className="bg-white border border-slate-100 p-5 rounded-[28px] rounded-tl-none shadow-sm max-w-[85%] space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"{m.ai}"</p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                  {m.audioData && (
                    <button 
                      onClick={() => playAudio(m.audioData!, i)}
                      disabled={isPlaying !== null}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isPlaying === i ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {isPlaying === i ? <Loader2 className="animate-spin" size={14}/> : <Volume2 size={14}/>}
                      <span>{isPlaying === i ? 'Hablando' : 'Oír Nota'}</span>
                    </button>
                  )}
                  <button onClick={() => openWhatsApp(m.ai!)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">
                    <MessageCircle size={14}/> Responder en WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {isProcessing && <div className="flex justify-start px-4"><Loader2 className="animate-spin text-blue-900 opacity-20" size={24}/></div>}
      </div>

      <div className="bg-white p-2 rounded-[32px] border shadow-xl flex items-center gap-2 border-slate-200 mb-4">
        <input 
          type="text" 
          placeholder="Pregunta sobre precios, telas o pedidos..." 
          className="flex-1 bg-transparent border-none px-4 py-3 text-sm font-medium outline-none focus:ring-0"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generateVoiceAndReply(textInput)}
          onFocus={initAudio}
        />
        <button 
          onClick={() => generateVoiceAndReply(textInput)}
          disabled={!textInput.trim() || isProcessing}
          className="w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:bg-slate-200"
        >
          {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
        </button>
      </div>
      
      <div className="flex justify-center gap-6 py-2 border-t border-slate-100">
        <span className="text-[9px] font-black text-slate-300 uppercase flex items-center gap-1"><Zap size={10} className="text-yellow-400"/> Roxtor Cloud Sync</span>
        <span className="text-[9px] font-black text-slate-300 uppercase flex items-center gap-1"><Heart size={10} className="text-red-400"/> Calidad Premium</span>
      </div>
    </div>
  );
};

export default VoiceAssistant;