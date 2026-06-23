import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, PhoneOff, PhoneCall, Loader2, Volume2, Bot, ListOrdered, Play, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { buildWebhookUrl, triggerWebhook } from "../lib/webhook";

function pcmToBase64(f32Array: Float32Array): string {
    const pcm16 = new Int16Array(f32Array.length);
    for (let i = 0; i < f32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, f32Array[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const buffer = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
}

interface LogEntry { id: string; role: string; text: string; }

export default function DialerPage() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [muted, _setMuted] = useState(false);
  const mutedRef = useRef(false);
  const setMuted = (val: boolean) => { mutedRef.current = val; _setMuted(val); };
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [error, setError] = useState("");

  const queueRef = useRef<string[]>([]);
  const currentQueueIndexRef = useRef(-1);
  const bulkSessionActiveRef = useRef(false);

  // Bulk Calling States
  const [bulkMode, setBulkMode] = useState(false);
  const [singleInput, setSingleInput] = useState("8115983887");
  const [bulkInput, setBulkInput] = useState("");
  const [queue, _setQueue] = useState<string[]>([]);
  const [currentQueueIndex, _setCurrentQueueIndex] = useState(-1);
  const [bulkSessionActive, _setBulkSessionActive] = useState(false);

  const setQueue = (val: string[]) => { queueRef.current = val; _setQueue(val); };
  const setCurrentQueueIndex = (val: number) => { currentQueueIndexRef.current = val; _setCurrentQueueIndex(val); };
  const setBulkSessionActive = (val: boolean) => { bulkSessionActiveRef.current = val; _setBulkSessionActive(val); };


  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const currentContactRef = useRef<string | null>(null);
  const nextStartTimeRef = useRef(0);
  const userVolRef = useRef(0);
  const checkSilenceIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopCall();
      setBulkSessionActive(false);
    };
  }, []);

  const addLog = (role: string, text: string) => {
    setLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), role, text }]);
  };

  const fireWebhook = async (type: "init" | "term", contact: string) => {
     if (localStorage.getItem("ENABLE_WEBHOOKS") !== "true") return;
     const rawUrl = type === "init" ? localStorage.getItem("INIT_WEBHOOK_URL") : localStorage.getItem("TERM_WEBHOOK_URL");
     if (!rawUrl) return;
     
     try {
       const url = buildWebhookUrl(rawUrl, contact);
       addLog("SYSTEM", `Firing ${type} webhook: ${url}`);
       await triggerWebhook(url);
       addLog("SYSTEM", `Webhook ${type} fired successfully.`);
     } catch (err: any) {
       addLog("SYSTEM", `Webhook ${type} failed to execute (${err.message}).`);
     }
  };

  const stopCall = async (triggerNext = false) => {
    if (!wsRef.current && !streamRef.current && !outputAudioCtxRef.current) {
        return; // Already stopped
    }
    
    if (wsRef.current) {
       wsRef.current.close();
       wsRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
        inputAudioCtxRef.current.close();
        inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
        outputAudioCtxRef.current.close();
        outputAudioCtxRef.current = null;
    }
    activeSourcesRef.current.forEach(s => {
       try { s.stop(); } catch(e){}
    });
    activeSourcesRef.current = [];
    clearInterval(checkSilenceIntervalRef.current);
    setStatus("idle");
    setMuted(false);
    setAiSpeaking(false);
    setUserSpeaking(false);

    if (currentContactRef.current) {
       await fireWebhook("term", currentContactRef.current);
       currentContactRef.current = null;
    }

    if (bulkSessionActiveRef.current && currentQueueIndexRef.current >= 0 && currentQueueIndexRef.current < queueRef.current.length) {
      if (triggerNext && currentQueueIndexRef.current + 1 < queueRef.current.length) {
        const nextIdx = currentQueueIndexRef.current + 1;
        setCurrentQueueIndex(nextIdx);
        addLog("SYSTEM", `Preparing to dial next contact: ${queueRef.current[nextIdx]} in 3 seconds...`);
        setTimeout(() => {
           startCallInternal(queueRef.current[nextIdx]);
        }, 3000);
      } else if (triggerNext) {
        addLog("SYSTEM", `Bulk calling queue finished.`);
        setBulkSessionActive(false);
      }
    } else {
       setBulkSessionActive(false);
    }
  };

  const startCallInternal = async (contactInfo?: string) => {
    const voiceName = localStorage.getItem("GEMINI_VOICE_NAME") || "Aoede";

    try {
      setStatus("connecting");
      setLogs([]);
      setError("");
      
      if (contactInfo) {
         currentContactRef.current = contactInfo;
         addLog("SYSTEM", `Starting automated call trigger to: ${contactInfo}`);
         await fireWebhook("init", contactInfo);
      }

      const supabaseUrl = localStorage.getItem("SUPABASE_URL") || "https://vqbnzcknflwuhbiznuim.supabase.co";
      const supabaseKey = localStorage.getItem("SUPABASE_ANON_KEY") || "sb_publishable_YKSbWVBxAltMjpIxGhNAIg_Ga8B9xST";
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live?voice=${voiceName}&supabaseUrl=${encodeURIComponent(supabaseUrl)}&supabaseKey=${encodeURIComponent(supabaseKey)}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      ws.onopen = async () => {
         setStatus("connected");
         addLog("SYSTEM", "AI Connection established. Waiting for user to speak...");
         
         const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
         streamRef.current = stream;
         
         const source = inputCtx.createMediaStreamSource(stream);
         const processor = inputCtx.createScriptProcessor(4096, 1, 1);
         source.connect(processor);
         processor.connect(inputCtx.destination);
         processorRef.current = processor;

         processor.onaudioprocess = (e) => {
            if (mutedRef.current) return;
            const inputData = e.inputBuffer.getChannelData(0);
            
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
            const avg = sum / inputData.length;
            userVolRef.current = avg;
            if (avg > 0.02) setUserSpeaking(true);

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const base64 = pcmToBase64(inputData);
                wsRef.current.send(JSON.stringify({ audio: base64 }));
            }
         };

         checkSilenceIntervalRef.current = setInterval(() => {
            if (userVolRef.current < 0.02) setUserSpeaking(false);
         }, 500);
      };

      ws.onmessage = (event) => {
        let msg: any = {};
        try {
           msg = JSON.parse(event.data);
        } catch(e) {
           console.error("Invalid WS JSON", e);
           return;
        }
        if (msg.audio) {
            setAiSpeaking(true);
            playAudioChunk(outputCtx, msg.audio);
            setTimeout(() => {
                if (outputCtx.currentTime >= nextStartTimeRef.current - 0.1) {
                    setAiSpeaking(false);
                }
            }, 100);
        }
        if (msg.type === "interrupted" || msg.interrupted) {
            activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
            activeSourcesRef.current = [];
            nextStartTimeRef.current = outputCtx.currentTime;
            setAiSpeaking(false);
        }
        if (msg.type === "transcription") {
           addLog(msg.role, msg.text);
           if (msg.role === "AI" || msg.role === "ai" || msg.role === "model") {
              const txt = msg.text.toLowerCase();
              // Voice detector logic: recognize phrases where the AI states it is disconnecting
              if (txt.includes("डिस्कनेक्ट") || txt.includes("disconnect") || txt.includes("hang up") || txt.includes("शुभ हो")) {
                 addLog("SYSTEM", "[Voice Detector] Disconnect phrase recognized. Call will end after audio finishes playing.");
                 const timeRemaining = Math.max(0, nextStartTimeRef.current - outputCtx.currentTime);
                 const delayMs = (timeRemaining * 1000) + 1500; // wait for audio + small buffer
                 setTimeout(() => stopCall(true), delayMs);
              }
           }
        }
        if (msg.type === "booking_saved") {
           addLog("SYSTEM", "Booking received from AI.");
           if (msg.dbStatus !== "SUCCESS") {
              addLog("SYSTEM", "⚠️ Supabase DB Error: " + msg.dbStatus + ". Please ensure you have executed the database.sql script in your Supabase SQL Editor. Booking was saved locally as fallback.");
           } else {
              addLog("SYSTEM", "✅ Booking successfully saved to Supabase.");
           }
           let existing = [];
           try {
              const parsed = JSON.parse(localStorage.getItem("LOCAL_BOOKINGS") || "[]");
              if (Array.isArray(parsed)) existing = parsed;
           } catch { }
           const bookingSource = msg.booking || {};
           const newBooking = {
             id: Math.random().toString(36).substring(2, 9),
             customer_name: bookingSource.name || 'Unknown',
             contact_number: bookingSource.contactNumber || 'Unknown',
             service_details: bookingSource.serviceRequested || 'Unknown',
             address: bookingSource.address || 'Unknown',
             area_pin_code: bookingSource.areaPinCode || 'Unknown',
             service_date: bookingSource.serviceDate || 'Unknown',
             service_timing: bookingSource.serviceTiming || 'Unknown',
             created_at: new Date().toISOString()
           };
           localStorage.setItem("LOCAL_BOOKINGS", JSON.stringify([newBooking, ...existing]));
        }
        if (msg.type === "end_call") {
           addLog("SYSTEM", "The agent has ended the call securely.");
           const timeRemaining = Math.max(0, nextStartTimeRef.current - outputCtx.currentTime);
           const delayMs = (timeRemaining * 1000) + 1500;
           setTimeout(() => stopCall(true), delayMs);
        }
      };

      ws.onerror = () => {
         setError("WebSocket connection error. Please try again.");
         stopCall(false);
      };
      
      ws.onclose = () => {
         // Because ws is disconnected, we safely stop call
         if (wsRef.current === ws) {
           stopCall(true); // if it closes externally, move to next
         }
      };

    } catch (err: any) {
        setError(err.message || "Failed to access Microphone or initialize call.");
        stopCall(false);
    }
  };

  const startSingleCall = () => {
     setBulkSessionActive(false);
     startCallInternal(singleInput);
  };

  const playAudioChunk = (ctx: AudioContext, base64Audio: string) => {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pcm16 = new Int16Array(bytes.buffer);
    const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    if (nextStartTimeRef.current < ctx.currentTime) {
       nextStartTimeRef.current = ctx.currentTime;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    
    activeSourcesRef.current.push(source);
    source.onended = () => {
       activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
       if (activeSourcesRef.current.length === 0) setAiSpeaking(false);
    };
  };

  const loadBulkContacts = () => {
     const parsed = bulkInput.split('\n').map(l => l.trim()).filter(l => l);
     setQueue(parsed);
     setCurrentQueueIndex(-1);
     setBulkInput("");
  };

  const startBulkCampaign = () => {
     if (queue.length === 0) return;
     setBulkSessionActive(true);
     setCurrentQueueIndex(0);
     startCallInternal(queue[0]);
  };

  const skipCurrentCall = () => {
     stopCall(true); // Forces end and triggers next
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">AI Dialer & Campaign Agent</h1>
        <div className="flex gap-2 bg-slate-900 border border-white/10 p-1.5 rounded-xl">
           <button 
             onClick={() => setBulkMode(false)}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!bulkMode ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
           >
             Interactive Mode
           </button>
           <button 
             onClick={() => setBulkMode(true)}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bulkMode ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
           >
             Automation Mode
           </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20 backdrop-blur-md font-medium text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Call Control Panel */}
        <div className="lg:col-span-1 border border-white/5 shadow-2xl flex flex-col items-center min-h-[500px] overflow-hidden rounded-2xl relative">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl z-0"></div>
          
          <div className="relative z-10 w-full p-8 flex flex-col items-center flex-1">
            <div className="relative mb-10 mt-6">
              <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-700 ${
                status === "connected" ? "bg-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.2)] border border-indigo-500/30" : "bg-slate-800 border border-white/5"
              }`}>
                <Bot size={56} className={status === "connected" ? "text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "text-slate-500"} />
              </div>
              
              {status === "connected" && aiSpeaking && (
                 <motion.div 
                   className="absolute inset-0 rounded-full border border-indigo-400"
                   animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                   transition={{ repeat: Infinity, duration: 1.5 }}
                 />
              )}
              {status === "connected" && userSpeaking && !muted && (
                 <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
              )}
            </div>

            <h2 className="text-xl font-semibold text-slate-100 mb-2">
               {bulkSessionActive ? `Calling: ${queue[currentQueueIndex]}` : "Sofian AI Agent"}
            </h2>
            <p className="text-slate-400 text-sm mb-12 text-center h-5 font-medium tracking-wide uppercase">
               {status === "idle" && (bulkSessionActive ? "Waiting for next dial..." : "Ready to engage")}
               {status === "connecting" && "Establishing connection..."}
               {status === "connected" && "Session actively streaming"}
            </p>

            <div className="flex flex-col items-center gap-4 w-full justify-center mt-auto">
              {status === "idle" && !bulkMode && !bulkSessionActive && (
                  <input
                    type="text"
                    placeholder="Enter phone number... (e.g. 8115983887)"
                    className="w-full max-w-[250px] bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-3 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-center font-mono"
                    value={singleInput}
                    onChange={(e) => setSingleInput(e.target.value)}
                  />
              )}
              <div className="flex items-center gap-4 w-full justify-center">
               {status === "idle" ? (
                 bulkSessionActive ? null : (
                 <button
                   onClick={startSingleCall}
                   className="flex-1 max-w-[220px] flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-6 rounded-2xl font-semibold shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all"
                 >
                   <PhoneCall size={22} /> Initiate Call
                 </button>
                 )
              ) : status === "connecting" ? (
                 <button
                   disabled
                   className="flex-1 max-w-[220px] flex items-center justify-center gap-3 bg-slate-800 text-slate-400 py-4 px-6 rounded-2xl font-semibold border border-white/5 cursor-not-allowed"
                 >
                   <Loader2 size={22} className="animate-spin" /> Connecting...
                 </button>
              ) : (
                 <>
                   <button
                     onClick={() => setMuted(!muted)}
                     className={`w-16 h-16 rounded-2xl shadow-xl transition-colors flex items-center justify-center ${muted ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700"}`}
                     title={muted ? "Unmute Microphone" : "Mute Microphone"}
                   >
                     {muted ? <MicOff size={26} /> : <Mic size={26} />}
                   </button>
                   <button
                     onClick={() => stopCall(false)}
                     className="flex-1 max-w-[150px] flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white py-4 px-6 rounded-2xl font-semibold shadow-[0_4px_14px_rgba(225,29,72,0.3)] transition-all"
                   >
                     <PhoneOff size={22} /> End Call
                   </button>
                   {bulkSessionActive && (
                      <button
                        onClick={skipCurrentCall}
                        className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 border border-white/5 hover:text-indigo-400 hover:border-indigo-500/30 transition-all flex items-center justify-center"
                        title="Skip to next lead"
                      >
                         <SkipForward size={24} />
                      </button>
                   )}
                 </>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Interaction Logs or Queue */}
        <div className="lg:col-span-2 bg-[#0B1121] rounded-2xl border border-white/5 shadow-2xl flex flex-col h-[500px] overflow-hidden relative">
           
           {!bulkMode || status !== "idle" ? (
             <>
               <div className="bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center gap-3 border-b border-white/5 z-10 w-full relative">
                 <Volume2 size={18} className="text-indigo-400" />
                 <h3 className="font-semibold text-slate-200">Live Transcript & Logs</h3>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-5 font-mono text-sm relative">
                 <AnimatePresence initial={false}>
                   {logs.length === 0 && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full items-center justify-center text-slate-600 italic">
                        Logs waiting for interaction sequence...
                     </motion.div>
                   )}
                   {logs.map((log) => (
                     <motion.div 
                       key={log.id} 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className={`flex flex-col ${log.role === "SYSTEM" ? "items-center" : log.role === "AI" ? "items-start" : "items-end"}`}
                     >
                       <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md mb-1.5 ${
                         log.role === "SYSTEM" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                         log.role === "AI" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : 
                         "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                       }`}>
                         {log.role}
                       </span>
                       <div className={`p-4 rounded-xl shadow-lg leading-relaxed max-w-[85%] ${
                         log.role === "SYSTEM" ? "bg-slate-900/50 text-slate-400 border border-white/5 text-center text-xs" :
                         log.role === "AI" ? "bg-slate-800/80 text-slate-200 border border-white/5" : 
                         "bg-emerald-950/40 text-emerald-100 border border-emerald-900/50"
                       }`}>
                         {log.text}
                       </div>
                     </motion.div>
                   ))}
                   {status === "connected" && aiSpeaking && (
                     <motion.div
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       className="flex items-start"
                     >
                       <div className="bg-slate-800/80 border border-white/5 px-5 py-4 rounded-xl flex gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             </>
           ) : (
             <>
               <div className="bg-slate-900/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/5">
                 <div className="flex gap-3 items-center">
                   <ListOrdered size={18} className="text-emerald-400" />
                   <h3 className="font-semibold text-slate-200">Automation Campaign</h3>
                 </div>
                 {queue.length > 0 && (
                   <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      {queue.length} items loaded
                   </span>
                 )}
               </div>
               <div className="flex-1 p-6 overflow-y-auto">
                  {queue.length === 0 ? (
                    <div className="flex flex-col h-full space-y-4">
                       <label className="text-sm font-medium text-slate-400">Paste contacts list (Name, number or just number per line)</label>
                       <textarea 
                         value={bulkInput}
                         onChange={(e) => setBulkInput(e.target.value)}
                         className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-slate-300 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                         placeholder="John Doe, 9876543210&#10;Jane Smith, 1122334455&#10;9988776655"
                       />
                       <button
                         onClick={loadBulkContacts}
                         className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors shadow-inner border border-white/5"
                       >
                         Load Contacts
                       </button>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                       <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                          {queue.map((q, i) => (
                             <div key={i} className={`p-3 rounded-lg border text-sm font-mono flex items-center justify-between ${
                                i === currentQueueIndex 
                                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200" 
                                  : i < currentQueueIndex 
                                     ? "bg-slate-900/30 border-white/5 text-slate-600 line-through"
                                     : "bg-slate-800/50 border-white/5 text-slate-300"
                             }`}>
                               <span>{q}</span>
                               {i === currentQueueIndex && <Loader2 size={14} className="animate-spin text-indigo-400" />}
                             </div>
                          ))}
                       </div>
                       <button
                         onClick={startBulkCampaign}
                         className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                       >
                         <Play size={18} fill="currentColor" />
                         Start Autonomous Campaign
                       </button>
                       <button
                         onClick={() => setQueue([])}
                         className="w-full bg-transparent text-slate-500 py-3 mt-2 rounded-xl hover:bg-slate-800 hover:text-slate-300 font-medium transition-colors"
                       >
                         Clear Queue
                       </button>
                    </div>
                  )}
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
}
