"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, Shield, ArrowRight, Info } from "lucide-react";
import Image from "next/image";
import api from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      
      if (res.data.mfaRequired) {
        localStorage.setItem("pendingMfaUserId", res.data.userId);
        router.push("/login/verify-mfa");
        return;
      }

      if (res.data.token) {
        localStorage.setItem("adminToken", res.data.token);
        router.push("/");
      } else {
        setError("Access denied. Your administrative profile requires further authorization.");
      }
    } catch (err) {
      
      const msg = err.response?.data?.msg;
      if (msg === "Invalid Credentials") {
        setError("Invalid email or password. Please verify your credentials and try again.");
      } else {
        setError(msg || "Could not reach the authentication server. Please check your network connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F0F4F7] text-[#1A252E] font-sans">
      
      <div className="hidden lg:flex w-5/12 bg-white flex-col items-center justify-center p-16 border-r border-[#D1D9E0] relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-[#1A252E]" />
         <div className="max-w-md w-full text-center space-y-8 z-10">
            <div className="inline-flex p-4 rounded-3xl bg-[#1A252E] shadow-2xl mb-2">
               <Shield className="h-12 w-12 text-[#FF9B51]" />
            </div>
            <div className="space-y-4">
               <h2 className="text-4xl font-extrabold tracking-tight text-[#1A252E]">Administrator Access</h2>
               <p className="text-slate-500 text-lg leading-relaxed px-4">
                 Authorize your session to manage the secure global VPN infrastructure and oversee real-time network telemetry.
               </p>
            </div>
            <div className="relative h-80 w-full mt-12 transition-transform hover:scale-105 duration-700">
               <Image 
                 src="/AUTH_SVGS/Login-pana.svg" 
                 alt="Sentinel Security" 
                 fill
                 priority
                 className="object-contain"
               />
            </div>
         </div>
         
         <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-slate-50 rounded-full blur-3xl opacity-50" />
      </div>

      
      <div className="w-full lg:w-7/12 flex flex-col items-center justify-center p-8 lg:p-24">
        <div className="w-full max-w-sm space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="lg:hidden text-center mb-10">
             <div className="inline-flex p-3 rounded-2xl bg-[#1A252E] mb-5 shadow-lg">
                <Shield className="h-8 w-8 text-[#FF9B51]" />
             </div>
             <h1 className="text-2xl font-bold tracking-tight">Sentinel Admin Portal</h1>
          </div>

          <div className="space-y-2.5">
            <h1 className="text-3xl font-black tracking-tight text-[#1A252E]">Sign In</h1>
            <p className="text-slate-400 font-medium">Please provide your administrative credentials below.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Email Address</label>
              <div className="group relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#FF9B51] transition-colors" />
                <input 
                  type="email" 
                  required
                  autoFocus
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-[#D1D9E0] rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9B51]/20 focus:border-[#FF9B51] transition-all shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Administrative Password</label>
                  <button 
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-[11px] font-bold text-[#FF9B51] hover:text-[#ff8a35] transition-colors"
                  >
                    Forgot Password?
                  </button>
               </div>
              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#FF9B51] transition-colors" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-[#D1D9E0] rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9B51]/20 focus:border-[#FF9B51] transition-all shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            
            <div className="min-h-[60px] flex items-center">
              {error ? (
                <div className="w-full bg-[#FFF4F2] text-[#E03131] text-[13px] font-semibold p-4 rounded-2xl border border-[#FFE3E0] animate-in slide-in-from-top-2 fade-in duration-300 flex items-start space-x-3">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1A252E] text-white py-4.5 rounded-2xl font-extrabold text-[15px] hover:bg-black active:scale-[0.98] transition-all shadow-2xl shadow-[#1A252E]/20 flex items-center justify-center space-x-3 disabled:opacity-70"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="opacity-80">Authenticating...</span>
                </div>
              ) : (
                <>
                   <span>Access Console</span>
                   <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <footer className="pt-12 text-center">
             <div className="inline-flex items-center space-x-3 text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">
                <div className="h-px w-8 bg-slate-200" />
                <span>Security Governance</span>
                <div className="h-px w-8 bg-slate-200" />
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
               Sentinel Infrastructure Framework<br/>
               <span className="inline-block mt-2 text-[9px] opacity-60 bg-slate-100 px-3 py-1 rounded-full">Build 1.2.4-STABLE — Unified Deployment</span>
             </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
