"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, CartItem, User, AppSettings, Customer, Branch } from "@/types";
import { calculateCartTotals } from "@/lib/utils";

export interface LastScannedProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  image_url?: string;
  scannedAt: string;
}

interface CartState {
  items: CartItem[];
  selectedCustomer: Customer | null;
  pointsRedeemed: number;
  lastScannedProduct: LastScannedProduct | null;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  getTotals: () => { subtotal: number; taxAmount: number; discountAmount: number; total: number };
  getItemCount: () => number;
  setSelectedCustomer: (customer: Customer | null) => void;
  setPointsRedeemed: (points: number) => void;
  setLastScannedProduct: (product: LastScannedProduct | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedCustomer: null,
      pointsRedeemed: 0,
      lastScannedProduct: null,
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.product.id === product.id);
          const scanned: LastScannedProduct = {
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            price: product.price,
            image_url: product.image_url,
            scannedAt: new Date().toISOString(),
          };
          if (existingItem) {
            return {
              lastScannedProduct: scanned,
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                      total: (item.quantity + quantity) * item.product.price,
                    }
                  : item
              ),
            };
          }
          return {
            lastScannedProduct: scanned,
            items: [
              ...state.items,
              { product, quantity, discount: 0, total: quantity * product.price },
            ],
          };
        });
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity, total: quantity * item.product.price }
              : item
          ),
        }));
      },
      updateDiscount: (productId, discount) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, discount } : item
          ),
        }));
      },
      clearCart: () => set({ items: [], selectedCustomer: null, pointsRedeemed: 0, lastScannedProduct: null }),
      setLastScannedProduct: (product) => set({ lastScannedProduct: product }),
      getTotals: () => calculateCartTotals(get().items),
      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer, pointsRedeemed: 0 }),
      setPointsRedeemed: (points) => set({ pointsRedeemed: points }),
    }),
    {
      name: "pos-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "pos-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  activeScreen: "pos" | "inventory" | "reports" | "settings" | "admin";
  customerDisplay: boolean;
  activeTab: string;
  themeColor: string;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveScreen: (screen: UIState["activeScreen"]) => void;
  toggleCustomerDisplay: () => void;
  setActiveTab: (tab: string) => void;
  setThemeColor: (color: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      sidebarOpen: true,
      activeScreen: "pos",
      customerDisplay: false,
      activeTab: "pos",
      themeColor: "blue",
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActiveScreen: (screen) => set({ activeScreen: screen }),
      toggleCustomerDisplay: () =>
        set((state) => ({ customerDisplay: !state.customerDisplay })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setThemeColor: (color) => set({ themeColor: color }),
    }),
    {
      name: "pos-ui",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface SettingsState {
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: null,
      setSettings: (settings) => set({ settings }),
    }),
    {
      name: "pos-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface OfflineState {
  isOnline: boolean;
  pendingTransactions: unknown[];
  setOnline: (online: boolean) => void;
  addPendingTransaction: (transaction: unknown) => void;
  removePendingTransaction: (id: string) => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: true,
      pendingTransactions: [],
      setOnline: (online) => set({ isOnline: online }),
      addPendingTransaction: (transaction) =>
        set((state) => ({
          pendingTransactions: [...state.pendingTransactions, transaction],
        })),
      removePendingTransaction: (id) =>
        set((state) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pendingTransactions: state.pendingTransactions.filter((t: any) => t.id !== id),
        })),
    }),
    {
      name: "pos-offline",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

import { supabase } from "@/lib/supabase";

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  subscribeToRealtime: () => () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const currentBranchId = useBranchStore.getState().currentBranchId;

      // 1. Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (productsError) throw productsError;

      let updatedProducts = (productsData || []) as Product[];

      if (currentBranchId) {
        // 2. Fetch stock for the selected branch
        const { data: stockData, error: stockError } = await supabase
          .from('branch_stock')
          .select('*')
          .eq('branch_id', currentBranchId);

        if (stockError) throw stockError;

        // Map product_id -> stock_quantity
        const stockMap = new Map((stockData || []).map(s => [s.product_id, s.stock_quantity]));

        // Override product stock_quantity with branch stock quantity
        // Fall back to product's default stock_quantity if no branch_stock entry exists
        updatedProducts = updatedProducts.map(p => ({
          ...p,
          stock_quantity: stockMap.has(p.id) ? stockMap.get(p.id)! : p.stock_quantity,
        }));
      } else {
        // Aggregate stock from branch_stock
        const { data: stockData, error: stockError } = await supabase
          .from('branch_stock')
          .select('*');

        if (!stockError && stockData) {
          const stockMap = new Map<string, number>();
          for (const s of (stockData || [])) {
            const current = stockMap.get(s.product_id) ?? 0;
            stockMap.set(s.product_id, current + s.stock_quantity);
          }
          
          updatedProducts = updatedProducts.map(p => ({
            ...p,
            stock_quantity: stockMap.has(p.id) ? stockMap.get(p.id)! : p.stock_quantity,
          }));
        }
      }
      
      set({ products: updatedProducts, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching products:', error);
      set({ error: error.message, isLoading: false });
    }
  },
  subscribeToRealtime: () => {
    const id = Math.random().toString(36).substring(7);
    
    // Subscribe to branch_stock changes (stock updates from any device)
    const stockChannel = supabase
      .channel(`branch_stock_realtime_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branch_stock' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const currentBranchId = useBranchStore.getState().currentBranchId;
          
          set((state) => {
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              if (!newRecord) return state;
              // Only update local state if it matches the currently viewed branch
              if (currentBranchId && newRecord.branch_id !== currentBranchId) {
                return state;
              }
              const productId = newRecord.product_id;
              const newStock = newRecord.stock_quantity;
              
              return {
                products: state.products.map(p => 
                  p.id === productId ? { ...p, stock_quantity: newStock } : p
                )
              };
            } else if (eventType === 'DELETE') {
              if (!oldRecord) return state;
              if (currentBranchId && oldRecord.branch_id !== currentBranchId) {
                return state;
              }
              const productId = oldRecord.product_id;
              return {
                products: state.products.map(p => 
                  p.id === productId ? { ...p, stock_quantity: 0 } : p
                )
              };
            }
            return state;
          });
        }
      )
      .subscribe();

    // Subscribe to products table changes (product edits, new products, deletes)
    const productsChannel = supabase
      .channel(`products_realtime_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          set((state) => {
            if (eventType === 'INSERT' && newRecord) {
              return { 
                products: [...state.products, newRecord as Product].sort((a, b) => a.name.localeCompare(b.name)) 
              };
            } else if (eventType === 'UPDATE' && newRecord) {
              return {
                products: state.products.map(p => p.id === newRecord.id ? { ...p, ...newRecord } : p).sort((a, b) => a.name.localeCompare(b.name))
              };
            } else if (eventType === 'DELETE' && oldRecord) {
              return { 
                products: state.products.filter(p => p.id !== oldRecord.id) 
              };
            }
            return state;
          });
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(productsChannel);
    };
  },
}));

