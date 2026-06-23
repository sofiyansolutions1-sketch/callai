import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Phone, Users, Settings, Sparkles } from "lucide-react";
import DashboardPage from "./pages/DashboardPage";
import DialerPage from "./pages/DialerPage";
import LeadsPage from "./pages/LeadsPage";
import SettingsPage from "./pages/SettingsPage";

function Sidebar() {
  const location = useLocation();
  const links = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/dialer", icon: <Phone size={20} />, label: "Call Agent" },
    { to: "/leads", icon: <Users size={20} />, label: "Bookings" },
    { to: "/settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <div className="w-64 border-r border-white/10 bg-slate-950 min-h-screen flex flex-col items-stretch">
      <div className="h-20 flex items-center px-6 border-b border-white/10 font-bold text-xl text-indigo-400 tracking-tight flex gap-2">
        <Sparkles className="text-indigo-500" size={24} />
        Sofian AI
      </div>
      <nav className="flex-1 py-8 flex flex-col gap-2 px-4">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all font-medium ${
              location.pathname === link.to
                ? "bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="p-6 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200">System Active</span>
            <span className="text-xs text-emerald-400">• Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30">
        <Sidebar />
        <main className="flex-1 overflow-auto p-10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950/0 to-slate-950/0 pointer-events-none"></div>
          <div className="max-w-5xl mx-auto w-full relative z-10">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dialer" element={<DialerPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
