import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search, Heart, ShoppingBag, Menu, Zap, RefreshCw, Lock, Instagram, MessageCircle, Plus, Minus, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import heroImg from "@/assets/hero.jpg";
import {
  CATEGORIES, COLORS, SIZES, PRODUCTS, formatTL, remainingForFreeShipping, FREE_SHIPPING_THRESHOLD, type Product,
} from "@/lib/catalog";
import { createOrder, listPublicProducts, type CustomerDetails } from "@/lib/store";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vela Moda & Butik — Yeni Sezon Kadın & Erkek Giyim" },
      { name: "description", content: "Vela Moda & Butik — Yeni Sezon Kadın & Erkek Giyim. Nişantaşı / İstanbul." },
      { property: "og:title", content: "Vela Moda & Butik — Yeni Sezon Kadın & Erkek Giyim" },
      { property: "og:description", content: "Kadın ve erkek giyiminde yeni sezon parçaları." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type CartItem = { product: Product; size: string; color: string; qty: number };
type Sort = "new" | "asc" | "desc";
const customerFields: { key: keyof CustomerDetails; label: string; required: boolean }[] = [
  { key: "name", label: "Ad Soyad", required: true },
  { key: "phone", label: "Telefon", required: true },
  { key: "email", label: "E-posta (isteğe bağlı)", required: false },
  { key: "city", label: "İl", required: true },
  { key: "district", label: "İlçe", required: true },
];

function Index() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(
    supabaseConfigured ? [] : PRODUCTS,
  );
  const [catalogLoading, setCatalogLoading] = useState(supabaseConfigured);
  const [catalogError, setCatalogError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    notes: "",
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [wish, setWish] = useState<string[]>([]);
  const [cat, setCat] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [sort, setSort] = useState<Sort>("new");

  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;
    listPublicProducts()
      .then((items) => {
        if (active) {
          setCatalogProducts(items);
          setCatalogLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCatalogError(error instanceof Error ? error.message : String(error));
          setCatalogLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const products = useMemo(() => {
    let list = catalogProducts.filter((p) => {
      if (cat === "Yeni Gelenler" && p.tag !== "Yeni") return false;
      if (cat === "İndirim" && !p.oldPrice) return false;
      if (cat && cat !== "Yeni Gelenler" && cat !== "İndirim" && p.category !== cat) return false;
      if (size && !p.sizes.includes(size)) return false;
      if (color && !p.colors.includes(color)) return false;
      return p.price <= maxPrice;
    });
    list = [...list].sort((a, b) =>
      sort === "new" ? b.added - a.added : sort === "asc" ? a.price - b.price : b.price - a.price,
    );
    return list;
  }, [catalogProducts, cat, size, color, maxPrice, sort]);

  const add = (p: Product, s: string = p.sizes[1] ?? p.sizes[0] ?? "M", c: string = p.colors[0] ?? "") => {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.product.id === p.id && x.size === s && x.color === c);
      if (i >= 0) return prev.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { product: p, size: s, color: c, qty: 1 }];
    });
    setCartOpen(true);
  };
  const changeQty = (i: number, d: number) =>
    setCart((prev) => prev.map((x, j) => (j === i ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0));

  const count = cart.reduce((s, x) => s + x.qty, 0);
  const subtotal = cart.reduce((s, x) => s + x.qty * x.product.price, 0);
  const remaining = remainingForFreeShipping(subtotal);
  const pickCat = (c: string | null) => {
    setCat(c);
    setMenuOpen(false);
    document.getElementById("koleksiyon")?.scrollIntoView({ behavior: "smooth" });
  };
  const searchResults = query.trim()
    ? catalogProducts.filter((p) => p.title.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")))
    : [];

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutError("");
    setCheckoutBusy(true);
    try {
      const orderId = await createOrder(
        customer,
        cart.map(({ product, size: selectedSize, color: selectedColor, qty }) => ({
          product_id: product.id,
          quantity: qty,
          size: selectedSize,
          color: selectedColor,
        })),
      );
      setCreatedOrderId(orderId);
      setCart([]);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : String(error));
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary py-2 text-center text-xs tracking-wide text-primary-foreground">
        {formatTL(FREE_SHIPPING_THRESHOLD)} üzeri kargo bedava · Kapıda ödeme imkânı
      </div>

      {/* NAV */}
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-20">
          <button className="lg:hidden" aria-label="Menü" onClick={() => setMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <a href="/" className="flex min-w-0 items-center gap-2">
            <img
              src="/logo.svg"
              alt="Vela Moda & Butik"
              className="h-12 w-auto shrink-0 object-contain md:h-14"
            />
          </a>
          <nav className="mx-auto hidden gap-6 lg:flex">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => pickCat(c)}
                className={`text-sm font-medium transition-colors hover:text-primary ${c === "İndirim" ? "text-sale" : "text-muted-foreground"} ${cat === c ? "text-primary underline underline-offset-8" : ""}`}
              >
                {c}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            <select aria-label="Dil ve para birimi" className="hidden rounded-md bg-transparent text-xs text-muted-foreground md:block">
              <option>TR · ₺</option>
              <option>EN · €</option>
            </select>
            <IconBtn label="Ara" onClick={() => setSearchOpen(true)}><Search className="h-5 w-5" /></IconBtn>
            <IconBtn label="Favoriler" badge={wish.length}><Heart className="h-5 w-5" /></IconBtn>
            <IconBtn label="Sepet" badge={count} onClick={() => setCartOpen(true)}><ShoppingBag className="h-5 w-5" /></IconBtn>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative h-[78vh] min-h-[520px] overflow-hidden">
        <img src={heroImg} alt="Sonbahar kış koleksiyonu" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover object-[70%_center] animate-in fade-in zoom-in-105 duration-1000" />
        <div className="hero-scrim absolute inset-0" />
        <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-16 md:items-center md:pb-0">
          <div className="max-w-xl text-primary-foreground animate-in fade-in slide-in-from-bottom-6 duration-700">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Sonbahar / Kış 2026</p>
            <h1 className="text-4xl font-semibold leading-[1.05] md:text-6xl">
              Vela Moda & Butik: Yeni Sezon Koleksiyonu
            </h1>
            <p className="mt-5 text-base opacity-90 md:text-lg">
              Kadın ve erkek giyiminde şıklığı, rahatlığı ve zamansız parçaları keşfedin.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => pickCat(null)} className="rounded-xl bg-primary-foreground px-6 py-3.5 text-sm font-semibold text-primary shadow-md transition hover:-translate-y-0.5">
                Koleksiyonu Keşfet
              </button>
              <button onClick={() => { setSort("new"); pickCat(null); }} className="rounded-xl border border-primary-foreground/70 px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10">
                Çok Satanlar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3">
          {[
            [Zap, "Şeffaf Kargo & Kapıda Ödeme İmkânı"],
            [RefreshCw, "Kolay Değişim & İade Garantisi"],
            [Lock, "%100 Güvenli Alışveriş & 256-bit SSL"],
          ].map(([I, t], k) => {
            const Icon = I as typeof Zap;
            return (
              <div key={k} className="flex items-center gap-3 sm:justify-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Icon className="h-5 w-5" /></span>
                <span className="text-sm font-medium">{t as string}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="koleksiyon" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Koleksiyon</p>
            <h2 className="text-3xl font-semibold text-primary md:text-4xl">{cat ?? "Öne Çıkanlar"}</h2>
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm" aria-label="Sırala">
            <option value="new">En Yeniler</option>
            <option value="asc">Fiyata Göre: Artan</option>
            <option value="desc">Fiyata Göre: Azalan</option>
          </select>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          <Chip active={!cat} onClick={() => setCat(null)}>Tümü</Chip>
          {CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
        </div>

        <div className="mb-10 grid gap-5 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Beden</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button key={s} onClick={() => setSize(size === s ? null : s)} className={`h-9 min-w-10 rounded-lg border px-2 text-sm font-medium transition ${size === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Renk</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COLORS).map(([n, v]) => (
                <button key={n} title={n} aria-label={n} onClick={() => setColor(color === n ? null : n)} className={`h-8 w-8 rounded-full border-2 transition ${color === n ? "border-primary ring-2 ring-gold ring-offset-2" : "border-border"}`} style={{ background: v }} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Fiyat</span><span className="text-foreground">≤ {formatTL(maxPrice)}</span>
            </p>
            <input type="range" min={500} max={2000} step={50} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-primary" aria-label="Maksimum fiyat" />
          </div>
        </div>

        {catalogError && (
          <p role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Ürünler Supabase üzerinden yüklenemedi: {catalogError}
          </p>
        )}
        {catalogLoading ? (
          <p className="py-16 text-center text-muted-foreground">Ürünler yükleniyor...</p>
        ) : products.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">Bu filtrelere uygun ürün bulunamadı.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} wished={wish.includes(p.id)} onWish={() => setWish((w) => (w.includes(p.id) ? w.filter((x) => x !== p.id) : [...w, p.id]))} onAdd={add} />
            ))}
          </div>
        )}
      </section>

      {/* INSTAGRAM */}
      <section className="bg-secondary py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 text-center">
            <Instagram className="mx-auto mb-3 h-6 w-6 text-primary" />
            <h2 className="text-3xl font-semibold text-primary md:text-4xl">Instagram'da Bizi Takip Edin</h2>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-gold hover:underline">@vela.moda.butik.demo</a>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {catalogProducts.slice(0, 8).map((p) => (
              <a key={p.id} href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-xl">
                <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 grid place-items-center bg-primary/0 transition group-hover:bg-primary/40">
                  <Instagram className="h-6 w-6 text-primary-foreground opacity-0 transition group-hover:opacity-100" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img
              src="/logo.svg"
              alt="Vela Moda & Butik"
              className="mb-4 h-24 w-auto object-contain"
            />
            <p className="text-sm opacity-75">Kadın ve erkek giyiminde zamansız parçalar.</p>
          </div>
          <FooterCol title="Kurumsal" items={["Hakkımızda", "İletişim"]} />
          <FooterCol title="Müşteri Hizmetleri" items={["Kargo & Teslimat", "Değişim Koşulları", "SSS"]} />
          <div>
            <h3 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-gold">İletişim Bilgileri</h3>
            <a href="https://wa.me/905550000000" className="flex items-center gap-2 text-sm hover:text-gold">
              <MessageCircle className="h-4 w-4" /> WhatsApp: +90 555 000 00 00
            </a>
            <a href="mailto:iletisim@velabutik.example" className="mt-2 block text-sm hover:text-gold">iletisim@velabutik.example</a>
            <p className="mt-2 text-sm">Nişantaşı / İstanbul</p>
            <a href="https://www.google.com/maps/search/?api=1&query=Nişantaşı%2C%20İstanbul" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm hover:text-gold">Haritada görüntüle</a>
            <div className="mt-6 flex flex-wrap gap-2">
              {["VISA", "Mastercard", "Troy", "Kapıda Ödeme"].map((m) => (
                <span key={m} className="rounded-md border border-primary-foreground/25 px-2.5 py-1 text-[11px] font-semibold tracking-wide">{m}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/15 py-5 text-center text-xs opacity-60">
          © {new Date().getFullYear()} Vela Moda & Butik. Demo mağaza.
        </div>
      </footer>

      {/* WhatsApp float */}
      <a href="https://wa.me/905550000000" aria-label="WhatsApp ile sipariş" className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-gold text-accent-foreground shadow-md transition hover:scale-105">
        <MessageCircle className="h-6 w-6" />
      </a>

      {/* CART */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-5">
            <SheetTitle className="font-display text-2xl text-primary">Sepetim ({count})</SheetTitle>
          </SheetHeader>
          <div className="border-b border-border bg-secondary p-5">
            <p className="mb-2 text-sm font-medium">
              {remaining > 0 ? <><b>{formatTL(remaining)}</b> daha ekleyin, Kargo Bedava Olsun!</> : "Tebrikler! Kargonuz bedava 🎉"}
            </p>
            <Progress value={Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)} className="h-2" />
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {cart.length === 0 && <p className="py-10 text-center text-muted-foreground">Sepetiniz boş.</p>}
            {cart.map((x, i) => (
              <div key={i} className="flex gap-3">
                <img src={x.product.image} alt={x.product.title} className="h-24 w-20 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{x.product.title}</p>
                  <p className="text-xs text-muted-foreground">{x.color} · {x.size}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-border">
                      <button className="p-1.5" aria-label="Azalt" onClick={() => changeQty(i, -1)}><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-6 text-center text-sm">{x.qty}</span>
                      <button className="p-1.5" aria-label="Arttır" onClick={() => changeQty(i, 1)}><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="text-sm font-semibold">{formatTL(x.qty * x.product.price)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-border p-5">
            <Row l="Ara Toplam" r={formatTL(subtotal)} />
            <Row l="Kargo" r={remaining > 0 && subtotal > 0 ? formatTL(79) : "Bedava"} />
            <Row l="Toplam" r={formatTL(subtotal + (remaining > 0 && subtotal > 0 ? 79 : 0))} bold />
            <button
              disabled={!cart.length || !supabase}
              onClick={() => {
                setCheckoutError("");
                setCreatedOrderId("");
                setCheckoutOpen(true);
              }}
              className="mt-3 w-full rounded-xl bg-primary py-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground shadow-md transition hover:opacity-90 disabled:opacity-40"
            >
              Siparişi Tamamla
            </button>
            {!supabase && <p className="text-xs text-muted-foreground">Sipariş vermek için Supabase ayarlarını ekleyin.</p>}
          </div>
        </SheetContent>
      </Sheet>

      {/* ORDER CHECKOUT */}
      <Dialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) setCreatedOrderId("");
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogTitle className="font-display text-2xl text-primary">
            {createdOrderId ? "Siparişiniz alındı" : "Teslimat bilgileri"}
          </DialogTitle>
          {createdOrderId ? (
            <div className="space-y-4">
              <p>Siparişiniz başarıyla oluşturuldu. Sipariş numaranız:</p>
              <p className="rounded-lg bg-secondary p-3 font-semibold">{createdOrderId}</p>
              <button
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
                onClick={() => {
                  setCheckoutOpen(false);
                  setCartOpen(false);
                }}
              >
                Tamam
              </button>
            </div>
          ) : (
            <form onSubmit={submitOrder} className="space-y-3">
              <p className="text-sm text-muted-foreground">Kapıda ödeme · Toplam {formatTL(subtotal + (remaining > 0 && subtotal > 0 ? 79 : 0))}</p>
              {customerFields.map(({ key, label, required }) => (
                <label key={key} className="block space-y-1 text-sm font-medium">
                  {label}
                  <input
                    required={required}
                    type={key === "email" ? "email" : "text"}
                    value={customer[key]}
                    onChange={(event) => setCustomer((previous) => ({ ...previous, [key]: event.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                </label>
              ))}
              <label className="block space-y-1 text-sm font-medium">
                Açık adres
                <textarea
                  required
                  minLength={5}
                  value={customer.address}
                  onChange={(event) => setCustomer((previous) => ({ ...previous, address: event.target.value }))}
                  className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm font-medium">
                Sipariş notu (isteğe bağlı)
                <textarea
                  value={customer.notes}
                  onChange={(event) => setCustomer((previous) => ({ ...previous, notes: event.target.value }))}
                  className="min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2"
                />
              </label>
              {checkoutError && <p role="alert" className="text-sm text-destructive">{checkoutError}</p>}
              <button
                type="submit"
                disabled={checkoutBusy || !cart.length}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {checkoutBusy ? "Sipariş oluşturuluyor..." : "Kapıda Ödeme ile Sipariş Ver"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* SEARCH */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="top-[15%] translate-y-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Ürün ara</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kazak, gömlek, mont..." className="w-full bg-transparent text-base outline-none" />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {searchResults.map((p) => (
              <button key={p.id} onClick={() => { add(p); setSearchOpen(false); }} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary">
                <img src={p.image} alt="" className="h-14 w-11 rounded object-cover" />
                <span className="flex-1 text-sm font-medium">{p.title}</span>
                <span className="text-sm font-semibold">{formatTL(p.price)}</span>
              </button>
            ))}
            {query && !searchResults.length && <p className="py-4 text-center text-sm text-muted-foreground">Sonuç bulunamadı.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* MOBILE MENU */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader><SheetTitle className="font-display text-2xl text-primary">Kategoriler</SheetTitle></SheetHeader>
          <div className="mt-6 flex flex-col">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => pickCat(c)} className={`border-b border-border py-4 text-left text-base font-medium ${c === "İndirim" ? "text-sale" : ""}`}>{c}</button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProductCard({ p, wished, onWish, onAdd }: { p: Product; wished: boolean; onWish: () => void; onAdd: (p: Product, s?: string, c?: string) => void }) {
  const [c, setC] = useState<string>(p.colors[0] ?? "");
  const [picking, setPicking] = useState(false);
  return (
    <div className="group">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
        <img src={p.image} alt={p.title} loading="lazy" width={768} height={1024} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105 group-hover:opacity-0" />
        <img src={p.hover} alt="" loading="lazy" width={768} height={1024} className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 group-hover:scale-105 group-hover:opacity-100" />
        {p.tag && (
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${p.tag === "İndirim" ? "bg-sale text-primary-foreground" : p.tag === "Yeni" ? "bg-primary text-primary-foreground" : "bg-gold text-accent-foreground"}`}>{p.tag}</span>
        )}
        <button onClick={onWish} aria-label="Favorilere ekle" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 shadow-sm transition hover:scale-110">
          <Heart className={`h-4 w-4 ${wished ? "fill-sale text-sale" : ""}`} />
        </button>
        <div className={`absolute inset-x-3 bottom-3 transition duration-300 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 ${picking ? "md:translate-y-0 md:opacity-100" : ""}`}>
          {picking ? (
            <div className="glass rounded-xl p-2 shadow-md">
              <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-semibold"><span>Beden seç</span><button onClick={() => setPicking(false)} aria-label="Kapat"><X className="h-3.5 w-3.5" /></button></div>
              <div className="flex flex-wrap gap-1">
                {p.sizes.map((s) => (
                  <button key={s} onClick={() => { onAdd(p, s, c); setPicking(false); }} className="flex-1 rounded-lg bg-card py-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={() => setPicking(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Hızlı Ekle
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex gap-1.5">
          {p.colors.map((n) => (
            <button key={n} title={n} aria-label={n} onClick={() => setC(n)} className={`h-4 w-4 rounded-full border ${c === n ? "ring-2 ring-primary ring-offset-1" : "border-border"}`} style={{ background: COLORS[n] }} />
          ))}
        </div>
        <h3 className="line-clamp-2 font-sans text-sm font-medium leading-snug">{p.title}</h3>
        <div className="flex items-baseline gap-2">
          {p.oldPrice && <span className="text-xs text-muted-foreground line-through">{formatTL(p.oldPrice)}</span>}
          <span className={`text-base font-bold ${p.oldPrice ? "text-sale" : "text-primary"}`}>{formatTL(p.price)}</span>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, label, badge, onClick }: { children: React.ReactNode; label: string; badge?: number; onClick?: () => void }) {
  return (
    <button aria-label={label} onClick={onClick} className="relative grid h-10 w-10 place-items-center rounded-full text-primary transition hover:bg-secondary">
      {children}
      {!!badge && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-accent-foreground animate-in zoom-in">{badge}</span>}
    </button>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}>{children}</button>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-gold">{title}</h3>
      <ul className="space-y-2 text-sm opacity-80">{items.map((i) => <li key={i}><a href="#" className="hover:text-gold">{i}</a></li>)}</ul>
    </div>
  );
}

function Row({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return <div className={`flex justify-between text-sm ${bold ? "text-base font-bold text-primary" : "text-muted-foreground"}`}><span>{l}</span><span>{r}</span></div>;
}
