import { useEffect, useState } from "react";
import { Calendar, User, Phone, MapPin, Search } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const supabaseUrl = localStorage.getItem("SUPABASE_URL") || "https://vqbnzcknflwuhbiznuim.supabase.co";
        const supabaseKey = localStorage.getItem("SUPABASE_ANON_KEY") || "sb_publishable_YKSbWVBxAltMjpIxGhNAIg_Ga8B9xST";
        
        let fetchedLeads: any[] = [];
        
        if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("http")) {
          const cleanUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
          const supabase = createClient(cleanUrl, supabaseKey);
          const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (!error && data) {
             fetchedLeads = data;
          } else {
             console.error("Supabase fetch error:", error);
             setDbError(error?.message || "Unknown database error");
          }
        }
        
        // Also fetch any local leads that might have been saved before DB was connected
        let localData = [];
        try {
          localData = JSON.parse(localStorage.getItem("LOCAL_BOOKINGS") || "[]");
        } catch(e) {
          console.error("Failed to parse local stored bookings", e);
        }
        const safeLocalData = Array.isArray(localData) ? localData.filter(Boolean) : [];
        const normalizedLocalData = safeLocalData.map((item: any, i: number) => ({
          id: item?.id || `local-${i}`,
          customer_name: item?.name || item?.customer_name || 'Unknown',
          contact_number: item?.contactNumber || item?.contact_number || '',
          service_details: item?.serviceRequested || item?.service_details || '',
          address: item?.address || '',
          area_pin_code: item?.areaPinCode || item?.area_pin_code || '',
          service_date: item?.serviceDate || item?.service_date || '',
          service_timing: item?.serviceTiming || item?.service_timing || '',
          created_at: item?.created_at || new Date().toISOString()
        }));
        
        // Only use local if we don't have supabase data, or merge them
        if (fetchedLeads.length > 0) {
          setLeads(fetchedLeads);
        } else {
          setLeads(normalizedLocalData);
        }
      } catch(e) {
        setLeads([]);
      }
      setLoading(false);
    };
    
    fetchLeads();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Booking Dashboard</h1>
          <p className="text-slate-400 mt-2">View securely booked services generated locally by the AI agent.</p>
        </div>
        <div className="flex items-center bg-slate-900/50 backdrop-blur-md px-4 py-2.5 border border-white/5 rounded-xl shadow-inner">
           <Search size={18} className="text-slate-500 mr-2" />
           <input type="text" placeholder="Search bookings..." className="bg-transparent border-none focus:outline-none text-sm w-48 text-slate-200 placeholder-slate-500" />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      )}

      {dbError && (
        <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-4 text-red-200 text-sm animate-in fade-in">
           <p className="font-semibold mb-1">Database Connection Error</p>
           <p>{dbError}</p>
           <p className="mt-2 text-xs text-red-300">If the "leads" table does not exist, make sure to execute the SQL script from the Settings page in your Supabase SQL Editor.</p>
        </div>
      )}

      {!loading && leads.length === 0 && (
         <div className="text-center bg-slate-900/30 backdrop-blur-sm border border-white/5 rounded-3xl py-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <User size={32} className="text-slate-600" />
            </div>
            <h3 className="text-xl font-medium text-slate-200 mb-2">No Bookings Found</h3>
            <p className="text-slate-500 text-sm">Your AI agent hasn't logged any successful bookings yet.</p>
         </div>
      )}

      {!loading && leads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl p-6 flex flex-col hover:border-indigo-500/30 transition-colors group">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                    <User size={18} className="text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-slate-100">{lead.customer_name}</h3>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                  {new Date(lead.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="space-y-3.5 flex-1 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Phone size={15} className="text-slate-500" />
                  <a href={`tel:${lead.contact_number}`} className="hover:text-indigo-400 transition-colors font-mono">{lead.contact_number}</a>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-slate-500 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{lead.address}, {lead.area_pin_code}</span>
                </div>
                
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mt-5 space-y-2.5">
                   <p className="font-medium text-slate-500 text-xs tracking-wider uppercase">Service Request</p>
                   <p className="text-indigo-300 font-semibold">{lead.service_details}</p>
                   <div className="flex items-center gap-2 text-slate-400 text-xs pt-1 border-t border-slate-800/50 mt-2 block">
                      <Calendar size={13} className="text-slate-500" />
                      {lead.service_date} @ {lead.service_timing}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
