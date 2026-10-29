# Modalife

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://modalife.lovable.app

## Supabase setup

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project's API settings. The anon/publishable key is intended for browser use; never put a `service_role` key in this app.
2. Run the SQL migration in `supabase/migrations/20261029000000_initial_store.sql` in the Supabase SQL Editor. It creates the catalog, orders, stock handling, public product-image bucket, and row-level security policies. The migration also seeds the eight products currently shown in the storefront.
3. In Supabase Authentication, create the admin user. Then run this SQL once with that user's ID from Authentication → Users:

   ```sql
   insert into public.user_roles (user_id, role)
   values ('YOUR-AUTH-USER-UUID', 'admin');
   ```

4. Start the app and open `/admin`. Sign in with that admin user's email and password. Admins can add/edit products and images, manage stock, view orders, and update order statuses. New storefront orders use cash-on-delivery and stock is checked/decremented transactionally.

The storefront keeps its local sample catalog available before Supabase credentials are configured. Once configured, catalog and order data are read from Supabase; database errors are shown in the UI rather than silently using sample data.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c0c61a2d-20f1-448c-9c25-469dbf2ebfdd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
