"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Globe, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Calendar,
  Zap
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import api from "../../lib/api";

export default function AnalyticsPage() {
  const [data, setData] = useState({ 
    growth: [], 
    usage: [], 
    metrics: {
      growthVelocity: "0%",
      avgConnection: "0m",
      activeThroughput: "0 Mbps",
      nodeLatency: "0ms"
    } 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/admin/analytics");
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#EAEFEF] text-slate-400">
         <Loader2 className="animate-spin mb-4" size={32} />
         <p className="text-xs font-bold uppercase tracking-widest">Calibrating Analytics Suite...</p>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="p-4 md:p-8 bg-[#EAEFEF] min-h-full text-[#25343F]">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#FF9B51] uppercase tracking-[0.2em] mb-3">
           <TrendingUp size={14} />
           Infrastructure Telemetry
        </div>
        <h1 className="text-3xl font-bold tracking-tight">System Analytics</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Real-time monitoring of global network utilization and administrative footprint. Data aggregated directly from management nodes.
        </p>
      </header>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
         {[
           { label: "Growth Velocity", val: metrics.growthVelocity, icon: ArrowUpRight, col: "text-emerald-500", bg: "bg-emerald-50" },
           { label: "Avg. Connection", val: metrics.avgConnection, icon: Activity, col: "text-blue-500", bg: "bg-blue-50" },
           { label: "Active Throughput", val: metrics.activeThroughput, icon: Zap, col: "text-[#FF9B51]", bg: "bg-orange-50" },
           { label: "Node Latency", val: metrics.nodeLatency, icon: Globe, col: "text-purple-500", bg: "bg-purple-50" }
         ].map((stat, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl border border-[#BFC9D1] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                 <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.col}`}>
                    <stat.icon size={18} />
                 </div>
                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Live</span>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
              <p className="text-2xl font-bold mt-2">{stat.val}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         
         <div className="bg-white p-8 rounded-3xl border border-[#BFC9D1] shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-lg font-bold">User Enrollment Trends</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Last 7 Days Acquisition</p>
               </div>
               <div className="px-4 py-2 bg-[#EAEFEF]/50 rounded-xl flex items-center gap-2 border border-[#BFC9D1]/30">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-[#25343F] uppercase">Week to Date</span>
               </div>
            </div>
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.growth}>
                     <defs>
                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#FF9B51" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#FF9B51" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEFEF" />
                     <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 'bold', fill: '#BFC9D1'}} 
                        dy={10}
                     />
                     <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 'bold', fill: '#BFC9D1'}} 
                     />
                     <Tooltip 
                        contentStyle={{ 
                           borderRadius: '16px', 
                           border: '1px solid #BFC9D1', 
                           boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                           padding: '12px'
                        }}
                        labelStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#25343F', marginBottom: '4px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#FF9B51' }}
                     />
                     <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#FF9B51" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorGrowth)" 
                        animationDuration={1500}
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         
         <div className="bg-white p-8 rounded-3xl border border-[#BFC9D1] shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-lg font-bold">Network Load Statistics</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Active vs Throughput (Last 24h)</p>
               </div>
               <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#FF9B51] mt-1.5" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Telemetry</span>
               </div>
            </div>
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.usage}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEFEF" />
                     <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 'bold', fill: '#BFC9D1'}} 
                        dy={10}
                        interval={3}
                     />
                     <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 'bold', fill: '#BFC9D1'}} 
                     />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: '1px solid #BFC9D1' }}
                     />
                     <Legend 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }}
                     />
                     <Line 
                        type="stepAfter" 
                        dataKey="active" 
                        name="Active Connections"
                        stroke="#25343F" 
                        strokeWidth={3}
                        dot={false}
                        animationDuration={2000}
                     />
                     <Line 
                        type="monotone" 
                        dataKey="bandwidth" 
                        name="Throughput (Mbps)"
                        stroke="#FF9B51" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                        animationDuration={2500}
                     />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
}
