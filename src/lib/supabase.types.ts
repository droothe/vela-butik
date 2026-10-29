export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tag: "Yeni" | "Çok Satan" | "İndirim" | null;
  price: number;
  original_price: number | null;
  colors: string[];
  sizes: string[];
  image_url: string | null;
  hover_image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  address: string;
  city: string;
  district: string;
  notes: string | null;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  payment_method: "cash_on_delivery";
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  created_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      products: Table<
        ProductRow,
        Omit<ProductRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      orders: Table<OrderRow, never, Partial<Pick<OrderRow, "status">>>;
      order_items: Table<OrderItemRow, never, never>;
      user_roles: Table<
        { user_id: string; role: "admin"; created_at: string },
        { user_id: string; role?: "admin"; created_at?: string },
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      place_order: {
        Args: {
          p_customer_name: string;
          p_customer_email: string | null;
          p_customer_phone: string;
          p_address: string;
          p_city: string;
          p_district: string;
          p_notes: string | null;
          p_items: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
