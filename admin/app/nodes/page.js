"use client";

import { useEffect, useState } from "react";
import api from "../../lib/api";
import { 
  Server, 
  MapPin, 
  Plus, 
  RefreshCcw, 
  Activity, 
  Globe, 
  Trash2, 
  Power,
  X,
  AlertTriangle,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";

export default function NodeManagement() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // stores nodeId to delete
  const [newNode, setNewNode] = useState({ name: "", countryCode: "US", city: "", ipAddress: "", publicKey: "placeholder" });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/nodes");
      setNodes(res.data);
    } catch (err) {
      console.error("Failed to fetch nodes", err);
      toast.error("Telemetry failure: Failed to sync server fleet.");
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = async (id, currentStatus) => {
    try {
      await api.put(`/admin/nodes/${id}`, { isActive: !currentStatus });
      toast.success(`Node ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchNodes();
    } catch (err) {
      toast.error("Protocol error: Failed to update node status.");
    }
  };

  const handleDeleteNode = async () => {
    if (!showDeleteConfirm) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/nodes/${showDeleteConfirm}`);
      setShowDeleteConfirm(null);
      toast.success("Node successfully decommissioned.", { icon: '🛡️' });
      fetchNodes();
    } catch (err) {
      toast.error("Critical: Failed to decommission node.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post("/admin/nodes", newNode);
      setShowModal(false);
      setNewNode({ name: "", countryCode: "US", city: "", ipAddress: "", publicKey: "placeholder" });
      toast.success("New node enrolled into secure fleet.");
      fetchNodes();
    } catch (err) {
      toast.error("Enrollment failed. Verify network uniqueness.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-[#EAEFEF] min-h-full text-[#25343F]">
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#FF9B51] uppercase tracking-[0.2em] mb-2">
             <Server size={14} />
             Fleet Infrastructure
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">VPN Server Management</h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">Manage global server fleet and real-time connectivity status across manageed nodes.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => { fetchNodes(); toast.success("Telemetry refreshed."); }}
            className="flex items-center justify-center rounded-xl border border-[#BFC9D1] bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCcw size={14} className="mr-2 text-slate-400" />
            Refresh
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center rounded-xl bg-[#FF9B51] px-5 py-2 text-xs font-bold text-white uppercase tracking-widest hover:bg-[#ff8a35] transition-all shadow-xl shadow-orange-500/20"
          >
            <Plus size={14} className="mr-2" />
            Add Server
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-lg bg-white border border-[#BFC9D1] animate-pulse"></div>
          ))}
        </div>
      ) : nodes.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-[#BFC9D1] p-12 md:p-20 text-center bg-white/50">
            <Globe className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No Servers Connected</h3>
            <p className="text-slate-500 mt-2">Enroll your first VPN server to begin scaling the network.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {nodes.map((node) => (
            <div key={node._id} className="group overflow-hidden rounded-2xl border border-[#BFC9D1] bg-white shadow-sm transition-all hover:border-[#FF9B51] hover:shadow-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="rounded-xl bg-[#EAEFEF] p-2.5 text-[#25343F] shadow-sm">
                    <Server size={20} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`h-2 w-2 rounded-full ${node.isActive ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-slate-300'}`}></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{node.isActive ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold leading-tight">{node.name}</h3>
                <div className="mt-1 flex items-center text-xs text-slate-400 uppercase tracking-widest font-bold">
                  <MapPin size={12} className="mr-1.5 text-[#FF9B51]" />
                  {node.city}, {node.countryCode}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#EAEFEF] pt-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Network IP</p>
                    <p className="text-xs font-mono font-bold text-slate-600">{node.ipAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Utilization</p>
                    <span className="text-xs font-bold text-[#FF9B51]">{node.load || 0}% Load</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#EAEFEF]/30 px-6 py-4 flex justify-between items-center border-t border-[#EAEFEF]">
                <button 
                   onClick={() => toggleNode(node._id, node.isActive)}
                   className={`flex items-center text-[10px] font-bold uppercase tracking-widest transition-colors ${node.isActive ? 'text-rose-500 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-800'}`}
                >
                  <Power size={12} className="mr-2" />
                  {node.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowDeleteConfirm(node._id)}
                    className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enroll Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#25343F]/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#BFC9D1]">
             <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEFEF]">
                <h3 className="text-lg font-bold">Enroll New Server</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-[#25343F] transition-colors">
                   <X size={20} />
                </button>
             </div>
             <form onSubmit={handleEnroll} className="p-6 space-y-4">
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Server Name</label>
                   <input 
                      type="text" 
                      required
                      placeholder="e.g. US-NY-01"
                      className="w-full px-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9B51]"
                      value={newNode.name}
                      onChange={(e) => setNewNode({...newNode, name: e.target.value})}
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Country Code</label>
                      <input 
                         type="text" 
                         required
                         placeholder="US"
                         className="w-full px-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9B51]"
                         value={newNode.countryCode}
                         onChange={(e) => setNewNode({...newNode, countryCode: e.target.value.toUpperCase()})}
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">City</label>
                      <input 
                         type="text" 
                         required
                         placeholder="New York"
                         className="w-full px-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9B51]"
                         value={newNode.city}
                         onChange={(e) => setNewNode({...newNode, city: e.target.value})}
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Public IP Address</label>
                   <input 
                      type="text" 
                      required
                      placeholder="0.0.0.0"
                      className="w-full px-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9B51]"
                      value={newNode.ipAddress}
                      onChange={(e) => setNewNode({...newNode, ipAddress: e.target.value})}
                   />
                </div>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="w-full bg-[#25343F] text-white py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg mt-4 disabled:opacity-50 flex items-center justify-center"
                >
                   {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Commit Fleet Enrollment"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#25343F]/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
           <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 border border-rose-100 text-center">
              <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100">
                 <AlertTriangle className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-[#25343F] mb-2">Decommission Server?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                 Are you sure you want to remove this node from the secure fleet? This action is <span className="font-bold text-rose-600">permanent</span> and will disconnect all active tunnels.
              </p>
              <div className="flex flex-col space-y-3">
                 <button 
                   onClick={handleDeleteNode}
                   disabled={actionLoading}
                   className="w-full bg-rose-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center"
                 >
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Confirm Decommission"}
                 </button>
                 <button 
                   onClick={() => setShowDeleteConfirm(null)}
                   className="w-full py-3 text-slate-400 hover:text-[#25343F] font-bold text-[10px] uppercase tracking-widest transition-colors"
                 >
                    Abort Action
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
