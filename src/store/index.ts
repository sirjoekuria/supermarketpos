"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, CartItem, User, AppSettings } from "@/types";
import { calculateCartTotals } from "@/lib/utils";

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  getTotals: () => { subtotal: number; taxAmount: number; discountAmount: number; total: number };
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.product.id === product.id);
          if (existingItem) {
            return {
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
      clearCart: () => set({ items: [] }),
      getTotals: () => calculateCartTotals(get().items),
      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  activeScreen: "pos" | "inventory" | "reports" | "settings" | "admin";
  customerDisplay: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveScreen: (screen: UIState["activeScreen"]) => void;
  toggleCustomerDisplay: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      sidebarOpen: true,
      activeScreen: "pos",
      customerDisplay: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActiveScreen: (screen) => set({ activeScreen: screen }),
      toggleCustomerDisplay: () =>
        set((state) => ({ customerDisplay: !state.customerDisplay })),
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

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
}));

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
