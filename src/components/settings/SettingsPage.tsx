"use client";

import { useState } from "react";
import { Save, Building2, Receipt, Palette, Shield, Users, CheckCircle2, X } from "lucide-react";
import { useSettingsStore, useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import StaffDirectory from "./StaffDirectory";

export default function SettingsPage() {
  const { settings, setSettings } = useSettingsStore();
  const { darkMode, toggleDarkMode, themeColor, setThemeColor } = useUIStore();

  const [activeTab, setActiveTab] = useState("general");
  const [shopName, setShopName] = useState(settings?.shop_name || "SuperMarket POS");
  const [shopAddress, setShopAddress] = useState(settings?.shop_address || "");
  const [shopPhone, setShopPhone] = useState(settings?.shop_phone || "");
  const [shopEmail, setShopEmail] = useState(settings?.shop_email || "");
  const [taxRate, setTaxRate] = useState(settings?.tax_rate?.toString() || "16");
  const [currency, setCurrency] = useState(settings?.currency || "KES");
  const [receiptFooter, setReceiptFooter] = useState(settings?.receipt_footer || "Thank you for shopping with us!");
  const [mpesaEnabled, setMpesaEnabled] = useState(settings?.mpesa_enabled ?? true);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const showToast = (status: "success" | "error") => {
    setSaveStatus(status);
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const handleSave = () => {
    try {
      setSettings({
        id: settings?.id || "1",
        shop_name: shopName,
        shop_address: shopAddress,
        shop_phone: shopPhone,
        shop_email: shopEmail,
        shop_logo_url: settings?.shop_logo_url || "",
        tax_rate: parseFloat(taxRate) || 16,
        currency,
        receipt_footer: receiptFooter,
        mpesa_enabled: mpesaEnabled,
        dark_mode_default: settings?.dark_mode_default ?? false,
        created_at: settings?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      showToast("success");
    } catch {
      showToast("error");
    }
  };

  const handlePinChange = () => {
    if (newPin.length < 4) { setPinError("PIN must be at least 4 digits"); return; }
    if (newPin !== confirmPin) { setPinError("PINs do not match"); return; }
    setPinError("");
    setShowPinChange(false);
    setNewPin("");
    setConfirmPin("");
    showToast("success");
  };

  const tabs = [
    { id: "general", label: "General Info", icon: Building2 },
    { id: "receipts", label: "Receipt Config", icon: Receipt },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "security", label: "Security", icon: Shield },
    { id: "staff", label: "Staff Directory", icon: Users },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6 overflow-y-auto h-full">

      {/* Toast Notification */}
      {saveStatus !== "idle" && (
        <div
          className={cn(
            "fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-top-2",
            saveStatus === "success"
              ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
          )}
        >
          {saveStatus === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <X className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          {saveStatus === "success" ? "Settings saved successfully!" : "Failed to save settings."}
        </div>
      )}

      {/* Header */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure your POS system preferences</p>
        </div>
        {activeTab !== "staff" && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Sidebar Nav */}
        <div className="md:col-span-1">
          <nav className="space-y-1 bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                  activeTab === tab.id
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-6">

          {/* General Information */}
          {activeTab === "general" && (
            <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400" />
                Store Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Store Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={shopEmail}
                    onChange={(e) => setShopEmail(e.target.value)}
                    placeholder="store@example.com"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                <textarea
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  rows={2}
                  placeholder="123 Main Street, Nairobi"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="TZS">TZS — Tanzanian Shilling</option>
                    <option value="UGX">UGX — Ugandan Shilling</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Receipt Configuration */}
          {activeTab === "receipts" && (
            <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-400" />
                Receipt Configuration
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Receipt Footer Message</label>
                <textarea
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  rows={3}
                  placeholder="Thank you for your business!"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">This message appears at the bottom of every receipt</p>
              </div>

              {/* Receipt Preview */}
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Receipt Preview</p>
                <div className="font-mono text-xs text-gray-700 dark:text-gray-300 space-y-1">
                  <p className="text-center font-bold text-sm">{shopName || "Store Name"}</p>
                  {shopAddress && <p className="text-center">{shopAddress}</p>}
                  {shopPhone && <p className="text-center">Tel: {shopPhone}</p>}
                  <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-2" />
                  <p>Item 1 × 2 .................. KES 200</p>
                  <p>Item 2 × 1 .................. KES 150</p>
                  <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-1" />
                  <p className="font-bold">TOTAL ................... KES 350</p>
                  <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-2" />
                  <p className="text-center text-gray-500 italic">{receiptFooter}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-pos-border">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">M-Pesa Payments</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enable M-Pesa STK Push for payments</p>
                </div>
                <button
                  onClick={() => setMpesaEnabled(!mpesaEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    mpesaEnabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                      mpesaEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === "appearance" && (
            <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-400" />
                Appearance
              </h3>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-pos-border">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Toggle dark theme for the entire application</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    darkMode ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                      darkMode ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-pos-border">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme Color</p>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { name: "blue", color: "bg-sky-500" },
                    { name: "green", color: "bg-emerald-500" },
                    { name: "purple", color: "bg-violet-500" },
                    { name: "orange", color: "bg-orange-500" },
                    { name: "red", color: "bg-red-500" },
                  ].map(({ name, color }) => (
                    <button
                      key={name}
                      title={name}
                      onClick={() => setThemeColor(name)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 shadow-md transition-transform",
                        color,
                        themeColor === name
                          ? "border-gray-900 dark:border-white scale-125"
                          : "border-white dark:border-gray-700 hover:scale-110"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-400" />
                Security Settings
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-pos-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">Manager PIN</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Required for voids, refunds, and discounts</p>
                    </div>
                    <button
                      onClick={() => setShowPinChange(!showPinChange)}
                      className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
                    >
                      {showPinChange ? "Cancel" : "Change PIN"}
                    </button>
                  </div>

                  {showPinChange && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New PIN</label>
                        <input
                          type="password"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          maxLength={8}
                          placeholder="Enter new PIN"
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirm PIN</label>
                        <input
                          type="password"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          maxLength={8}
                          placeholder="Confirm new PIN"
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                      {pinError && <p className="text-xs text-red-600 dark:text-red-400">{pinError}</p>}
                      <button
                        onClick={handlePinChange}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg font-medium"
                      >
                        Update PIN
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-pos-border">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Role Permissions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">Manage what each role can access</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-pos-border">
                          <th className="text-left pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Permission</th>
                          <th className="text-center pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Cashier</th>
                          <th className="text-center pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Manager</th>
                          <th className="text-center pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-pos-border">
                        {[
                          { perm: "Process Sales", cashier: true, manager: true, admin: true },
                          { perm: "Apply Discounts", cashier: false, manager: true, admin: true },
                          { perm: "Void Transactions", cashier: false, manager: true, admin: true },
                          { perm: "View Reports", cashier: false, manager: true, admin: true },
                          { perm: "Manage Inventory", cashier: false, manager: true, admin: true },
                          { perm: "Manage Staff", cashier: false, manager: false, admin: true },
                          { perm: "System Settings", cashier: false, manager: false, admin: true },
                        ].map(({ perm, cashier, manager, admin }) => (
                          <tr key={perm}>
                            <td className="py-2.5 text-gray-700 dark:text-gray-300">{perm}</td>
                            <td className="py-2.5 text-center">
                              <span className={cn("text-lg", cashier ? "text-green-500" : "text-gray-300 dark:text-gray-600")}>
                                {cashier ? "✓" : "✗"}
                              </span>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className={cn("text-lg", manager ? "text-green-500" : "text-gray-300 dark:text-gray-600")}>
                                {manager ? "✓" : "✗"}
                              </span>
                            </td>
                            <td className="py-2.5 text-center">
                              <span className={cn("text-lg", admin ? "text-green-500" : "text-gray-300 dark:text-gray-600")}>
                                {admin ? "✓" : "✗"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Staff Directory */}
          {activeTab === "staff" && (
            <StaffDirectory />
          )}

        </div>
      </div>

      {/* Mobile Save Button */}
      {activeTab !== "staff" && (
        <div className="lg:hidden">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all"
          >
            <Save className="w-4 h-4" /> Save All Changes
          </button>
        </div>
      )}
    </div>
  );
}
