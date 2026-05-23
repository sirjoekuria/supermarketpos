"use client";

import { useState } from "react";
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, useUIStore } from "@/store";

import POSScreen from "@/components/pos/POSScreen";
import AdminDashboard from "@/components/admin/AdminDashboard";
import InventoryManagement from "@/components/inventory/InventoryManagement";
import Reports from "@/components/reports/Reports";
import SettingsPage from "@/components/settings/SettingsPage";

const NAV_ITEMS = [
  { id: "pos", label: "Point of Sale", icon: ShoppingCart, roles: ["admin", "cashier", "manager"] },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
  { id: "inventory", label: "Inventory", icon: Package, roles: ["admin", "manager"] },
  { id: "reports", label: "Reports", icon: BarChart3, roles: ["admin", "manager"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("pos");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const { darkMode } = useUIStore();

  if (!isAuthenticated) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center bg-gray-50 dark:bg-pos-dark p-4", darkMode && "dark")}>
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-pos-card rounded-2xl shadow-xl border border-gray-200 dark:border-pos-border p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-500 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SuperMarket POS</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setUser({ id: "1", email: "admin@pos.com", full_name: "Admin User", role: "admin", is_active: true, created_at: "" })}
                className="w-full flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">A</div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Admin</p>
                  <p className="text-xs text-gray-500">Full system access</p>
                </div>
              </button>
              <button
                onClick={() => setUser({ id: "2", email: "cashier@pos.com", full_name: "John Doe", role: "cashier", is_active: true, created_at: "" })}
                className="w-full flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">C</div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Cashier</p>
                  <p className="text-xs text-gray-500">POS and checkout access</p>
                </div>
              </button>
              <button
                onClick={() => setUser({ id: "3", email: "manager@pos.com", full_name: "Jane Smith", role: "manager", is_active: true, created_at: "" })}
                className="w-full flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">M</div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Manager</p>
                  <p className="text-xs text-gray-500">Reports and inventory access</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role || "cashier"));

  const renderContent = () => {
    switch (activeTab) {
      case "pos": return <POSScreen />;
      case "dashboard": return <AdminDashboard />;
      case "inventory": return <InventoryManagement />;
      case "reports": return <Reports />;
      case "settings": return <SettingsPage />;
      default: return <POSScreen />;
    }
  };

  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-pos-dark flex", darkMode && "dark")}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 bg-white dark:bg-pos-card border-r border-gray-200 dark:border-pos-border transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-pos-border">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">POS</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === item.id
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-pos-border">
          <button
            onClick={() => logout()}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {renderContent()}
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
