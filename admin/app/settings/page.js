"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Save, 
  Lock,
  Key,
  CheckCircle,
  QrCode,
  Loader2,
  AlertCircle,
  Info,
  ChevronRight
} from "lucide-react";
import api from "../../lib/api";
import Image from "next/image";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("mfa");
  const [admin, setAdmin] = useState(null);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2FA Setup states
  const [mfaStep, setMfaStep] = useState("initial"); 
  const [qrCode, setQrCode] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminRes, settingsRes] = await Promise.all([
        api.get("/admin/me"),
        api.get("/admin/settings")
      ]);
      setAdmin(adminRes.data);
      setSettings(settingsRes.data);
      if (adminRes.data.twoFactorEnabled) {
         setMfaStep("active");
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
      toast.error("Connectivity issue: Failed to sync system parameters.");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await api.put(`/admin/settings/${key}`, { value });
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
      toast.success(`${key.replace(/([A-Z])/g, ' $1')} updated successfully.`);
    } catch (err) {
      toast.error("Update failed. Please check network integrity.");
    }
  };

  const handleStartMfaSetup = async () => {
    setMfaLoading(true);
    setMfaError("");
    try {
      const res = await api.post("/auth/2fa/setup");
      setQrCode(res.data.qrCodeUrl);
      setMfaStep("setup");
      toast.success("Security protocol initiated. Please scan the identifier.");
    } catch (err) {
      setMfaError("Failed to initialize security protocol.");
      toast.error("Initialization error.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyAndEnableMfa = async () => {
    if (mfaCode.length !== 6) return setMfaError("Code must be 6 digits.");
    setMfaLoading(true);
    setMfaError("");
    try {
      await api.post("/auth/2fa/verify", { code: mfaCode });
      setMfaStep("active");
      toast.success("MFA Layer successfully established.", { icon: '🛡️' });
      fetchData();
    } catch (err) {
      setMfaError("Verification failed. Please check the code and try again.");
      toast.error("Verification mismatch.");
    } finally {
      setMfaLoading(false);
    }
  };

  const getSettingValue = (key) => settings.find(s => s.key === key)?.value;

  if (loading && settings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#EAEFEF]">
         <Loader2 className="animate-spin text-[#FF9B51]" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#EAEFEF] min-h-full text-[#25343F]">
      {/* Header Section */}
      <header className="mb-10 lg:flex lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#FF9B51] uppercase tracking-[0.2em] mb-3">
             <Settings size={14} />
             System Configuration
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Administrative Control</h1>
          <p className="text-sm md:text-base text-slate-500 mt-2 leading-relaxed">
            Manage administrative access layers and system communication protocols. Technical network parameters are managed by the automated core.
          </p>
        </div>
      </header>

      {/* Main Settings Container */}
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-8 pb-12">
        
        {/* Navigation Sidebar */}
        <aside className="w-full xl:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-[#BFC9D1] p-3 shadow-sm sticky top-8">
            <nav className="space-y-1">
               {[
                 { id: "mfa", name: "Access Security", icon: Shield, desc: "2FA & Authentication" },
                 { id: "alerts", name: "Alert Management", icon: Bell, desc: "Notifications & Logs" },
                 { id: "system", name: "Infrastructure Info", icon: Database, desc: "System Parameters" }
               ].map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                     activeTab === tab.id 
                       ? "bg-[#25343F] text-white shadow-xl shadow-[#25343F]/20" 
                       : "text-slate-400 hover:bg-[#EAEFEF]/50 hover:text-[#25343F]"
                   }`}
                 >
                   <div className="flex items-center text-left">
                      <tab.icon size={20} className={activeTab === tab.id ? "text-[#FF9B51]" : "text-slate-300"} />
                      <div className="ml-4">
                         <p className="text-xs font-bold uppercase tracking-wide">{tab.name}</p>
                         <p className={`text-[10px] mt-0.5 ${activeTab === tab.id ? "text-white/40" : "text-slate-300"}`}>{tab.desc}</p>
                      </div>
                   </div>
                   {activeTab === tab.id && <ChevronRight size={14} className="text-[#FF9B51]" />}
                 </button>
               ))}
            </nav>
          </div>
        </aside>

        {/* Dynamic content Section */}
        <div className="flex-1 min-w-0">
           <div className="bg-white rounded-3xl border border-[#BFC9D1] shadow-2xl shadow-blue-900/5 overflow-hidden flex flex-col h-full min-h-[600px]">
              
              <div className="flex-1 p-6 md:p-10">
                 {/* Security Tab */}
                 {activeTab === "mfa" && (
                   <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                         <h3 className="text-xl font-bold tracking-tight text-[#25343F]">Security Identification Layer</h3>
                         <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                            We use TOTP to protect administrative accounts. Even if credentials are compromised, access is impossible without your security key.
                         </p>
                      </div>

                      <div className={`rounded-3xl p-8 md:p-12 border-2 transition-all ${mfaStep === 'active' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                         {mfaStep === "active" ? (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                               <div className="flex items-center gap-6">
                                  <div className="p-5 bg-white rounded-2xl text-emerald-500 shadow-sm border border-emerald-50">
                                     <Shield size={32} />
                                  </div>
                                  <div>
                                     <h4 className="text-lg font-bold text-[#25343F]">Security Shield Operational</h4>
                                     <p className="text-sm text-slate-500 mt-1">Multi-factor authentication is active on this account.</p>
                                  </div>
                               </div>
                            </div>
                         ) : mfaStep === "setup" ? (
                            <div className="space-y-10 animate-in zoom-in-95 duration-200">
                               <div className="flex flex-col md:flex-row gap-12 items-center">
                                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-inner shrink-0 scale-110">
                                     {qrCode && <Image src={qrCode} alt="Setup Identity" width={220} height={220} className="rounded-lg" />}
                                  </div>
                                  <div className="space-y-6">
                                     <h4 className="text-lg font-bold text-[#25343F]">1. Link Security Key</h4>
                                     <p className="text-sm text-slate-500 leading-relaxed max-w-sm">Scan the encrypted QR identifier using your authenticator application.</p>
                                     <div className="space-y-4 pt-2">
                                        <div className="relative group">
                                           <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#FF9B51] transition-colors" />
                                           <input 
                                             type="text" 
                                             maxLength={6}
                                             placeholder="Enter 6-digit confirmation code"
                                             className="w-full pl-12 pr-6 py-4 border border-[#BFC9D1] rounded-2xl text-base font-bold tracking-[0.2em] bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9B51]/20 focus:border-[#FF9B51]"
                                             value={mfaCode}
                                             onChange={(e) => setMfaCode(e.target.value)}
                                           />
                                        </div>
                                        {mfaError && <div className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-widest bg-rose-50 p-2 rounded-lg animate-bounce"><AlertCircle size={14} /> {mfaError}</div>}
                                        <div className="flex items-center gap-4 pt-2">
                                           <button 
                                             onClick={handleVerifyAndEnableMfa}
                                             disabled={mfaLoading || mfaCode.length !== 6}
                                             className="flex-1 py-4 bg-[#25343F] text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-blue-900/10 disabled:opacity-50"
                                           >
                                             {mfaLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Verify Identity"}
                                           </button>
                                           <button onClick={() => setMfaStep("initial")} className="px-6 py-4 text-slate-300 hover:text-slate-500 font-bold text-xs uppercase tracking-widest transition-all">
                                             Cancel
                                           </button>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         ) : (
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                               <div className="flex items-start gap-6">
                                  <div className="p-5 bg-white rounded-2xl text-slate-300 shadow-sm border border-slate-100">
                                     <Lock size={32} />
                                  </div>
                                  <div>
                                     <h4 className="text-lg font-bold text-[#25343F]">Security Required</h4>
                                     <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-md">Advance your account security to include MFA. Mandatory for administrative access.</p>
                                  </div>
                               </div>
                               <button 
                                 onClick={handleStartMfaSetup}
                                 disabled={mfaLoading}
                                 className="flex items-center px-10 py-5 bg-[#FF9B51] text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#ff8a35] transition-all shadow-xl shadow-orange-500/20"
                               >
                                 {mfaLoading ? <Loader2 size={16} className="animate-spin mr-3" /> : <Key size={16} className="mr-3" />}
                                 Elevate Security
                               </button>
                            </div>
                         )}
                      </div>
                   </div>
                 )}

                 {/* Alerts Tab - Wired to Dynamic Data */}
                 {activeTab === "alerts" && (
                   <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center gap-4 p-6 bg-[#25343F] rounded-3xl text-white shadow-xl">
                         <div className="p-3 bg-white/10 rounded-2xl">
                            <Bell size={24} className="text-[#FF9B51]" />
                         </div>
                         <div>
                            <h3 className="font-bold tracking-tight">Communication Preferences</h3>
                            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest leading-none">Global notification systems</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {[
                           { key: 'notifSystemCritical', title: "System Criticals", desc: "Alerts on server downtime or security breaches." },
                           { key: 'notifUserActivity', title: "User Activity", desc: "Summaries of registrations and tier shifts." },
                           { key: 'notifNetworkCapacity', title: "Network Capacity", desc: "Notifications when node load exceeds 85%." },
                           { key: 'notifAuditTrail', title: "Audit Trail", desc: "Log administrative logins and credential updates." }
                         ].map((item) => {
                           const val = getSettingValue(item.key);
                           return (
                             <div key={item.key} className="p-6 border border-[#BFC9D1] rounded-3xl flex items-start justify-between group hover:border-[#FF9B51] transition-colors">
                                <div className="pr-4">
                                   <p className="text-sm font-bold text-[#25343F] mb-1">{item.title}</p>
                                   <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                                </div>
                                <div 
                                  onClick={() => updateSetting(item.key, !val)}
                                  className={`h-6 w-11 shrink-0 rounded-full transition-colors relative p-1 cursor-pointer ${val ? 'bg-[#FF9B51]' : 'bg-slate-200'}`}
                                >
                                   <div className={`h-4 w-4 bg-white rounded-full transition-transform ${val ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                             </div>
                           );
                         })}
                      </div>
                   </div>
                 )}

                 {/* System Info Tab */}
                 {activeTab === "system" && (
                   <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="p-8 border border-blue-100 bg-blue-50/30 rounded-3xl">
                         <div className="flex items-center gap-4 mb-6">
                            <Info className="text-[#FF9B51]" size={20} />
                            <h3 className="text-lg font-bold text-[#25343F]">System Integrity Report</h3>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Layer</p>
                               <p className="text-sm font-bold text-[#25343F]">WireGuard Standard</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Encryption</p>
                               <p className="text-sm font-bold text-[#25343F]">ChaCha20-Poly1305</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Clusters</p>
                               <p className="text-sm font-bold text-[#25343F]">Stable Operational</p>
                            </div>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              {/* Action Bar */}
              <div className="bg-slate-50/80 backdrop-blur-md px-10 py-6 border-t border-[#BFC9D1] flex justify-end items-center">
                 <button 
                  onClick={() => toast.success("Configuration hierarchy committed.")}
                  className="flex items-center px-10 py-4 bg-[#25343F] text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl shadow-blue-900/20 active:scale-95 group"
                 >
                    <Save size={16} className="mr-3 text-[#FF9B51] group-hover:scale-125 transition-transform" />
                    Commit Configuration
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
