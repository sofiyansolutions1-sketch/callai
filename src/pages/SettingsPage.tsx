import { useState, useEffect } from "react";
import { Save, Webhook } from "lucide-react";

export default function SettingsPage() {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [voiceName, setVoiceName] = useState("Aoede");
  const [saveStatus, setSaveStatus] = useState("");
  
  const [enableWebhooks, setEnableWebhooks] = useState(false);
  const [initWebhook, setInitWebhook] = useState("");
  const [termWebhook, setTermWebhook] = useState("");

  useEffect(() => {
    setSupabaseUrl(localStorage.getItem("SUPABASE_URL") || "https://vqbnzcknflwuhbiznuim.supabase.co");
    setSupabaseKey(localStorage.getItem("SUPABASE_ANON_KEY") || "sb_publishable_YKSbWVBxAltMjpIxGhNAIg_Ga8B9xST");
    setVoiceName(localStorage.getItem("GEMINI_VOICE_NAME") || "Aoede");
    setEnableWebhooks(localStorage.getItem("ENABLE_WEBHOOKS") !== "false");
    setInitWebhook(localStorage.getItem("INIT_WEBHOOK_URL") || "");
    setTermWebhook(localStorage.getItem("TERM_WEBHOOK_URL") || "");
  }, []);

  const handleSave = () => {
    localStorage.setItem("SUPABASE_URL", supabaseUrl);
    localStorage.setItem("SUPABASE_ANON_KEY", supabaseKey);
    localStorage.setItem("GEMINI_VOICE_NAME", voiceName);
    localStorage.setItem("ENABLE_WEBHOOKS", enableWebhooks.toString());
    localStorage.setItem("INIT_WEBHOOK_URL", initWebhook);
    localStorage.setItem("TERM_WEBHOOK_URL", termWebhook);
    
    setSaveStatus("Settings saved successfully!");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  return (
    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Application Settings</h1>
        <p className="text-slate-400 mt-2">Configure core integrations, AI behavior, and calling webhooks.</p>
      </header>

      <div className="space-y-8">
        {/* Webhooks config */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-3">
                <Webhook className="text-sky-400" size={24} /> Call Orchestration Webhooks
              </h2>
              <p className="text-sm text-slate-400 mt-1">Configure external webhooks to initiate or terminate PSTN calls during bulk campaigns.</p>
            </div>
            <label className="flex items-center cursor-pointer mt-4 md:mt-0">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={enableWebhooks}
                  onChange={(e) => setEnableWebhooks(e.target.checked)}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${enableWebhooks ? 'bg-sky-500' : 'bg-slate-800'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enableWebhooks ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-3 text-sm font-medium text-slate-300">
                {enableWebhooks ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>

          {enableWebhooks && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Call Initiation Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://api.twilio.com/...../call"
                  value={initWebhook}
                  onChange={(e) => setInitWebhook(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100 placeholder-slate-600 transition-all font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">Triggered immediately before the AI connects. Sends {`{ contact: "string" }`} payload.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Call Termination Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://api.yourbackend.com/webhook/terminate"
                  value={termWebhook}
                  onChange={(e) => setTermWebhook(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-100 placeholder-slate-600 transition-all font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">Triggered after the AI concludes the call (via endCallTool).</p>
              </div>
            </div>
          )}
        </div>

        {/* Gemini settings */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl p-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Gemini Live API Voice</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Agent Voice Profile</label>
              <div className="relative">
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 transition-all"
                >
                  <option value="Aoede">Aoede (Warm, Professional)</option>
                  <option value="Puck">Puck</option>
                  <option value="Charon">Charon</option>
                  <option value="Kore">Kore</option>
                  <option value="Fenrir">Fenrir</option>
                  <option value="Zephyr">Zephyr</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supabase Database Integration */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl p-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-2">Supabase Database Integration</h2>
          <p className="text-sm text-slate-400 mb-6">
            Connect your agent to Supabase to securely save your bookings online instead of browser limits.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Supabase Project URL</label>
              <input
                type="url"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-600 transition-all font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Supabase Anon/Public Key</label>
              <input
                type="text"
                placeholder="eyJh..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-600 transition-all font-mono text-sm"
              />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 mb-2">Database Setup Instructions</h3>
              <p className="text-sm text-slate-400 mb-4">You MUST run this SQL snippet in your Supabase SQL Editor for the integration to work correctly:</p>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
                <code className="text-xs text-indigo-300 font-mono">
{`CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  service_details TEXT NOT NULL,
  address TEXT NOT NULL,
  area_pin_code TEXT,
  service_date TEXT,
  service_timing TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: We are bypassing RLS for anon client insert in this rapid prototype.
-- In production, you would configure secure RLS policies.
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;`}
                </code>
              </pre>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Save size={18} />
            Save All Configurations
          </button>
          {saveStatus && <span className="text-sm text-emerald-400 font-medium animate-in fade-in">{saveStatus}</span>}
        </div>

      </div>
    </div>
  );
}
