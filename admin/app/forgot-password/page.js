"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, Shield, ArrowLeft, Send } from "lucide-react";
import Image from "next/image";
import api from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRecover = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/auth/forgotpassword", { email });
      setMessage(res.data.msg || "Identity recovery initiated. Please check your inbox.");
    } catch (err) {
      setError(err.response?.data?.msg || "Recovery request failed. Identity not verified.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#EAEFEF] text-[#25343F]">
      
      <div className="hidden lg:flex w-1/2 bg-white flex-col items-center justify-center p-12 border-r border-[#BFC9D1]">
         <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex p-3 rounded-2xl bg-rose-50 shadow-sm mb-4 border border-rose-100">
               <Shield className="h-10 w-10 text-rose-500" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[#25343F]">Security Recovery</h2>
            <p className="text-slate-500 leading-relaxed">
              Initiate a secure password reset protocol. We will verify your identity via your administrative credentials.
            </p>
            <div className="relative h-72 w-full mt-10">
               <Image 
                 src="/AUTH_SVGS/Forgot password-pana.svg" 
                 alt="Password Recovery" 
                 fill
                 className="object-contain"
               />
            </div>
         </div>
      </div>

      
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24 bg-[#EAEFEF]">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-right-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Access Recovery</h1>
            <p className="text-sm text-slate-500">Provide your verified profile email.</p>
          </div>

          <form onSubmit={handleRecover} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Profile Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  placeholder="admin@sentinel.net"
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#BFC9D1] rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 text-xs font-bold p-4 rounded-xl border border-rose-100 animate-in shake duration-300">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-50 text-emerald-600 text-xs font-bold p-4 rounded-xl border border-emerald-100">
                {message}
              </div>
            )}

            <div className="space-y-3">
               <button 
                 type="submit" 
                 disabled={loading}
                 className="w-full bg-[#25343F] text-white py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center space-x-2 disabled:opacity-50"
               >
                 {loading ? (
                   <Loader2 className="h-5 w-5 animate-spin" />
                 ) : (
                   <>
                      <span>Initiate Recovery</span>
                      <Send size={16} />
                   </>
                 )}
               </button>

               <button 
                 type="button"
                 onClick={() => router.push("/login")}
                 className="w-full py-3 text-slate-400 hover:text-[#25343F] font-bold text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors"
               >
                  <ArrowLeft size={14} />
                  <span>Return to Identity Login</span>
               </button>
            </div>
          </form>

          <footer className="pt-8 border-t border-[#BFC9D1]">
             <p className="text-[10px] font-bold text-slate-300 text-center uppercase tracking-[0.2em]">
                System Identification Protocol
             </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
