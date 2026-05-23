export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          barcode: string;
          name: string;
          description: string | null;
          price: number;
          cost_price: number | null;
          category_id: string | null;
          stock_quantity: number;
          min_stock_level: number;
          unit: string;
          tax_rate: number;
          discount_percent: number;
          image_url: string | null;
          supplier_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["products"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string | null;
          created_at: string;
        };
      };
      sales: {
        Row: {
          id: string;
          receipt_number: string;
          items: Json;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total: number;
          payment_method: string;
          payment_status: string;
          mpesa_transaction_id: string | null;
          customer_phone: string | null;
          cashier_id: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
        };
      };
      mpesa_transactions: {
        Row: {
          id: string;
          sale_id: string;
          merchant_request_id: string;
          checkout_request_id: string;
          phone_number: string;
          amount: number;
          status: string;
          result_code: number | null;
          result_desc: string | null;
          mpesa_receipt_number: string | null;
          transaction_date: string | null;
          created_at: string;
        };
      };
      inventory_logs: {
        Row: {
          id: string;
          product_id: string;
          type: string;
          quantity: number;
          previous_stock: number;
          new_stock: number;
          reference_id: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
      };
      settings: {
        Row: {
          id: string;
          shop_name: string;
          shop_address: string | null;
          shop_phone: string | null;
          shop_email: string | null;
          shop_logo_url: string | null;
          tax_rate: number;
          currency: string;
          receipt_footer: string | null;
          mpesa_enabled: boolean;
          dark_mode_default: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          is_active: boolean;
          created_at: string;
        };
      };
    };
  };
}
