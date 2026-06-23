import { PhoneCall, Users, BarChart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-slate-100">AI Command Center</h1>
        <p className="text-slate-400 mt-2 text-lg">Monitor and control your autonomous tele-calling operations.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/5 shadow-2xl flex flex-col gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <PhoneCall size={24} className="text-indigo-400" />
            </div>
            <h2 className="font-semibold text-slate-100 text-lg">Agent Dialer</h2>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">Initiate interactive or bulk AI tele-calling sessions with your customers.</p>
          <Link to="/dialer" className="mt-auto pt-4 text-indigo-400 font-medium flex items-center gap-2 group-hover:text-indigo-300 transition-colors">
            Start Dialing <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/5 shadow-2xl flex flex-col gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Users size={24} className="text-emerald-400" />
            </div>
            <h2 className="font-semibold text-slate-100 text-lg">Booking Dashboard</h2>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">View and manage scheduled service bookings processed by the AI agent.</p>
          <Link to="/leads" className="mt-auto pt-4 text-emerald-400 font-medium flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
            View Bookings <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/5 shadow-2xl flex flex-col gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <BarChart size={24} className="text-amber-400" />
            </div>
            <h2 className="font-semibold text-slate-100 text-lg">System Setup</h2>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">Configure Webhooks and Supabase integration to safely persist conversational data.</p>
          <Link to="/settings" className="mt-auto pt-4 text-amber-400 font-medium flex items-center gap-2 group-hover:text-amber-300 transition-colors">
            Go to Settings <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
      
      <div className="mt-12 bg-slate-900/30 backdrop-blur-md p-10 rounded-3xl border border-white/5 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-slate-100">Welcome to Sofian Home Service AI</h2>
        <div className="space-y-4 text-slate-300 text-lg font-light">
          <p className="leading-relaxed">
            This comprehensive portal powers your Gemini 3.1 Live API tele-caller agent. Using highly optimized WebSockets and a dedicated backend proxy, the AI interacts with your customers natively in Hindi/Hinglish via low latency audio streaming.
          </p>
          <p className="leading-relaxed">
            Take advantage of the new <strong className="font-medium text-slate-100">Bulk Calling Mode</strong> to automatically dial through lead lists and trigger Webhook events for third-party PSTN integration. Your system is configured to securely store bookings locally in the Booking Dashboard so you can review and integrate them with your preferred databases later.
          </p>
        </div>
      </div>
    </div>
  );
}
