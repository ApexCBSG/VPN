"use client";

import { useEffect, useState } from "react";
import api from "../../lib/api";
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Shield, 
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  UserCheck,
  UserMinus,
  Key,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [stats, setStats] = useState({ total: 0, premium: 0, pending: 0 });

  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); 
  const [currentUser, setCurrentUser] = useState(null);
  
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "user",
    tier: "free",
    isVerified: false,
    expiryDate: ""
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      const userList = res.data.users;
      setUsers(userList);
      
      setStats({
        total: res.data.total || userList.length,
        premium: userList.filter(u => u.tier === 'premium').length,
        pending: userList.filter(u => !u.isVerified).length,
      });
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ email: "", password: "", role: "user", tier: "free", isVerified: false, expiryDate: "" });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setModalMode("edit");
    setCurrentUser(user);
    setFormData({
      email: user.email,
      role: user.role,
      tier: user.tier,
      isVerified: user.isVerified || false,
      expiryDate: user.expiryDate ? format(new Date(user.expiryDate), 'yyyy-MM-dd') : "",
      password: "" 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === "create") {
        await api.post("/admin/users", formData);
        toast.success("User successfully enrolled.");
      } else {
        await api.put(`/admin/users/${currentUser._id}`, formData);
        toast.success("Profile synchronized.");
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Operational failure.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Account Termination: Are you certain you wish to permanently remove this user? This action cannot be reversed.")) {
      try {
        await api.delete(`/admin/users/${id}`);
        toast.success("Account terminated.", { icon: '🗑️' });
        fetchUsers();
      } catch (err) {
        toast.error("Termination failed.");
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterType === "all" || user.tier === filterType;
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesTier && matchesRole;
  });

  return (
    <div className="p-4 md:p-8 bg-[#EAEFEF] min-h-full text-[#25343F]">
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between space-y-4 md:space-y-0">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#FF9B51] uppercase tracking-[0.2em] mb-2">
             <Users size={14} />
             Identity Management
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">Enroll, modify, and monitor global account access and membership tiers across the secure network.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center justify-center px-6 py-3 bg-[#FF9B51] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#ff8a35] transition-all shadow-xl shadow-orange-500/20"
        >
          <Plus size={16} className="mr-2" /> Enroll New User
        </button>
      </header>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        {[
          { label: "Total Users", val: stats.total, icon: Users, col: "text-blue-600", bg: "bg-blue-50" },
          { label: "Premium Tiers", val: stats.premium, icon: Shield, col: "text-[#FF9B51]", bg: "bg-orange-50" },
          { label: "Pending Verification", val: stats.pending, icon: Clock, col: "text-amber-500", bg: "bg-amber-50" },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-[#BFC9D1] shadow-sm flex items-center justify-between group hover:border-[#FF9B51] transition-colors">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-3xl font-bold mt-1">{s.val}</p>
            </div>
            <div className={`p-3 rounded-lg ${s.bg} ${s.col}`}>
              <s.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-[#FF9B51] transition-colors" />
            <input 
              type="text" 
              placeholder="Search by identifier..."
              className="pl-10 pr-4 py-2.5 w-72 rounded-lg border border-[#BFC9D1] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FF9B51] transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center rounded-lg border border-[#BFC9D1] px-4 py-2.5 text-sm font-semibold transition-all ${showFilters ? 'bg-[#25343F] text-white' : 'bg-white hover:bg-slate-50'}`}
          >
            <Filter size={16} className="mr-2" /> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-8 p-6 bg-white rounded-xl border border-[#BFC9D1] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Membership Tier</p>
              <div className="flex flex-wrap gap-2">
                {['all', 'premium', 'free'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${filterType === t ? 'bg-[#FF9B51] text-white shadow-md shadow-orange-500/20' : 'bg-[#EAEFEF] text-slate-500 hover:text-[#25343F]'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">System Role</p>
              <div className="flex flex-wrap gap-2">
                {['all', 'admin', 'user'].map(r => (
                  <button 
                    key={r}
                    onClick={() => setFilterRole(r)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${filterRole === r ? 'bg-[#25343F] text-white shadow-md' : 'bg-[#EAEFEF] text-slate-500 hover:text-[#25343F]'}`}
                  >
                    {r === 'all' ? 'All Roles' : r}
                  </button>
                ))}
              </div>
            </div>
        </div>
      )}

      
      <div className="overflow-hidden rounded-xl border border-[#BFC9D1] bg-white shadow-sm overflow-x-auto mb-10">
        <table className="min-w-full divide-y divide-[#EAEFEF] text-left">
          <thead className="bg-[#EAEFEF]/30">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Identity</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tier</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">System Role</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Enrollment</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Validation</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEFEF] bg-white text-sm">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-6 border-b border-[#EAEFEF]">
                     <div className="h-4 bg-[#EAEFEF] rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : filteredUsers.map((user) => (
              <tr key={user._id} className="hover:bg-[#EAEFEF]/20 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-[#25343F] flex items-center justify-center text-white font-bold mr-3 text-xs shadow-sm shadow-blue-900/10">
                       {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                       <p className="font-bold text-[#25343F]">{user.email}</p>
                       <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user._id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase border ${user.tier === 'premium' ? 'border-orange-200 bg-orange-50 text-[#FF9B51]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      <Shield size={10} className="mr-1.5" />
                      {user.tier}
                   </div>
                </td>
                <td className="px-6 py-4 capitalize font-semibold text-slate-600">
                  <div className="flex items-center">
                    {user.role === 'admin' ? <UserCheck size={14} className="text-[#25343F] mr-2" /> : <Users size={14} className="text-slate-400 mr-2" />}
                    {user.role}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">
                   <div className="flex items-center text-xs">
                      <Calendar size={12} className="mr-2 opacity-60" />
                      {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                   </div>
                </td>
                <td className="px-6 py-4">
                   {user.isVerified ? (
                     <div className="flex items-center text-emerald-600 font-bold text-[10px] tracking-widest uppercase bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                        <CheckCircle size={10} className="mr-1.5" /> Verified
                     </div>
                   ) : (
                     <div className="flex items-center text-amber-600 font-bold text-[10px] tracking-widest uppercase bg-amber-50 px-2 py-1 rounded border border-amber-100">
                        <Clock size={10} className="mr-1.5" /> Pending
                     </div>
                   )}
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                      <button 
                        onClick={() => handleOpenEdit(user)}
                        className="p-2 text-slate-400 hover:text-[#25343F] transition-colors rounded-lg hover:bg-white border border-transparent hover:border-[#BFC9D1]"
                      >
                         <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user._id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-100"
                      >
                         <Trash2 size={16} />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#25343F]/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#BFC9D1] flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b border-[#EAEFEF] flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-bold">{modalMode === "create" ? "Enroll User" : "Update Profile"}</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure administrative access and membership parameters.</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-[#25343F] transition-all">
                    <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Identifier (Email)</label>
                    <div className="relative">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                       <input 
                         type="email" 
                         required
                         placeholder="user@example.com"
                         className="w-full pl-10 pr-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#FF9B51] transition-all"
                         value={formData.email}
                         onChange={(e) => setFormData({...formData, email: e.target.value})}
                       />
                    </div>
                 </div>

                 {modalMode === "create" && (
                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Initialization Password</label>
                      <div className="relative">
                         <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                         <input 
                           type="password" 
                           required
                           placeholder="••••••••"
                           className="w-full pl-10 pr-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#FF9B51] transition-all"
                           value={formData.password}
                           onChange={(e) => setFormData({...formData, password: e.target.value})}
                         />
                      </div>
                   </div>
                 )}

                 {modalMode === "edit" && (
                   <div className="bg-amber-50 p-4 border border-amber-100 rounded-xl">
                      <div className="flex items-start">
                         <Clock size={16} className="text-amber-500 mr-3 mt-0.5" />
                         <p className="text-[10px] text-amber-700 font-medium leading-relaxed uppercase tracking-wide">
                            Leave the password field empty unless you intend to perform an administrative override of the user's current access key.
                         </p>
                      </div>
                      <div className="relative mt-4">
                         <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-300" />
                         <input 
                           type="password" 
                           placeholder="Override Password (Optional)"
                           className="w-full pl-10 pr-4 py-3 bg-white border border-amber-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                           value={formData.password}
                           onChange={(e) => setFormData({...formData, password: e.target.value})}
                         />
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">System Role</label>
                       <select 
                         className="w-full px-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#FF9B51] appearance-none cursor-pointer"
                         value={formData.role}
                         onChange={(e) => setFormData({...formData, role: e.target.value})}
                       >
                          <option value="user">Standard User</option>
                          <option value="admin">Administrator</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Membership Tier</label>
                       <select 
                         className="w-full px-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#FF9B51] appearance-none cursor-pointer"
                         value={formData.tier}
                         onChange={(e) => setFormData({...formData, tier: e.target.value})}
                       >
                          <option value="free">Free Tier</option>
                          <option value="premium">Premium Access</option>
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center space-x-4 pt-4">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Account</label>
                       <button 
                         type="button"
                         onClick={() => setFormData({...formData, isVerified: !formData.isVerified})}
                         className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isVerified ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-slate-200'}`}
                       >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isVerified ? 'translate-x-6' : 'translate-x-1'}`} />
                       </button>
                    </div>
                 </div>

                 {formData.tier === "premium" && (
                    <div className="animate-in zoom-in-95 duration-150">
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Subscription Expiry Date</label>
                       <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                          <input 
                            type="date" 
                            className="w-full pl-10 pr-4 py-3 bg-[#EAEFEF]/30 border border-[#BFC9D1] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#FF9B51] transition-all"
                            value={formData.expiryDate}
                            onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                          />
                       </div>
                    </div>
                 )}
              </form>

              <div className="p-8 bg-[#EAEFEF]/30 border-t border-[#BFC9D1] flex justify-end space-x-3">
                 <button 
                   type="button"
                   onClick={() => setShowModal(false)}
                   className="px-6 py-2.5 rounded-xl border border-[#BFC9D1] font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-white transition-all"
                 >
                    Cancel
                 </button>
                 <button 
                   onClick={handleSubmit}
                   className="px-8 py-2.5 rounded-xl bg-[#25343F] text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-blue-950/20 transition-all"
                 >
                    {modalMode === "create" ? "Finalize Enrollment" : "Apply Changes"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
