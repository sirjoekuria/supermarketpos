"use client";

import { useState } from "react";
import { Save, Building2, Receipt, Palette, Shield } from "lucide-react";
import { useSettingsStore, useUIStore } from "@/store";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { settings, setSettings } = useSettingsStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  
  const [shopName, setShopName] = useState(settings?.shop_name || "SuperMarket POS");
  const [shopAddress, setShopAddress] = useState(settings?.shop_address || "");
  const [shopPhone, setShopPhone] = useState(settings?.shop_phone || "");
  const [taxRate, setTaxRate] = useState(settings?.tax_rate?.toString() || "16");
  const [receiptFooter, setReceiptFooter] = useState(settings?.receipt_footer || "Thank you for shopping with us!");
  
  const handleSave = () => {
    // In a real app, this would save to Supabase
    setSettings({
      id: settings?.id || "1",
      shop_name: shopName,
      shop_address: shopAddress,
      shop_phone: shopPhone,
      shop_email: settings?.shop_email || "",
      shop_logo_url: settings?.shop_logo_url || "",
      tax_rate: parseFloat(taxRate) || 16,
      currency: settings?.currency || "KES",
      receipt_footer: receiptFooter,
      mpesa_enabled: settings?.mpesa_enabled ?? true,
      dark_mode_default: settings?.dark_mode_default ?? false,
      created_at: settings?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    alert("Settings saved successfully!");
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6 overflow-y-auto h-full">
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure your POS system preferences</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="md:col-span-1 space-y-2">
          {[
            { id: "general", label: "General Information", icon: Building2 },
            { id: "receipts", label: "Receipt Configuration", icon: Receipt },
            { id: "appearance", label: "Appearance", icon: Palette },
            { id: "security", label: "Security & Roles", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                tab.id === "general"
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* General Info */}
          <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-400" />
              Store Information
            </h3>
            
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Receipt Settings */}
          <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" />
              Receipt Configuration
            </h3>
            
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Footer Message</label>
                <textarea
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  placeholder="Thank you for your business!"
                />
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-gray-400" />
              Appearance
            </h3>
            
            <div className="flex items-center justify-between mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
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
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    darkMode ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
