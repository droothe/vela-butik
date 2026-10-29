import olive from "@/assets/p-olive.jpg";
import orange from "@/assets/p-orange.jpg";
import cardigan from "@/assets/p-cardigan.jpg";
import blue from "@/assets/p-blue.jpg";
import jacket from "@/assets/p-jacket.jpg";
import beige from "@/assets/p-beige.jpg";
import navy from "@/assets/p-navy.jpg";

export const FREE_SHIPPING_THRESHOLD = 1500;

export const PRODUCT_CATEGORIES = [
  "Gömlek",
  "Ceket & Mont",
  "Polar & Sweatshirt",
  "Triko & Kazak",
] as const;

export const CATEGORIES = [
  ...PRODUCT_CATEGORIES,
  "Yeni Gelenler",
  "İndirim",
] as const;

export const COLORS: Record<string, string> = {
  Bej: "oklch(0.88 0.03 80)",
  "Haki Yeşil": "oklch(0.45 0.06 130)",
  Lacivert: "oklch(0.3 0.07 260)",
  Kiremit: "oklch(0.6 0.15 45)",
  "Açık Mavi": "oklch(0.82 0.06 240)",
  Bordo: "oklch(0.35 0.1 15)",
  Siyah: "oklch(0.2 0 0)",
};

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

export type Product = {
  id: string;
  title: string;
  category: (typeof PRODUCT_CATEGORIES)[number];
  tag?: "Yeni" | "Çok Satan" | "İndirim";
  price: number;
  oldPrice?: number;
  colors: string[];
  sizes: string[];
  image: string;
  hover: string;
  added: number;
};

export const PRODUCTS: Product[] = [
  { id: "1", title: "Yarım Fermuarlı Dik Yaka Selanik Kazak", category: "Triko & Kazak", tag: "Çok Satan", price: 899, oldPrice: 1299, colors: ["Haki Yeşil", "Açık Mavi", "Lacivert"], sizes: ["S", "M", "L", "XL"], image: olive, hover: blue, added: 5 },
  { id: "2", title: "Hakim Yaka Keten Gömlek", category: "Gömlek", tag: "Yeni", price: 749, colors: ["Kiremit", "Bej"], sizes: ["M", "L", "XL", "XXL"], image: orange, hover: beige, added: 9 },
  { id: "3", title: "Düğmeli Triko Hırka", category: "Triko & Kazak", tag: "İndirim", price: 849, oldPrice: 1199, colors: ["Bordo", "Lacivert"], sizes: ["S", "M", "L"], image: cardigan, hover: navy, added: 3 },
  { id: "4", title: "Kapitone Kadife Yaka Mont", category: "Ceket & Mont", tag: "Yeni", price: 1899, colors: ["Siyah", "Haki Yeşil"], sizes: ["M", "L", "XL", "XXL"], image: jacket, hover: beige, added: 10 },
  { id: "5", title: "Fitilli Kadife Gömlek Ceket", category: "Ceket & Mont", tag: "Çok Satan", price: 1149, oldPrice: 1499, colors: ["Bej", "Bordo"], sizes: ["S", "M", "L", "XL"], image: beige, hover: jacket, added: 7 },
  { id: "6", title: "Uzun Kollu Pike Polo", category: "Polar & Sweatshirt", price: 649, colors: ["Lacivert", "Siyah"], sizes: ["S", "M", "L", "XL", "XXL"], image: navy, hover: olive, added: 6 },
  { id: "7", title: "Yarım Fermuarlı Kaşmir Hissi Kazak", category: "Triko & Kazak", tag: "Yeni", price: 999, colors: ["Açık Mavi", "Bej"], sizes: ["M", "L", "XL"], image: blue, hover: olive, added: 8 },
  { id: "8", title: "Selanik Örgü Hırka", category: "Polar & Sweatshirt", tag: "İndirim", price: 799, oldPrice: 1099, colors: ["Bordo", "Haki Yeşil"], sizes: ["S", "M", "L", "XL"], image: cardigan, hover: orange, added: 2 },
];

export const LEGACY_PRODUCT_IMAGES: Record<string, { image: string; hover: string }> = {
  "legacy-1": { image: olive, hover: blue },
  "legacy-2": { image: orange, hover: beige },
  "legacy-3": { image: cardigan, hover: navy },
  "legacy-4": { image: jacket, hover: beige },
  "legacy-5": { image: beige, hover: jacket },
  "legacy-6": { image: navy, hover: olive },
  "legacy-7": { image: blue, hover: olive },
  "legacy-8": { image: cardigan, hover: orange },
};

export const formatTL = (n: number) => `${n.toLocaleString("tr-TR")} TL`;

export function remainingForFreeShipping(subtotal: number) {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}
