export interface Product {
  id: string;
  barcode: string;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  category_id: string;
  category?: Category;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  tax_rate: number;
  discount_percent: number;
  image_url?: string;
  supplier_id?: string;
  is_active: boolean;
  expiry_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  total: number;
  cost_price?: number;
  profit?: number;
}

export interface Sale {
  id: string;
  receipt_number: string;
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  total_profit?: number;
  payment_method: "mpesa" | "cash" | "card" | "split";
  payment_status: "pending" | "completed" | "failed" | "refunded";
  split_payments?: {
    method: "cash" | "mpesa" | "card";
    amount: number;
    reference?: string;
  }[];
  mpesa_transaction_id?: string;
  customer_phone?: string;
  customer_id?: string;
  customer?: Customer;
  points_earned?: number;
  points_redeemed?: number;
  cashier_id: string;
  cashier?: User;
  branch_id?: string | null;
  branch?: Branch;
  notes?: string;
  loyalty?: {
    points_earned: number;
    points_redeemed: number;
    final_points_balance: number;
  };
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "cashier" | "manager";
  approval_status?: "approved" | "pending_admin" | "pending_manager" | "rejected";
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  branch_id?: string | null;
  branch?: Branch;
  created_at: string;
}

export interface MpesaTransaction {
  id: string;
  sale_id: string;
  merchant_request_id: string;
  checkout_request_id: string;
  phone_number: string;
  amount: number;
  status: "pending" | "success" | "failed";
  result_code?: number;
  result_desc?: string;
  mpesa_receipt_number?: string;
  transaction_date?: string;
  created_at: string;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  product?: Product;
  type: "sale" | "purchase" | "adjustment" | "return";
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface DailyReport {
  date: string;
  total_sales: number;
  total_transactions: number;
  total_items_sold: number;
  average_transaction_value: number;
  mpesa_total: number;
  cash_total: number;
  tax_total: number;
  discount_total: number;
}

export interface AppSettings {
  id: string;
  shop_name: string;
  shop_address?: string;
  shop_phone?: string;
  shop_email?: string;
  shop_logo_url?: string;
  tax_rate: number;
  currency: string;
  receipt_footer?: string;
  mpesa_enabled: boolean;
  dark_mode_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

export type PaymentMethod = "mpesa" | "cash" | "card" | "split";
export type SaleStatus = "pending" | "completed" | "failed" | "refunded";
export type UserRole = "admin" | "cashier" | "manager";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points_balance: number;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  customer_id: string;
  sale_id?: string;
  type: "earn" | "redeem" | "expire" | "adjust" | "void_earn" | "void_redeem";
  points: number;
  balance_after: number;
  reference?: string;
  created_at: string;
  sale?: { receipt_number: string };
}

