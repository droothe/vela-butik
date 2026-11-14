# Vela Moda & Butik

Vela Moda & Butik için kadın ve erkek giyim koleksiyonunu sergileyen bir mağaza demosu.

## Supabase setup

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project's API settings. The anon/publishable key is intended for browser use; never put a `service_role` key in this app.
2. Run the SQL migration in `supabase/migrations/20261029000000_initial_store.sql` in the Supabase SQL Editor. It creates the catalog, orders, stock handling, public product-image bucket, and row-level security policies. The migration seeds eight fictional demo products.
3. In Supabase Authentication, create the admin user. Then run this SQL once with that user's ID from Authentication → Users:

   ```sql
   insert into public.user_roles (user_id, role)
   values ('YOUR-AUTH-USER-UUID', 'admin');
   ```

4. Start the app and open `/admin`. Sign in with that admin user's email and password. Admins can add/edit products and images, manage stock, view orders, and update order statuses. New storefront orders use cash-on-delivery and stock is checked/decremented transactionally.

The storefront keeps its local demo catalog available before Supabase credentials are configured. Once configured, catalog and order data are read from Supabase; database errors are shown in the UI rather than silently using sample data.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone https://github.com/droothe/vela-butik.git
cd vela-butik
npm i
npm run dev
```
