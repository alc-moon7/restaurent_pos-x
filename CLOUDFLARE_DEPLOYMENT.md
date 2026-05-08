# Cloudflare Deployment - Moon Test 4 Menu

This app is a full-stack Next.js app with API routes, so deploy it with Cloudflare's OpenNext adapter for Workers. In the Cloudflare dashboard this lives under Workers & Pages, but it is not a pure static Pages build.

## Connected Restaurant

```text
Restaurant: Moon test 4
Restaurant ID: rest_c46f1be2fa034b11b0
Outlet: প্রধান আউটলেট
Outlet ID: outlet_0884a3c2b8314bfb9c
Cloud API: https://vnhxfvtpkgykatvbrczn.supabase.co/functions/v1/pos-api
```

The app root `/` redirects to:

```text
/r/rest_c46f1be2fa034b11b0/o/outlet_0884a3c2b8314bfb9c?table=A1
```

## First-Time Setup

```bash
cd /home/moon-ahmed/Documents/GitHub/restaurant-pos
npm install
npx wrangler login
```

The browser will open. Log in to your Cloudflare account and approve Wrangler.

## Required Environment Variables

Set these in Cloudflare dashboard for the Worker, or keep the built-in defaults:

```bash
PLATFORM_API_BASE_URL=https://vnhxfvtpkgykatvbrczn.supabase.co/functions/v1/pos-api
NEXT_PUBLIC_RESTAURANT_ID=rest_c46f1be2fa034b11b0
NEXT_PUBLIC_OUTLET_ID=outlet_0884a3c2b8314bfb9c
NEXT_PUBLIC_DEFAULT_TABLE_ID=A1
NEXT_PUBLIC_MENU_BASE_URL=https://your-domain.com
```

These values are not customer-facing settings. Customers only open the website URL.

## Build Locally

```bash
npm run build
npx opennextjs-cloudflare build
```

## Preview Locally

```bash
cp .dev.vars.example .dev.vars
npm run preview
```

## Deploy

```bash
npm run deploy
```

After deployment, Cloudflare prints the production URL. Open that URL and it should redirect to the Moon Test 4 menu automatically.

## Custom Domain

In Cloudflare:

1. Open Workers & Pages.
2. Open the deployed Worker named `moon-test-4-menu`.
3. Go to Triggers.
4. Add a custom domain, for example `menu.yourdomain.com`.
5. Update `NEXT_PUBLIC_MENU_BASE_URL=https://menu.yourdomain.com`.
6. Redeploy with `npm run deploy`.

## Notes

- Customer ordering works through the Supabase Edge Function cloud API.
- Live Socket.IO is disabled for public cloud menu mode; order tracking uses polling.
- The current Moon Test 4 cloud menu is connected, but the menu endpoint currently returns zero items until Admin app syncs menu items to cloud.
