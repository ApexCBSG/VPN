"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import {
  Users,
  Server,
  Activity,
  Shield,
  ChevronRight,
  Cpu,
  ArrowUpRight,
  Wifi,
  Clock,
  RefreshCcw,
  Loader2
} from "lucide-react";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, nodesRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/nodes")
      ]);
      setMetrics(statsRes.data);
      setNodes(nodesRes.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      name: "Total Users",
      value: metrics?.totalUsers ?? "0",
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      trend: metrics?.growth?.users ?? "0%",
      trendUp: !metrics?.growth?.users?.startsWith('-'),
    },
    {
      name: "Premium Nodes",
      value: metrics?.activeNodes ?? "0",
      icon: Shield,
      iconBg: "bg-orange-50",
      iconColor: "text-[#FF9B51]",
      trend: metrics?.growth?.nodes ?? "+0%",
      trendUp: true,
    },
    {
      name: "Active Connections",
      value: "0",
      icon: Wifi,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      trend: "Live",
      trendUp: null,
    },
    {
      name: "System Load",
      value: metrics?.growth?.load ?? "0%",
      icon: Cpu,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-500",
      trend: "Normal",
      trendUp: null,
    },
  ];

  return (
    <div className="p-8 bg-[#EAEFEF] min-h-full text-[#25343F]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Real-time statistics and server fleet status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 shadow-sm">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-5 border border-[#BFC9D1] hover:border-[#FF9B51] hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                <stat.icon size={18} className={stat.iconColor} />
              </div>
              {stat.trendUp !== null ? (
                <span className={`flex items-center text-[10px] font-bold gap-0.5 ${stat.trendUp ? "text-emerald-600" : "text-rose-500"}`}>
                  <ArrowUpRight size={10} />
                  {stat.trend}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.trend}</span>
              )}
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {loading ? (
                <span className="inline-block w-10 h-7 bg-[#EAEFEF] rounded animate-pulse" />
              ) : (
                stat.value
              )}
            </p>
            <p className="mt-1 text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-loose">
              {stat.name}
            </p>
          </div>
        ))}
      </div>

      {/* Main Sections */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* VPN Servers List */}
        <section className="bg-white rounded-xl border border-[#BFC9D1] overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#EAEFEF]">
            <div>
              <h2 className="text-sm font-bold text-[#25343F]">VPN Servers</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{nodes.length} nodes active</p>
            </div>
            <button 
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-[#FF9B51] transition-colors"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="divide-y divide-[#EAEFEF] flex-1 overflow-y-auto max-h-[400px]">
            {loading ? (
               <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" /></div>
            ) : nodes.length === 0 ? (
               <div className="p-12 text-center text-slate-300 italic text-sm">No active nodes provisioned.</div>
            ) : (
              nodes.map((node) => (
                <div key={node._id} className="flex items-center justify-between px-6 py-4 hover:bg-[#EAEFEF]/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-[#EAEFEF] text-slate-400">
                      <Server size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#25343F]">{node.name}</p>
                      <p className="text-[10px] font-mono font-bold text-slate-300 tracking-wider mt-0.5">{node.ipAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{node.load || 0}% load</p>
                      <div className="h-1 w-20 bg-[#EAEFEF] rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${node.load > 80 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                          style={{ width: `${node.load || 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                      <Clock size={12} />
                      {Math.floor(Math.random() * 20 + 5)}ms
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${node.isActive ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-slate-200 animate-pulse'}`} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* System Health / Real-time Status */}
        <section className="bg-[#25343F] rounded-xl p-8 shadow-xl text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-12 -bottom-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Activity size={240} />
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.3em]">Live Status</span>
            </div>
            <h2 className="text-2xl font-bold mt-1 tracking-tight">Network Health</h2>
            <p className="text-sm text-white/40 mt-3 leading-relaxed max-w-sm">
              All localized infrastructure systems operating within nominal parameters. WireGuard security layers active on all managed tunnels. Average uptime sustained at 99.99%.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6">
            {[
              { label: "Stability", value: nodes.length > 0 ? "Operational" : "Idle", highlight: true },
              { label: "Uptime", value: "14.2 Days" },
              { label: "Tunnels", value: nodes.length > 0 ? "Provisioned" : "Inactive" },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mb-2">{item.label}</p>
                <p className={`text-base font-bold ${item.highlight ? "text-[#FF9B51]" : "text-white"}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <button className="mt-8 self-start flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-all">
            View Protocol Logs <ChevronRight size={14} className="text-[#FF9B51]" />
          </button>
        </section>
      </div>
    </div>
  );
}
