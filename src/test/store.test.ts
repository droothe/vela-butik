import { describe, expect, it } from "vitest";

import { PRODUCTS } from "@/lib/catalog";
import { productFromRow } from "@/lib/store";
import type { ProductRow } from "@/lib/supabase.types";

describe("Supabase catalog mapping", () => {
  it("uses the existing storefront images for seeded products", () => {
    const seedProduct = PRODUCTS[0];
    if (!seedProduct) throw new Error("Expected an initial storefront product.");
    const row: ProductRow = {
      id: "product-id",
      slug: "legacy-1",
      name: seedProduct.title,
      category: seedProduct.category,
      tag: seedProduct.tag ?? null,
      price: seedProduct.price,
      original_price: seedProduct.oldPrice ?? null,
      colors: seedProduct.colors,
      sizes: seedProduct.sizes,
      image_url: null,
      hover_image_url: null,
      stock_quantity: 20,
      is_active: true,
      sort_order: seedProduct.added,
      created_at: "2026-10-29T00:00:00.000Z",
      updated_at: "2026-10-29T00:00:00.000Z",
    };

    expect(productFromRow(row)).toMatchObject({
      id: "product-id",
      title: seedProduct.title,
      image: seedProduct.image,
      hover: seedProduct.hover,
    });
  });
});
