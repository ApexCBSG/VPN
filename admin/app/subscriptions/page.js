"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  X, 
  Star, 
  Zap,
  Globe,
  Loader2,
  AlertCircle,
  Clock,
  DollarSign,
  Layers,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [currentPlan, setCurrentPlan] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    duration: "monthly",
    revenueCatPackageId: "",
    features: [""],
    isFeatured: false,
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/plans");
      setPlans(res.data);
    } catch (err) {
      toast.error("Failed to sync global offerings.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode, plan = null) => {
    setModalMode(mode);
    if (mode === "edit" && plan) {
      setCurrentPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || "",
        price: plan.price,
        duration: plan.duration,
        revenueCatPackageId: plan.revenueCatPackageId,
        features: plan.features.length > 0 ? plan.features : [""],
        isFeatured: plan.isFeatured || false,
        isActive: plan.isActive !== undefined ? plan.isActive : true,
        sortOrder: plan.sortOrder || 0
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: 9.99,
        duration: "monthly",
        revenueCatPackageId: "$rc_monthly",
        features: [""],
        isFeatured: false,
        isActive: true,
        sortOrder: 0
      });
    }
    setShowModal(true);
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeatureRow = () => {
    setFormData({ ...formData, features: [...formData.features, ""] });
  };

  const removeFeatureRow = (index) => {
    if (formData.features.length === 1) return;
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    // Cleanup empty features
    const submissionData = {
      ...formData,
      features: formData.features.filter(f => f.trim() !== "")
    };

    try {
      if (modalMode === "create") {
        await api.post("/admin/plans", submissionData);
        toast.success("Offering enrolled successfully.");
      } else {
        await api.put(`/admin/plans/${currentPlan._id}`, submissionData);
        toast.success("Offering synchronized.");
      }
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      toast.error("Protocol error: Failed to commit plan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("CRITICAL: Are you sure you want to decommission this offering? This will remove it from the public list.")) return;
    try {
      await api.delete(`/admin/plans/${id}`);
      toast.success("Offering decommissioned.", { icon: '🗑️' });
      fetchPlans();
    } catch (err) {
      toast.error("Decommission error.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#EAEFEF]">
         <Loader2 className="animate-spin text-[#FF9B51]" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#EAEFEF] min-h-full text-[#25343F]">
      <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#FF9B51] uppercase tracking-[0.2em] mb-3">
             <CreditCard size={14} />
             Revenue & Offerings
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-slate-500 mt-2 leading-relaxed">
            Manage global subscription tiers, pricing visibility, and promotional offering hierarchies. Synchronized with the RevenueCat entitlement engine.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal("create")}
          className="flex items-center justify-center px-8 py-4 bg-[#25343F] text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-blue-900/20 active:scale-95"
        >
          <Plus size={16} className="mr-3" />
          Enroll Plan
        </button>
      </header>

      {plans.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-[#BFC9D1] p-20 text-center flex flex-col items-center">
            <div className="p-6 bg-slate-50 rounded-full mb-6">
               <Layers className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold">No Offerings Active</h3>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto">Initialize your first subscription tier to enable global monetization through the mobile applications.</p>
            <button 
              onClick={() => handleOpenModal("create")}
              className="mt-8 text-[10px] font-bold text-[#FF9B51] uppercase tracking-widest hover:underline"
            >
               Create First Offering
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {plans.map((plan) => (
             <div key={plan._id} className={`bg-white rounded-3xl border transition-all hover:shadow-2xl hover:shadow-blue-900/5 group flex flex-col ${plan.isFeatured ? 'border-[#FF9B51] shadow-lg ring-1 ring-[#FF9B51]/20' : 'border-[#BFC9D1] shadow-sm'}`}>
                <div className="p-8 flex-1">
                   {plan.isFeatured && (
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#FF9B51] uppercase tracking-[0.2em] mb-4 bg-orange-50 w-fit px-3 py-1 rounded-full border border-orange-100">
                         <Star size={10} fill="currentColor" />
                         Featured Popular
                      </div>
                   )}
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <div className={`h-2.5 w-2.5 rounded-full ${plan.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`} />
                   </div>
                   
                   <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-2xl font-bold">${plan.price}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">/ {plan.duration}</span>
                   </div>

                   <p className="text-sm text-slate-500 mb-8 leading-relaxed line-clamp-2">
                      {plan.description || "Administrative subscription tier for premium cloud access."}
                   </p>

                   <div className="space-y-3">
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-slate-600 font-medium tracking-tight">
                           <CheckCircle size={14} className="text-[#FF9B51] shrink-0" />
                           {feature}
                        </div>
                      ))}
                      {plan.features.length > 4 && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                           + {plan.features.length - 4} More Features
                        </p>
                      )}
                   </div>
                </div>

                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-3xl">
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleOpenModal("edit", plan)}
                        className="p-2.5 bg-white border border-[#BFC9D1] text-slate-500 hover:text-[#25343F] hover:border-[#25343F] rounded-xl transition-all shadow-sm"
                      >
                         <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(plan._id)}
                        className="p-2.5 bg-white border border-rose-100 text-rose-300 hover:text-rose-600 hover:border-rose-300 rounded-xl transition-all shadow-sm"
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                   <div className="flex flex-col items-end">
                      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">RevenueCat Link</p>
                      <p className="text-[10px] font-mono font-bold text-slate-500">{plan.revenueCatPackageId}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-[#25343F]/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
           <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[85vh] border border-[#BFC9D1]">
              
              {/* Modal Sidebar (Context) */}
              <div className="w-full md:w-80 bg-[#1a2730] text-white p-8 hidden md:flex flex-col justify-between">
                 <div>
                    <div className="h-10 w-10 bg-[#FF9B51] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6">
                       <CreditCard size={20} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">Offering Definition</h3>
                    <p className="text-xs text-white/40 mt-3 leading-relaxed font-medium uppercase tracking-widest">Monetization Node Layer</p>
                    <div className="mt-8 space-y-6">
                       <div className="flex items-start gap-4">
                          <Zap size={16} className="text-[#FF9B51] mt-1 shrink-0" />
                          <p className="text-xs text-white/60 leading-relaxed italic">Changes made here are synchronized globally across all client applications in real-time.</p>
                       </div>
                       <div className="flex items-start gap-4">
                          <Globe size={16} className="text-blue-400 mt-1 shrink-0" />
                          <p className="text-xs text-white/60 leading-relaxed italic">Ensure RevenueCat IDs match exactly with your cross-platform dashboard settings.</p>
                       </div>
                    </div>
                 </div>
                 <div className="pt-8 border-t border-white/5">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-loose">Internal Protoccol Version 1.2.4</p>
                 </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 flex flex-col">
                 <div className="flex items-center justify-between mb-8">
                    <h4 className="text-lg font-bold uppercase tracking-widest text-[#25343F]">{modalMode === 'create' ? 'Enroll New Tier' : 'Modify Core Tier'}</h4>
                    <button onClick={() => setShowModal(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                       <X size={20} />
                    </button>
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-8 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Plan Display Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Monthly Professional"
                            className="w-full px-5 py-4 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9B51]/20 focus:border-[#FF9B51] transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                          />
                       </div>
                       <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Market Description</label>
                          <textarea 
                            rows={3}
                            placeholder="Briefly summarize the value proposition..."
                            className="w-full px-5 py-4 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9B51]/20 focus:border-[#FF9B51] transition-all"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Display Price ($)</label>
                          <div className="relative group">
                             <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#FF9B51] transition-colors" />
                             <input 
                               type="number" 
                               step="0.01"
                               required
                               className="w-full pl-10 pr-5 py-4 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-2xl text-sm font-bold focus:outline-none"
                               value={formData.price}
                               onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                             />
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Billing Duration</label>
                          <select 
                            className="w-full px-5 py-4 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-2xl text-sm font-bold focus:outline-none appearance-none"
                            value={formData.duration}
                            onChange={(e) => setFormData({...formData, duration: e.target.value})}
                          >
                             <option value="monthly">Monthly Cycle</option>
                             <option value="yearly">Yearly Cycle</option>
                             <option value="lifetime">Lifetime Access</option>
                          </select>
                       </div>
                       <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">RevenueCat Technical ID</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. $rc_monthly"
                            className="w-full px-5 py-4 bg-slate-50 border border-[#BFC9D1] rounded-2xl text-sm font-mono font-bold focus:outline-none focus:border-[#FF9B51]"
                            value={formData.revenueCatPackageId}
                            onChange={(e) => setFormData({...formData, revenueCatPackageId: e.target.value})}
                          />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Plan Value Propositions (Features)</label>
                          <button type="button" onClick={addFeatureRow} className="text-[9px] font-bold text-[#FF9B51] uppercase tracking-widest flex items-center hover:bg-orange-50 px-2 py-1 rounded-lg">
                             <Plus size={12} className="mr-1" /> Add Feature
                          </button>
                       </div>
                       <div className="space-y-3">
                          {formData.features.map((feature, index) => (
                             <div key={index} className="flex items-center gap-3 group animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                                <div className="h-10 w-10 flex-shrink-0 bg-[#EAEFEF] rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-400">
                                   {index + 1}
                                </div>
                                <input 
                                  type="text" 
                                  placeholder="e.g. Unlimited High-Speed Tunneling"
                                  className="flex-1 px-5 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#FF9B51] transition-all"
                                  value={feature}
                                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                                />
                                <button type="button" onClick={() => removeFeatureRow(index)} className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                                   <X size={16} />
                                </button>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="pt-6 grid grid-cols-2 gap-6 border-t border-[#EAEFEF]">
                       <div className="flex items-center justify-between p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                          <div className="flex items-center gap-4">
                             <Star size={18} className="text-[#FF9B51]" />
                             <div>
                                <p className="text-xs font-bold text-[#25343F]">Featured Offering</p>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Mark as most popular</p>
                             </div>
                          </div>
                          <div 
                            onClick={() => setFormData({...formData, isFeatured: !formData.isFeatured})}
                            className={`h-6 w-11 shrink-0 rounded-full transition-colors relative p-1 cursor-pointer ${formData.isFeatured ? 'bg-[#FF9B51]' : 'bg-slate-200'}`}
                          >
                             <div className={`h-4 w-4 bg-white rounded-full transition-transform ${formData.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-[#EAEFEF]/30 rounded-2xl border border-[#BFC9D1]/30">
                          <div className="flex items-center gap-4">
                             <Globe size={18} className="text-[#25343F]" />
                             <div>
                                <p className="text-xs font-bold text-[#25343F]">Offering Visibility</p>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Publicly active in apps</p>
                             </div>
                          </div>
                          <div 
                            onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                            className={`h-6 w-11 shrink-0 rounded-full transition-colors relative p-1 cursor-pointer ${formData.isActive ? 'bg-[#25343F]' : 'bg-slate-200'}`}
                          >
                             <div className={`h-4 w-4 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                       </div>
                    </div>

                    <div className="pt-10 flex gap-4">
                       <button 
                         type="submit" 
                         disabled={actionLoading}
                         className="flex-1 py-5 bg-[#25343F] text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl shadow-blue-900/10 disabled:opacity-50 flex items-center justify-center"
                       >
                          {actionLoading ? <Loader2 size={18} className="animate-spin" /> : (
                             <>
                               <CheckCircle size={16} className="mr-3" />
                               Commit Configuration
                             </>
                          )}
                       </button>
                       <button 
                         type="button" 
                         onClick={() => setShowModal(false)}
                         className="px-10 py-5 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-all"
                       >
                          Cancel
                       </button>
                    </div>
                 </form>
              </div>

           </div>
        </div>
      )}
    </div>
  );
}
