"use client";

import { useEffect, useState } from "react";
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  X,
  LogOut
} from "lucide-react";
import api from "../../lib/api";
import { format } from "date-fns";

export default function ProfilePage() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  
  // Edit email modal
  const [showEditEmail, setShowEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  
  // Change password modal  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await api.get("/admin/me");
      setAdmin(res.data);
      setNewEmail(res.data.email);
    } catch (err) {
      console.error("Failed to fetch admin profile", err);
      setError("Unable to load profile. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateEmail() {
    if (!newEmail.trim()) {
      setError("Email cannot be empty");
      return;
    }
    
    if (newEmail === admin.email) {
      setShowEditEmail(false);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await api.put("/admin/profile", { email: newEmail });
      setAdmin(prev => ({ ...prev, email: newEmail }));
      setMessage("Email updated successfully");
      setShowEditEmail(false);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to update email");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await api.post("/admin/change-password", {
        currentPassword,
        newPassword,
        confirmPassword
      });
      setMessage("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setShowChangePassword(false);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 bg-[#EAEFEF] min-h-full text-[#25343F]">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account, security, and preferences</p>
      </header>

      {/* Messages */}
      {message && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center text-emerald-800">
          <CheckCircle size={20} className="mr-3 flex-shrink-0" />
          <p className="text-sm">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-800">
          <AlertCircle size={20} className="mr-3 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="max-w-4xl space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-[#BFC9D1] h-40 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="max-w-4xl space-y-6 animate-in fade-in">
          {/* Profile Header Card */}
          <div className="bg-white rounded-lg border border-[#BFC9D1] shadow-sm overflow-hidden">
            <div className="px-8 py-8 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#FF9B51] to-[#E88A42] flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {admin?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{admin?.email}</h2>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center px-3 py-1 bg-[#EAEFEF] text-[#25343F] text-xs font-semibold rounded-full">
                    <Shield size={14} className="mr-1" />
                    {admin?.role} Account
                  </span>
                  {admin?.isVerified && (
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">
                      <CheckCircle size={14} className="mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Section */}
            <div className="bg-white rounded-lg border border-[#BFC9D1] shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Email Address</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Mail size={18} className="mr-3 text-[#FF9B51] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-1">Current Email</p>
                    <p className="text-lg font-medium break-all">{admin?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditEmail(true)}
                  className="inline-flex items-center px-4 py-2 bg-[#FF9B51] text-white rounded-md font-medium text-sm hover:bg-[#E88A42] transition-colors"
                >
                  <Mail size={14} className="mr-2" />
                  Update Email
                </button>
              </div>
            </div>

            {/* Account Created */}
            <div className="bg-white rounded-lg border border-[#BFC9D1] shadow-sm p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">Account Information</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar size={18} className="mr-3 text-[#FF9B51] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Member Since</p>
                    <p className="text-sm font-medium mt-1">
                      {format(new Date(admin?.createdAt), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-lg border border-[#BFC9D1] shadow-sm p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-6 pb-4 border-b border-[#BFC9D1]">
              Security Settings
            </h3>
            <div className="space-y-4">
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-[#BFC9D1] hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center">
                  <Lock size={18} className="mr-4 text-[#FF9B51]" />
                  <div className="text-left">
                    <p className="font-medium text-[#25343F]">Change Password</p>
                    <p className="text-xs text-slate-500 mt-0.5">Update your login password</p>
                  </div>
                </div>
                <div className="text-slate-400">&rarr;</div>
              </button>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="bg-white rounded-lg border border-[#BFC9D1] shadow-sm p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">
              Admin ID
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={admin?._id || ""}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-50 border border-[#BFC9D1] rounded-md text-xs font-mono text-slate-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Email Modal */}
      {showEditEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-[#BFC9D1] shadow-xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Update Email Address</h2>
              <button
                onClick={() => setShowEditEmail(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  New Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-[#BFC9D1] rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9B51]"
                  placeholder="your@email.com"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditEmail(false)}
                  className="flex-1 px-4 py-2 border border-[#BFC9D1] rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateEmail}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-[#FF9B51] text-white rounded-lg font-medium hover:bg-[#E88A42] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-[#BFC9D1] shadow-xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Change Password</h2>
              <button
                onClick={() => setShowChangePassword(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-[#BFC9D1] rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9B51]"
                    placeholder="Enter current password"
                  />
                  <button
                    onClick={() =>
                      setShowPasswords(prev => ({ ...prev, current: !prev.current }))
                    }
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-[#BFC9D1] rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9B51]"
                    placeholder="Enter new password"
                  />
                  <button
                    onClick={() =>
                      setShowPasswords(prev => ({ ...prev, new: !prev.new }))
                    }
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-[#BFC9D1] rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9B51]"
                    placeholder="Confirm new password"
                  />
                  <button
                    onClick={() =>
                      setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))
                    }
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 px-4 py-2 border border-[#BFC9D1] rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-[#FF9B51] text-white rounded-lg font-medium hover:bg-[#E88A42] transition-colors disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
