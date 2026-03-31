"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  User,
  ChevronDown,
  LogOut,
  ChevronRight,
  Menu,
  MoreVertical
} from "lucide-react";
import api from "../lib/api";

export default function TopBar({ pathname, setMobileMenuOpen }) {
  const [admin, setAdmin] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await api.get("/admin/me");
        setAdmin(res.data);
      } catch (err) {
        console.error("Failed to fetch admin profile", err);
      }
    }
    fetchMe();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("/login");
  };

  const breadcrumbs =
    pathname === "/"
      ? ["Overview"]
      : pathname.split("/").filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-white border-b border-[#BFC9D1] z-[30] shadow-sm shrink-0">
      
      {/* Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 rounded-xl hover:bg-[#EAEFEF] text-[#25343F] transition-all"
        >
          <Menu size={20} />
        </button>

        <nav className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300">
          <span className="hidden sm:inline">Portal</span>
          <ChevronRight size={12} className="hidden sm:inline" />
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center space-x-1.5">
              {i > 0 && <ChevronRight size={12} />}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "text-[#FF9B51]"
                    : ""
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Profile & Notifications */}
      <div className="flex items-center space-x-2 md:space-x-4">

        <button className="relative p-2.5 rounded-xl hover:bg-[#EAEFEF] transition-all text-slate-400 hover:text-[#25343F]">
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 bg-[#FF9B51] rounded-full ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-[#BFC9D1]/50 hidden sm:block" />

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 pl-1.5 pr-1.5 md:pr-4 py-1.5 rounded-2xl hover:bg-[#EAEFEF] transition-all border border-transparent hover:border-[#BFC9D1]/30"
          >
            <div className="h-8 w-8 rounded-xl bg-[#25343F] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-[#25343F]/10 shrink-0">
              {admin?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[11px] font-bold text-[#25343F] leading-none uppercase tracking-wide">
                {admin?.email?.split('@')[0] || "Administrator"}
              </p>
              <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-widest leading-none">
                System {admin?.role || "Admin"}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-300 hidden md:block" />
            <MoreVertical size={16} className="text-slate-300 md:hidden" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-[#BFC9D1] py-2 z-[60] animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 mb-1 border-b border-[#EAEFEF]">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Authenticated as</p>
                 <p className="text-xs font-bold text-[#25343F] truncate">{admin?.email}</p>
              </div>
              <button
                onClick={() => { setShowDropdown(false); router.push("/profile"); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-[12px] font-bold text-[#25343F] hover:bg-[#EAEFEF] transition-colors"
              >
                <User size={16} className="text-slate-400" />
                Profile & Access
              </button>
              <div className="h-px bg-[#EAEFEF] mx-4 my-1" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 text-[12px] font-bold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={16} />
                Terminate Session
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
