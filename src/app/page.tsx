"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  UserCheck,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Sun,
  Moon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, useUIStore } from "@/store";

import dynamic from "next/dynamic";
import { AppLoadingSkeleton } from "@/components/ui/Skeleton";

const POSScreen = dynamic(() => import("@/components/pos/POSScreen"), { ssr: false, loading: () => <AppLoadingSkeleton /> });
const AdminDashboard = dynamic(() => import("@/components/admin/AdminDashboard"), { ssr: false, loading: () => <AppLoadingSkeleton /> });
const InventoryManagement = dynamic(() => import("@/components/inventory/InventoryManagement"), { ssr: false, loading: () => <AppLoadingSkeleton /> });
const Reports = dynamic(() => import("@/components/reports/Reports"), { ssr: false, loading: () => <AppLoadingSkeleton /> });
const SettingsPage = dynamic(() => import("@/components/settings/SettingsPage"), { ssr: false, loading: () => <AppLoadingSkeleton /> });
const AuthPage = dynamic(() => import("@/components/auth/AuthPage"), { ssr: false, loading: () => <AppLoadingSkeleton /> });
const UserApprovals = dynamic(() => import("@/components/admin/UserApprovals"), { ssr: false, loading: () => <AppLoadingSkeleton /> });
const AuditLog = dynamic(() => import("@/components/admin/AuditLog"), { ssr: false, loading: () => <AppLoadingSkeleton /> });
const CustomersPage = dynamic(() => import("@/components/customers/CustomersPage"), { ssr: false, loading: () => <AppLoadingSkeleton /> });


const NAV_ITEMS = [
  { id: "pos", label: "Point of Sale", icon: ShoppingCart, roles: ["admin", "cashier", "manager"] },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
  { id: "inventory", label: "Inventory", icon: Package, roles: ["admin", "manager"] },
  { id: "customers", label: "Customers", icon: Users, roles: ["admin", "cashier", "manager"] },
  { id: "reports", label: "Reports", icon: BarChart3, roles: ["admin", "manager"] },
  { id: "approvals", label: "Approvals", icon: UserCheck, roles: ["admin", "manager"] },
  { id: "audit", label: "Audit Log", icon: ClipboardList, roles: ["admin"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set());
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    darkMode,
    toggleDarkMode,
    activeTab,
    setActiveTab,
  } = useUIStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setMountedTabs((prev) => {
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  if (!isMounted) {
    return <AppLoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return <AuthPage darkMode={darkMode} onAuthenticated={setUser} />;
  }

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role || "cashier"));

  const isTabActive = (id: string) => activeTab === id;
  const isTabMounted = (id: string) => mountedTabs.has(id);

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
            onClick={() => toggleSidebar()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
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
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col h-screen">
        {/* Mobile Header (Hidden on POS tab because POS Screen has its own custom header) */}
        {activeTab !== "pos" && (
          <header className="lg:hidden h-16 bg-white dark:bg-pos-card border-b border-gray-200 dark:border-pos-border flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleSidebar()}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {NAV_ITEMS.find((item) => item.id === activeTab)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-hidden relative">
          {/* We keep visited tabs mounted in the DOM and just toggle their visibility. 
              This makes switching between pages 100% instantaneous. */}
          {isTabMounted("pos") && (
            <div className={cn("absolute inset-0 overflow-hidden animate-fade-in", !isTabActive("pos") && "hidden")}>
              <POSScreen />
            </div>
          )}
          {isTabMounted("dashboard") && (
            <div className={cn("absolute inset-0 overflow-hidden animate-fade-in", !isTabActive("dashboard") && "hidden")}>
              <AdminDashboard />
            </div>
          )}
          {isTabMounted("inventory") && (
            <div className={cn("absolute inset-0 overflow-hidden animate-fade-in", !isTabActive("inventory") && "hidden")}>
              <InventoryManagement />
            </div>
          )}
          {isTabMounted("customers") && (
            <div className={cn("absolute inset-0 overflow-hidden animate-fade-in", !isTabActive("customers") && "hidden")}>
              <CustomersPage />
            </div>
          )}
          {isTabMounted("reports") && (
            <div className={cn("absolute inset-0 overflow-hidden animate-fade-in", !isTabActive("reports") && "hidden")}>
              <Reports />
            </div>
          )}
          {isTabMounted("approvals") && user && (
            <div className={cn("absolute inset-0 overflow-hidden animate-fade-in", !isTabActive("approvals") && "hidden")}>
              <UserApprovals user={user} />
            </div>
          )}
          {isTabMounted("audit") && user && (
            <div className={cn("absolute inset-0 overflow-hidden animate-fade-in", !isTabActive("audit") && "hidden")}>
              <AuditLog user={user} />
            </div>
          )}
          {isTabMounted("settings") && (
            <div className={cn("absolute inset-0 overflow-hidden animate-fade-in", !isTabActive("settings") && "hidden")}>
              <SettingsPage />
            </div>
          )}
        </div>
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
