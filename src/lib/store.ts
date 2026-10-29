import { LEGACY_PRODUCT_IMAGES, PRODUCT_CATEGORIES, PRODUCTS, type Product } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";
import type { Json, OrderItemRow, OrderRow, ProductRow } from "@/lib/supabase.types";

export type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  notes: string;
};

export type OrderLineInput = {
  product_id: string;
  quantity: number;
  size: string;
  color: string;
};

export function productFromRow(row: ProductRow): Product {
  const legacyImage = LEGACY_PRODUCT_IMAGES[row.slug];
  return {
    id: row.id,
    title: row.name,
    category: PRODUCT_CATEGORIES.includes(row.category as Product["category"])
      ? (row.category as Product["category"])
      : PRODUCT_CATEGORIES[0],
    ...(row.tag ? { tag: row.tag } : {}),
    price: Number(row.price),
    ...(row.original_price === null ? {} : { oldPrice: Number(row.original_price) }),
    colors: row.colors,
    sizes: row.sizes,
    image: row.image_url ?? legacyImage?.image ?? "",
    hover: row.hover_image_url ?? legacyImage?.hover ?? row.image_url ?? "",
    added: row.sort_order,
  };
}

export async function listPublicProducts(): Promise<Product[]> {
  if (!supabase) return PRODUCTS;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: false });
  if (error) throw error;
  return data.map(productFromRow);
}

export async function listAdminProducts(): Promise<ProductRow[]> {
  if (!supabase) throw new Error("Supabase yapılandırması bulunamadı.");
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveProduct(product: ProductRow): Promise<void> {
  if (!supabase) throw new Error("Supabase yapılandırması bulunamadı.");
  const { id, created_at: _createdAt, updated_at: _updatedAt, ...fields } = product;
  const { error } = id
    ? await supabase.from("products").update(fields).eq("id", id)
    : await supabase.from("products").insert(fields);
  if (error) throw error;
}

export async function uploadProductImage(file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase yapılandırması bulunamadı.");
  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    throw new Error("Görsel dosyası 5 MB'dan küçük ve geçerli bir görsel olmalı.");
  }
  const extension = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "image";
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("products").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
}

export async function listOrders(): Promise<OrderRow[]> {
  if (!supabase) throw new Error("Supabase yapılandırması bulunamadı.");
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listOrderItems(orderId: string): Promise<OrderItemRow[]> {
  if (!supabase) throw new Error("Supabase yapılandırması bulunamadı.");
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderRow["status"],
): Promise<void> {
  if (!supabase) throw new Error("Supabase yapılandırması bulunamadı.");
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}

export async function createOrder(
  customer: CustomerDetails,
  items: OrderLineInput[],
): Promise<string> {
  if (!supabase) throw new Error("Supabase yapılandırması bulunamadı.");
  const { data, error } = await supabase.rpc("place_order", {
    p_customer_name: customer.name.trim(),
    p_customer_email: customer.email.trim() || null,
    p_customer_phone: customer.phone.trim(),
    p_address: customer.address.trim(),
    p_city: customer.city.trim(),
    p_district: customer.district.trim(),
    p_notes: customer.notes.trim() || null,
    p_items: items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
    })) satisfies Json,
  });
  if (error) throw error;
  return data;
}
