create extension if not exists pgcrypto;

create sequence if not exists public.order_number_seq;

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(trim(name)) between 2 and 180),
  category text not null check (category in (
    'Gömlek', 'Ceket & Mont', 'Polar & Sweatshirt', 'Triko & Kazak'
  )),
  tag text check (tag is null or tag in ('Yeni', 'Çok Satan', 'İndirim')),
  price numeric(10, 2) not null check (price >= 0),
  original_price numeric(10, 2) check (original_price is null or original_price >= price),
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  image_url text,
  hover_image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(colors) > 0),
  check (cardinality(sizes) > 0)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'ML-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad(nextval('public.order_number_seq')::text, 6, '0')
  ),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 160),
  customer_email text,
  customer_phone text not null,
  address text not null,
  city text not null,
  district text not null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null default 'cash_on_delivery'
    check (payment_method = 'cash_on_delivery'),
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  shipping_fee numeric(10, 2) not null default 0 check (shipping_fee >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  size text not null,
  color text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create index products_active_sort_idx on public.products (is_active, sort_order desc);
create index orders_created_at_idx on public.orders (created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.user_roles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Admins can read roles"
on public.user_roles for select to authenticated
using (public.is_admin());

create policy "Anyone can read active products"
on public.products for select to anon, authenticated
using (is_active or public.is_admin());

create policy "Admins can insert products"
on public.products for insert to authenticated
with check (public.is_admin());

create policy "Admins can update products"
on public.products for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete products"
on public.products for delete to authenticated
using (public.is_admin());

create policy "Admins can read orders"
on public.orders for select to authenticated
using (public.is_admin());

create policy "Admins can update orders"
on public.orders for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read order items"
on public.order_items for select to authenticated
using (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.user_roles to authenticated;

create or replace function public.place_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_address text,
  p_city text,
  p_district text,
  p_notes text,
  p_items jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_size text;
  v_color text;
  v_subtotal numeric(10, 2) := 0;
  v_shipping numeric(10, 2);
begin
  if char_length(trim(coalesce(p_customer_name, ''))) not between 2 and 160
     or char_length(trim(coalesce(p_customer_phone, ''))) not between 7 and 40
     or char_length(trim(coalesce(p_customer_email, ''))) > 254
     or char_length(trim(coalesce(p_address, ''))) not between 5 and 1000
     or char_length(trim(coalesce(p_city, ''))) not between 2 and 100
     or char_length(trim(coalesce(p_district, ''))) not between 2 and 100
     or char_length(trim(coalesce(p_notes, ''))) > 1000 then
    raise exception 'Lütfen geçerli teslimat bilgilerini girin.';
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Sipariş sepeti boş veya geçersiz.';
  end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Sipariş sepeti boş veya geçersiz.';
  end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone, address, city, district, notes
  ) values (
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    trim(p_customer_phone),
    trim(p_address),
    trim(p_city),
    trim(p_district),
    nullif(trim(coalesce(p_notes, '')), '')
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_size := trim(coalesce(v_item ->> 'size', ''));
    v_color := trim(coalesce(v_item ->> 'color', ''));

    if v_quantity not between 1 and 20 then
      raise exception 'Ürün miktarı geçersiz.';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id and is_active
    for update;

    if not found then
      raise exception 'Sepetinizdeki bir ürün artık satışta değil.';
    end if;
    if not (v_size = any(v_product.sizes))
       or not (v_color = any(v_product.colors)) then
      raise exception 'Seçilen ürün bedeni veya rengi geçersiz.';
    end if;
    if v_product.stock_quantity < v_quantity then
      raise exception '%, stokta yeterli miktarda bulunmuyor.', v_product.name;
    end if;

    update public.products
    set stock_quantity = stock_quantity - v_quantity
    where id = v_product.id;

    insert into public.order_items (
      order_id, product_id, product_name, size, color, quantity, unit_price
    ) values (
      v_order_id, v_product.id, v_product.name, v_size, v_color, v_quantity, v_product.price
    );

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  v_shipping := case when v_subtotal >= 1500 then 0 else 79 end;
  update public.orders
  set subtotal = v_subtotal,
      shipping_fee = v_shipping,
      total = v_subtotal + v_shipping
  where id = v_order_id;

  return (select order_number from public.orders where id = v_order_id);
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, text, text, text, text, jsonb) to anon, authenticated;

create or replace function public.restore_stock_on_order_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('shipped', 'delivered') and new.status = 'cancelled' then
    raise exception 'Kargoya verilen veya teslim edilen sipariş iptal edilemez.';
  end if;
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'İptal edilmiş sipariş yeniden açılamaz.';
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products as product
    set stock_quantity = product.stock_quantity + item_totals.quantity
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = new.id and product_id is not null
      group by product_id
    ) as item_totals
    where product.id = item_totals.product_id;
  end if;
  return new;
end;
$$;

create trigger orders_restore_stock_on_cancel
after update of status on public.orders
for each row execute function public.restore_stock_on_order_cancel();

insert into public.products (
  slug, name, category, tag, price, original_price, colors, sizes, stock_quantity, sort_order
) values
  ('legacy-1', 'Yarım Fermuarlı Dik Yaka Selanik Kazak', 'Triko & Kazak', 'Çok Satan', 899, 1299, array['Haki Yeşil', 'Açık Mavi', 'Lacivert'], array['S', 'M', 'L', 'XL'], 20, 5),
  ('legacy-2', 'Hakim Yaka Keten Gömlek', 'Gömlek', 'Yeni', 749, null, array['Kiremit', 'Bej'], array['M', 'L', 'XL', 'XXL'], 20, 9),
  ('legacy-3', 'Düğmeli Triko Hırka', 'Triko & Kazak', 'İndirim', 849, 1199, array['Bordo', 'Lacivert'], array['S', 'M', 'L'], 20, 3),
  ('legacy-4', 'Kapitone Kadife Yaka Mont', 'Ceket & Mont', 'Yeni', 1899, null, array['Siyah', 'Haki Yeşil'], array['M', 'L', 'XL', 'XXL'], 20, 10),
  ('legacy-5', 'Fitilli Kadife Gömlek Ceket', 'Ceket & Mont', 'Çok Satan', 1149, 1499, array['Bej', 'Bordo'], array['S', 'M', 'L', 'XL'], 20, 7),
  ('legacy-6', 'Uzun Kollu Pike Polo', 'Polar & Sweatshirt', null, 649, null, array['Lacivert', 'Siyah'], array['S', 'M', 'L', 'XL', 'XXL'], 20, 6),
  ('legacy-7', 'Yarım Fermuarlı Kaşmir Hissi Kazak', 'Triko & Kazak', 'Yeni', 999, null, array['Açık Mavi', 'Bej'], array['M', 'L', 'XL'], 20, 8),
  ('legacy-8', 'Selanik Örgü Hırka', 'Polar & Sweatshirt', 'İndirim', 799, 1099, array['Bordo', 'Haki Yeşil'], array['S', 'M', 'L', 'XL'], 20, 2);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Product images are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'products');

create policy "Admins can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'products' and public.is_admin());

create policy "Admins can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'products' and public.is_admin())
with check (bucket_id = 'products' and public.is_admin());

create policy "Admins can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'products' and public.is_admin());
