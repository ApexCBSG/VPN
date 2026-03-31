"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  TrendingUp,
  Users,
  Server,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  CreditCard
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Overview", href: "/", icon: BarChart2 },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
  { name: "Users", href: "/users", icon: Users },
  { name: "Offerings", href: "/subscriptions", icon: CreditCard },
  { name: "Servers", href: "/nodes", icon: Server },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({ isCollapsed, setIsCollapsed, mobileMenuOpen, setMobileMenuOpen }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#25343F]/60 backdrop-blur-sm z-[40] lg:hidden transition-opacity duration-300" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[50] flex h-full flex-col bg-[#1a2730] text-white transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none",
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {/* Mobile Close Button */}
        <button 
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-[-45px] p-2 bg-[#1a2730] text-white rounded-r-lg lg:hidden"
        >
          <X size={20} />
        </button>

        {/* Brand Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-white/10 shrink-0 overflow-hidden",
          isCollapsed ? "lg:justify-center px-5 lg:px-0" : "px-6"
        )}>
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#FF9B51] shadow-lg shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          <div className={cn(
            "ml-3 transition-opacity duration-200",
            isCollapsed ? "lg:opacity-0 lg:w-0" : "opacity-100"
          )}>
            <p className="text-sm font-bold tracking-tight whitespace-nowrap leading-none uppercase">VPN Admin</p>
            <p className="text-[10px] text-white/40 mt-1 whitespace-nowrap font-bold uppercase tracking-widest">Management</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className={cn(
          "px-6 pt-8 pb-3 transition-opacity",
          isCollapsed ? "lg:opacity-0 lg:h-0 overflow-hidden" : "opacity-100"
        )}>
          <p className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase">
            Main Navigation
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={cn(
                  "group relative flex items-center rounded-xl px-4 py-3 text-[14px] font-bold tracking-wide transition-all duration-200",
                  isActive
                    ? "bg-[#FF9B51] text-white shadow-lg shadow-orange-500/20"
                    : "text-white/40 hover:bg-white/5 hover:text-white",
                  isCollapsed ? "lg:justify-center" : "justify-start"
                )}
              >
                <item.icon
                  size={18}
                  className={cn(
                    "shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-white" : "text-white/30",
                    !isCollapsed && "mr-4"
                  )}
                />
                <span className={cn(
                  "whitespace-nowrap transition-all duration-200",
                  isCollapsed ? "lg:opacity-0 lg:w-0" : "opacity-100"
                )}>
                  {item.name}
                </span>
                {isActive && !isCollapsed && (
                   <div className="absolute right-3 h-1.5 w-1.5 bg-white rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Section */}
        <div className="px-4 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : ""}
            className={cn(
              "group flex w-full items-center rounded-xl px-4 py-3 text-[14px] font-bold text-rose-400/60 hover:bg-rose-500 hover:text-white transition-all duration-200",
              isCollapsed ? "lg:justify-center" : "justify-start"
            )}
          >
            <LogOut size={18} className={cn("shrink-0 transition-colors", !isCollapsed && "mr-4")} />
            <span className={cn(
              "transition-all",
              isCollapsed ? "lg:opacity-0 lg:w-0" : "opacity-100"
            )}>Sign Out</span>
          </button>
        </div>

        {/* Collapse Toggle (Desktop only) */}
        <div className="hidden lg:flex p-4 justify-end">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-all border border-white/5"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </>
  );
}
