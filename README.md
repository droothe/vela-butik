# Vela Moda & Butik

Vela Moda & Butik, kadın ve erkek giyim koleksiyonlarını sergileyen bir çevrim içi mağaza demosudur. Ürün kataloğu ve ürün detaylarının yanı sıra yönetim alanından ürünler, görseller, stok ve siparişler yönetilebilir. Mağaza siparişleri kapıda ödeme akışını kullanır.

Supabase yapılandırılana kadar vitrin örnek kataloğu gösterebilir; Supabase ayarlandığında katalog ve sipariş verileri veritabanından okunur. Yönetim alanını kullanmak için Supabase Auth hesabı ve yönetici rolü gerekir.

## Geliştirme

Gereksinimler: [Bun](https://bun.sh/)

```sh
bun install
bun run dev
```

Üretim derlemesi için `bun run build`, testler için `bun run test` komutlarını kullanın. Supabase URL ve istemci anahtarı gibi ayarları yerel ortam dosyasında yapılandırın; `service_role` anahtarını tarayıcıya veya `VITE_` değişkenine koymayın.