interface StaffState {
  staff: User[];
  addStaff: (user: User) => void;
  updateStaff: (id: string, user: Partial<User>) => void;
  deleteStaff: (id: string) => void;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      staff: [
        {
          id: "1",
          email: "admin@supermarket.local",
          full_name: "System Admin",
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString()
        }
      ],
      addStaff: (user) => set((state) => ({ staff: [...state.staff, user] })),
      updateStaff: (id, user) => set((state) => ({
        staff: state.staff.map(s => s.id === id ? { ...s, ...user } : s)
      })),
      deleteStaff: (id) => set((state) => ({
        staff: state.staff.filter(s => s.id !== id)
      })),
    }),
    {
      name: "pos-staff",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface BranchState {
  currentBranchId: string | null;
  branches: Branch[];
  isLoadingBranches: boolean;
  setCurrentBranch: (branchId: string | null) => void;
  fetchBranches: () => Promise<void>;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      currentBranchId: null,
      branches: [],
      isLoadingBranches: false,
      setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),
      fetchBranches: async () => {
        set({ isLoadingBranches: true });
        try {
          const res = await fetch("/api/branches");
          if (!res.ok) throw new Error("Failed to fetch branches");
          const data = await res.json();
          const activeBranches: Branch[] = (data.branches ?? []).filter((b: Branch) => b.is_active);
          set({ branches: activeBranches, isLoadingBranches: false });
        } catch {
          set({ isLoadingBranches: false });
        }
      },
    }),
    {
      name: "pos-branch",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export interface Shift {
  id: string;
  branch_id?: string;
  cashier_id: string;
  starting_cash: number;
  expected_cash: number;
  actual_cash?: number;
  difference?: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

interface ShiftState {
  activeShift: Shift | null;
  setActiveShift: (shift: Shift | null) => void;
  openShift: (cashier_id: string, starting_cash: number, branch_id?: string) => Promise<void>;
  closeShift: (shift_id: string, actual_cash: number) => Promise<void>;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      activeShift: null,
      setActiveShift: (shift) => set({ activeShift: shift }),
      openShift: async (cashier_id, starting_cash, branch_id) => {
        const res = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cashier_id, starting_cash, branch_id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to open shift");
        set({ activeShift: data.shift });
      },
      closeShift: async (shift_id, actual_cash) => {
        const res = await fetch("/api/shifts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shift_id, actual_cash })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to close shift");
        set({ activeShift: null }); // Clear active shift once closed
      }
    }),
    {
      name: "pos-shift",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
