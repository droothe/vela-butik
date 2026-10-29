import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";

import { formatTL, PRODUCT_CATEGORIES, SIZES, COLORS } from "@/lib/catalog";
import {
  listAdminProducts,
  listOrderItems,
  listOrders,
  saveProduct,
  updateOrderStatus,
  uploadProductImage,
} from "@/lib/store";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { OrderItemRow, OrderRow, ProductRow } from "@/lib/supabase.types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Yönetim Paneli — MODA LİFE 1908" }] }),
  component: AdminPage,
});

type ProductDraft = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tag: ProductRow["tag"];
  price: string;
  originalPrice: string;
  colors: string;
  sizes: string;
  imageUrl: string;
  hoverImageUrl: string;
  stock: string;
  active: boolean;
};

const emptyDraft: ProductDraft = {
  id: "",
  slug: "",
  name: "",
  category: PRODUCT_CATEGORIES[0],
  tag: null,
  price: "",
  originalPrice: "",
  colors: "",
  sizes: "",
  imageUrl: "",
  hoverImageUrl: "",
  stock: "0",
  active: true,
};

const orderStatuses: OrderRow["status"][] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const statusLabels: Record<OrderRow["status"], string> = {
  pending: "Yeni",
  confirmed: "Onaylandı",
  shipped: "Kargolandı",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
};

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [hoverFile, setHoverFile] = useState<File | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError(sessionError.message);
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch((sessionError: unknown) => {
        if (!active) return;
        setError(sessionError instanceof Error ? sessionError.message : String(sessionError));
        setAuthLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAdmin(null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setIsAdmin(null);
      return;
    }

    let active = true;
    setAuthLoading(true);
    void (async () => {
      try {
        const { data: adminResult, error: roleError } = await supabase.rpc("is_admin");
        if (!active) return;
        if (roleError) throw roleError;
        setIsAdmin(adminResult);
        if (!adminResult) {
          setAuthLoading(false);
          return;
        }
        const [productRows, orderRows] = await Promise.all([listAdminProducts(), listOrders()]);
        if (!active) return;
        setProducts(productRows);
        setOrders(orderRows);
        setAuthLoading(false);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
        setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setError("");
    setLoginBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (signInError) setError(signInError.message);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : String(signInError));
    } finally {
      setLoginBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setError(signOutError.message);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : String(signOutError));
    }
  };

  const editProduct = (product: ProductRow) => {
    setDraft({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      tag: product.tag,
      price: String(product.price),
      originalPrice: product.original_price === null ? "" : String(product.original_price),
      colors: product.colors.join(", "),
      sizes: product.sizes.join(", "),
      imageUrl: product.image_url ?? "",
      hoverImageUrl: product.hover_image_url ?? "",
      stock: String(product.stock_quantity),
      active: product.is_active,
    });
    setImageFile(null);
    setHoverFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const imageUrl = imageFile
        ? await uploadProductImage(imageFile)
        : draft.imageUrl.trim() || null;
      const hoverImageUrl = hoverFile
        ? await uploadProductImage(hoverFile)
        : draft.hoverImageUrl.trim() || imageUrl;
      if (!imageUrl) throw new Error("Ürün için bir görsel yükleyin veya görsel URL'si girin.");
      const colors = parseList(draft.colors);
      const sizes = parseList(draft.sizes);
      if (!colors.length || colors.some((color) => !(color in COLORS))) {
        throw new Error("Renkleri katalogdaki renk adlarıyla girin.");
      }
      if (!sizes.length || sizes.some((size) => !SIZES.includes(size as (typeof SIZES)[number]))) {
        throw new Error(`Bedenler şu değerlerden olmalı: ${SIZES.join(", ")}.`);
      }
      const slug = draft.slug.trim() || slugify(draft.name) || crypto.randomUUID();
      const product: ProductRow = {
        id: draft.id,
        slug,
        name: draft.name.trim(),
        category: draft.category,
        tag: draft.tag,
        price: Number(draft.price),
        original_price: draft.originalPrice ? Number(draft.originalPrice) : null,
        colors,
        sizes,
        image_url: imageUrl,
        hover_image_url: hoverImageUrl,
        stock_quantity: Number(draft.stock),
        is_active: draft.active,
        sort_order: products.find((item) => item.id === draft.id)?.sort_order ?? 0,
        created_at: products.find((item) => item.id === draft.id)?.created_at ?? "",
        updated_at: products.find((item) => item.id === draft.id)?.updated_at ?? "",
      };
      await saveProduct(product);
      setProducts(await listAdminProducts());
      setDraft(emptyDraft);
      setImageFile(null);
      setHoverFile(null);
      setNotice("Ürün kaydedildi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusy(false);
    }
  };

  const showOrder = async (orderId: string) => {
    setSelectedOrder(orderId);
    setError("");
    try {
      setOrderItems(await listOrderItems(orderId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  };

  const changeStatus = async (orderId: string, status: OrderRow["status"]) => {
    setError("");
    try {
      await updateOrderStatus(orderId, status);
      setOrders(await listOrders());
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : String(updateError));
    }
  };

  if (!supabaseConfigured) {
    return (
      <AdminMessage text="Yönetim paneli için .env.local dosyasına Supabase URL ve anon key ekleyin." />
    );
  }
  if (authLoading) return <AdminMessage text="Yönetim paneli yükleniyor..." />;
  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-secondary px-4">
        <form
          onSubmit={signIn}
          className="w-full max-w-md space-y-4 rounded-2xl bg-card p-8 shadow"
        >
          <a href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Mağazaya dön
          </a>
          <h1 className="font-display text-3xl font-semibold text-primary">Yönetici Girişi</h1>
          <label className="block space-y-1 text-sm font-medium">
            E-posta
            <input
              required
              type="email"
              autoComplete="username"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Şifre
            <input
              required
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            disabled={loginBusy}
            className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loginBusy ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>
      </main>
    );
  }
  if (isAdmin === false) {
    return (
      <AdminMessage
        text="Bu Supabase kullanıcısına yönetici yetkisi verilmemiş."
        action={
          <button
            onClick={signOut}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            Çıkış yap
          </button>
        }
      />
    );
  }

  return (
    <main className="min-h-screen bg-secondary px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/" className="text-sm text-muted-foreground hover:text-primary">
              ← Mağazaya dön
            </a>
            <h1 className="mt-1 font-display text-4xl font-semibold text-primary">
              Yönetim Paneli
            </h1>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium"
          >
            Çıkış yap
          </button>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-card p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-lg border border-primary/20 bg-card p-3 text-sm text-primary"
          >
            {notice}
          </p>
        )}

        <nav className="flex gap-2">
          <button
            onClick={() => setSection("products")}
            className={tabClass(section === "products")}
          >
            Ürünler ({products.length})
          </button>
          <button onClick={() => setSection("orders")} className={tabClass(section === "orders")}>
            Siparişler ({orders.length})
          </button>
        </nav>

        {section === "products" ? (
          <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <form onSubmit={submitProduct} className="space-y-4 rounded-xl bg-card p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-primary">
                {draft.id ? "Ürünü düzenle" : "Yeni ürün ekle"}
              </h2>
              <Field label="Ürün adı">
                <input
                  required
                  minLength={2}
                  maxLength={180}
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kategori">
                  <select
                    value={draft.category}
                    onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                    className={inputClass}
                  >
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Etiket">
                  <select
                    value={draft.tag ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, tag: (event.target.value || null) as ProductRow["tag"] })
                    }
                    className={inputClass}
                  >
                    <option value="">Etiket yok</option>
                    <option value="Yeni">Yeni</option>
                    <option value="Çok Satan">Çok Satan</option>
                    <option value="İndirim">İndirim</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fiyat (TL)">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.price}
                    onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Eski fiyat (TL)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.originalPrice}
                    onChange={(event) => setDraft({ ...draft, originalPrice: event.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Renkler (${Object.keys(COLORS).join(", ")})`}>
                  <input
                    required
                    value={draft.colors}
                    onChange={(event) => setDraft({ ...draft, colors: event.target.value })}
                    className={inputClass}
                    placeholder="Bej, Siyah"
                  />
                </Field>
                <Field label={`Bedenler (${SIZES.join(", ")})`}>
                  <input
                    required
                    value={draft.sizes}
                    onChange={(event) => setDraft({ ...draft, sizes: event.target.value })}
                    className={inputClass}
                    placeholder="S, M, L, XL"
                  />
                </Field>
              </div>
              <Field label="Stok adedi">
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={draft.stock}
                  onChange={(event) => setDraft({ ...draft, stock: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Ürün görseli">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  className={inputClass}
                />
                <input
                  aria-label="Ürün görseli URL"
                  value={draft.imageUrl}
                  onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
                  className={`${inputClass} mt-2`}
                  placeholder="veya görsel URL'si"
                />
              </Field>
              <Field label="İkinci görsel (isteğe bağlı)">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setHoverFile(event.target.files?.[0] ?? null)}
                  className={inputClass}
                />
                <input
                  aria-label="İkinci görsel URL"
                  value={draft.hoverImageUrl}
                  onChange={(event) => setDraft({ ...draft, hoverImageUrl: event.target.value })}
                  className={`${inputClass} mt-2`}
                  placeholder="veya görsel URL'si"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                />
                Mağazada yayınla
              </label>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  className="flex-1 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Kaydediliyor..." : "Ürünü kaydet"}
                </button>
                {draft.id && (
                  <button
                    type="button"
                    onClick={() => setDraft(emptyDraft)}
                    className="rounded-lg border border-border px-4 py-3"
                  >
                    Vazgeç
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-primary">Ürün kataloğu</h2>
              {products.map((product) => (
                <article
                  key={product.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl bg-card p-4 shadow-sm"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="h-20 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-20 w-16 rounded-lg bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatTL(Number(product.price))} · Stok: {product.stock_quantity} ·{" "}
                      {product.is_active ? "Yayında" : "Taslak"}
                    </p>
                  </div>
                  <button
                    onClick={() => editProduct(product)}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    Düzenle
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-primary">Gelen siparişler</h2>
              {orders.length === 0 && (
                <p className="rounded-xl bg-card p-5 text-muted-foreground">Henüz sipariş yok.</p>
              )}
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => void showOrder(order.id)}
                  className={`w-full rounded-xl bg-card p-4 text-left shadow-sm ${selectedOrder === order.id ? "ring-2 ring-primary" : ""}`}
                >
                  <span className="flex flex-wrap justify-between gap-2 font-semibold">
                    <span>
                      {order.order_number} · {order.customer_name}
                    </span>
                    <span>{formatTL(Number(order.total))}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("tr-TR")} ·{" "}
                    {statusLabels[order.status]}
                  </span>
                </button>
              ))}
            </div>
            {selectedOrder && (
              <div className="space-y-4 rounded-xl bg-card p-5 shadow-sm">
                {(() => {
                  const order = orders.find((item) => item.id === selectedOrder);
                  if (!order) return null;
                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold text-primary">{order.order_number}</h2>
                        <select
                          aria-label="Sipariş durumu"
                          value={order.status}
                          onChange={(event) =>
                            void changeStatus(order.id, event.target.value as OrderRow["status"])
                          }
                          className={inputClass}
                        >
                          {orderStatuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <b>{order.customer_name}</b> · {order.customer_phone}
                        </p>
                        {order.customer_email && <p>{order.customer_email}</p>}
                        <p>
                          {order.address}, {order.district} / {order.city}
                        </p>
                        {order.notes && <p>Not: {order.notes}</p>}
                      </div>
                      <div className="divide-y divide-border border-y border-border">
                        {orderItems.map((item) => (
                          <div key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                            <span>
                              {item.product_name} · {item.color} / {item.size} × {item.quantity}
                            </span>
                            <span className="shrink-0">
                              {formatTL(Number(item.unit_price) * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between">
                          <span>Ara toplam</span>
                          <span>{formatTL(Number(order.subtotal))}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Kargo</span>
                          <span>
                            {Number(order.shipping_fee)
                              ? formatTL(Number(order.shipping_fee))
                              : "Bedava"}
                          </span>
                        </p>
                        <p className="flex justify-between font-bold">
                          <span>Toplam · Kapıda ödeme</span>
                          <span>{formatTL(Number(order.total))}</span>
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function AdminMessage({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-secondary px-4">
      <div className="space-y-4 rounded-xl bg-card p-8 text-center shadow">
        <h1 className="font-display text-2xl font-semibold text-primary">{text}</h1>
        {action}
        <a href="/" className="block text-sm text-muted-foreground hover:text-primary">
          Mağazaya dön
        </a>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tabClass(active: boolean) {
  return `rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`;
}

const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
