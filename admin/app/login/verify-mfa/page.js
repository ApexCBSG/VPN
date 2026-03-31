"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, Shield, ArrowLeft, RefreshCw } from "lucide-react";
import Image from "next/image";
import api from "../../../lib/api";

export default function VerifyMfaPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem("pendingMfaUserId");
    if (!id) {
      router?.push("/login");
    } else {
      setUserId(id);
    }
  }, [router]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return setError("Please enter a valid 6-digit code.");
    
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login/2fa", { userId, code });
      
      if (res.data.token) {
        localStorage.setItem("adminToken", res.data.token);
        localStorage.removeItem("pendingMfaUserId");
        router?.push("/");
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Verification failed. Security key mismatch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#EAEFEF] text-[#25343F]">
      
      <div className="hidden lg:flex w-1/2 bg-white flex-col items-center justify-center p-12 border-r border-[#BFC9D1]">
         <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex p-3 rounded-2xl bg-orange-50 shadow-sm mb-4 border border-[#FF9B51]/30">
               <Shield className="h-10 w-10 text-[#FF9B51]" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[#25343F]">Two-Factor Protocol</h2>
            <p className="text-slate-500 leading-relaxed">
              An additional security layer is active on your profile. Please provide the current 6-digit validation key from your authenticator application.
            </p>
            <div className="relative h-72 w-full mt-10">
               <Image 
                 src="/AUTH_SVGS/Two factor authentication-pana.svg" 
                 alt="MFA Verification" 
                 fill
                 className="object-contain"
               />
            </div>
         </div>
      </div>

      
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24 bg-[#EAEFEF]">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-right-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Security Checkpoint</h1>
            <p className="text-sm text-slate-500 font-medium">Verify your administrative session.</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Authentication Code</label>
              <input 
                type="text" 
                required
                maxLength={6}
                placeholder="000 000"
                className="w-full px-4 py-4 bg-white border border-[#BFC9D1] rounded-2xl text-center text-3xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#FF9B51] transition-all shadow-lg shadow-orange-500/5 placeholder:opacity-20 placeholder:tracking-normal placeholder:text-xl placeholder:font-normal"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 text-xs font-bold p-4 rounded-xl border border-rose-100 animate-in shake duration-300">
                {error}
              </div>
            )}

            <div className="space-y-3">
               <button 
                 type="submit" 
                 disabled={loading || code.length !== 6}
                 className="w-full bg-[#FF9B51] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#ff8a35] transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
               >
                 {loading ? (
                   <Loader2 className="h-5 w-5 animate-spin" />
                 ) : (
                   <span>Finalize Verification</span>
                 )}
               </button>

               <button 
                 type="button"
                 onClick={() => router?.push("/login")}
                 className="w-full py-3 text-slate-400 hover:text-[#25343F] font-bold text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors"
               >
                  <ArrowLeft size={14} />
                  <span>Return to Identity Login</span>
               </button>
            </div>
          </form>

          <div className="pt-8 border-t border-[#BFC9D1] flex flex-col items-center space-y-4">
             <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                <RefreshCw size={12} className="animate-spin-slow" />
                <span>Synchronizing TOTP Layers</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
