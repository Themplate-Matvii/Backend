# SaaS Backend API (Template Backend)

Modular, scalable backend template for **SaaS / Marketplace** projects built with:

**Node.js + TypeScript + Express + MongoDB**

Includes:
- JWT auth (access + refresh, refresh token via HttpOnly cookie)
- OAuth providers: Google / GitHub / Apple
- Role & permissions system (permission tree returned in auth payload)
- Billing: subscriptions + one-time purchases via Stripe (checkout + webhook + history)
- Email system: branding, system + marketing templates, previews, send/broadcast, unsubscribe preferences
- Media storage via Backblaze B2 (S3-compatible) with upload/import URL + CRUD
- Analytics: traffic tracking (public) + protected business analytics endpoints
- Landings CRUD
- Feedback form (public submit + protected admin list)

---

## 🌍 Production

**Base URL:** `https://backend-29gv.onrender.com/`

**Swagger (OpenAPI 3.0):** `/api/docs/`

---

## 🚀 Getting Started

### Requirements
- **Node.js 20.x**
- MongoDB (Atlas or self-hosted)
- Stripe account (secret key + webhook secret)
- Gmail SMTP (or another SMTP with the same env format)
- Backblaze B2 (S3-compatible) credentials (optional if media module is used)

---

### Install
```bash
npm install
````

---

### Environment Variables

Create `.env` in the project root.

> **Important:** do not commit secrets to GitHub. Put `.env` into `.gitignore`.

#### Runtime

```env
NODE_ENV=production
PORT=5001
BASE_URL=https://backend-29gv.onrender.com/

FRONTEND_URL=https://frontend-ten-xi-42.vercel.app
FRONTEND_PORT=3000

MONGO_URI=
DEFAULT_LANGUAGE=en
ADMIN_EMAIL=
```

#### JWT

```env
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### Email (SMTP)

```env
EMAIL_FROM=
EMAIL_PASS=
EMAIL_HOST=smtp.gmail.com
```

#### OAuth providers

```env
# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Apple
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
```

#### Payments

```env
DEFAULT_PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLIC_KEY=
STRIPE_WEBHOOK_SECRET=
```

#### Media (Backblaze B2, S3-compatible)

```env
B2_KEY_ID=
B2_APP_KEY=
B2_BUCKET_NAME=
B2_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
```

---

### Run locally (development)

```bash
npm run dev
```

Swagger will be available at:

* `http://localhost:<PORT>/api/docs`

---

### Build & run (production)

```bash
npm run build
npm run start
```

---

## 📂 Project Architecture

Project follows **Domain-Driven Modules** approach: each domain contains its own business logic, routes, controllers, services, models.

Current modules tree:

```
src/
  modules/
    billing/
      pricing/
      payments/
        providers/
          base/
          stripe/
      subscriptions/
      types/

    bonus/
    core/
    landings/

    user/
      index/
      auth/
      settings/
      account/

    communication/
      feedback/
      email/

    assets/
      media/

    analytics/
      business/
      traffic/
```

---

## 🧩 Modules Overview

### `billing/`

Core billing module.

* **pricing/**
  Aggregates billing products:

  * subscription plans (`plans`)
  * one-time products (`oneTimeProducts`)
    Merges constants + provider data (Stripe) and exposes them to the frontend.

* **payments/**

  * create Stripe checkout sessions (subscription & one-time)
  * store payment history
  * process Stripe webhook events

  Providers structure:

  ```
  payments/
    providers/
      base/   — provider interface
      stripe/ — Stripe implementation
  ```

* **subscriptions/**

  * store user subscriptions
  * status updates (e.g. active / canceled / expired)
  * webhook-driven synchronization

* **types/**
  Shared enums and types, including:

  * `PaymentMode`
  * `ProviderWebhookEventType`
  * `BonusSourceType`

---

### `bonus/`

Bonus accrual for:

* subscription purchases
* one-time purchases

Includes history endpoints and admin adjustments.

---

### `user/`

User domain split into:

```
user/
  index/      — current user info (/me) and user data
  auth/       — register/login/refresh/logout + OAuth
  settings/   — user preferences (theme/locale/email prefs)
  account/    — security flows & account management
```

Auth includes:

* JWT access + refresh
* refresh token rotation (via HttpOnly cookie)
* OAuth: Google / GitHub / Apple
* permission checks via middleware

---

### `communication/`

* **feedback/**: public submit + protected admin list (pagination)
* **email/**: templates, branding, preview, send/broadcast, unsubscribe flow

Email features exposed in API:

* branding get/update
* list system + marketing templates
* preview system template
* preview marketing template by id / preview draft
* send single email / broadcast
* unsubscribe preferences (get/update)

---

### `assets/`

* **media/**: upload/import by URL, list, get by id, update meta, delete
* storage provider: Backblaze B2 (S3-compatible)

---

### `analytics/`

* **traffic/**

  * public tracking endpoint
  * protected viewing endpoint with totals/unique and series

* **business**

  * revenue (in dollars), MRR/ARR, churn, ARPU/ARPPU, conversion
  * daily series (revenue, subscriptions, registrations, statuses)

---

### `landings/`

Landing management:

* create landing
* list current user landings

---

## 🔄 Billing Data Flow (Stripe)

### 1) Product sync

```
constants (plans + oneTimeProducts)
        ↓
pricingService
        ↓
stripeProvider.sync()
        ↓
BillingProductModel
```

### 2) Checkout session

```
paymentService → createCheckoutSession(planKey/productKey)
        ↓
stripeProvider → checkout.sessions.create()
```

### 3) Webhook

```
stripe → webhook
        ↓
stripeProvider.handleWebhook()
        ↓
paymentModel
subscriptionService
bonusService
```

---

## 🔐 Authorization & Permissions

Many endpoints use `BearerAuth` (JWT).

* Access token is returned in JSON (`accessToken`)
* Refresh token is set as **HttpOnly cookie** (`rt`)

Example user payload includes permission tree:

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": "665f1d0b6a98b2d5e1f4f123",
    "email": "user@example.com",
    "role": { "key": "user", "name": "roles.user.name" },
    "plan": "pro",
    "permissions": {
      "users": { "own": { "view": true, "edit": true, "delete": true } },
      "landings": { "create": true, "own": { "view": true, "edit": true, "delete": true } },
      "feedback": { "view": true },
      "email": { "one": false, "broadcast": false }
    }
  }
}
```

---

## 🧪 Migration Scripts

Email providers migration:

```bash
npm run migrate:email-providers
```

Script:

* `src/scripts/migrateEmailProviders.ts`

---

## 📚 API Overview (Swagger)

Swagger groups (tags):

* Auth
* User
* Account
* Email
* Feedback
* Media
* Payments
* Pricing
* Subscriptions
* Traffic
* Business Analytics
* Bonus
* Landings

Key endpoints (selection):

### Auth

* `POST /api/auth/register`
* `POST /api/auth/login`
* `POST /api/auth/refresh`
* `POST /api/auth/logout`
* `POST /api/auth/forgot-password`
* `POST /api/auth/reset-password`
* `GET  /api/auth/config`
* `GET  /api/auth/oauth/{provider}/authorize`
* `GET/POST /api/auth/oauth/{provider}/callback`
* `POST /api/auth/oauth/{provider}`

### User / Account

* `GET /api/users/me`

* `GET /api/users/all`

* `GET/PUT/DELETE /api/users/id/{userId}`

* `GET /api/account/me`

* `PATCH /api/account/profile`

* `POST /api/account/providers/oauth/link`

* `DELETE /api/account/providers/{provider}`

* `POST /api/account/providers/email/start`

* `POST /api/account/providers/email/confirm`

* `POST /api/account/password/set`

* `POST /api/account/password/change`

* `POST /api/account/email/verification/send`

* `POST /api/account/email/verification/confirm`

* `POST /api/account/email/change/start`

* `POST /api/account/email/change/confirm`

* `DELETE /api/account`

### Email

* `POST /api/email/send`
* `POST /api/email/broadcast`
* `GET/PUT /api/email/branding`
* `GET /api/email/templates`
* `POST /api/email/templates/preview`
* `POST /api/email/marketing/{id}/preview`
* `POST /api/email/marketing/preview`
* `GET/POST /api/email/unsubscribe/{token}`

### Feedback

* `POST /api/feedback/` (public)
* `GET  /api/feedback/all` (protected)

### Media (Backblaze B2)

* `POST /api/media/upload`
* `GET  /api/media/`
* `GET/PATCH/DELETE /api/media/:id`

### Payments / Pricing / Subscriptions

* `GET  /api/pricing`

* `GET  /api/pricing/{key}`

* `POST /api/payments/checkout`

* `POST /api/payments/checkout/one-time`

* `POST /api/payments/webhook`

* `GET  /api/payments/my`

* `GET  /api/payments/user/{userId}`

* `GET  /api/subscriptions/me`

* `POST /api/subscriptions/cancel`

* `POST /api/subscriptions/resume`

* `GET  /api/subscriptions/user/{userId}`

* `POST /api/subscriptions/user/{userId}/cancel`

* `POST /api/subscriptions/user/{userId}/resume`

### Analytics

* `POST /api/analytics/traffic/track` (public)
* `GET  /api/analytics/traffic/` (protected)
* `GET  /api/analytics/business/` (protected)

### Bonus

* `GET  /api/bonus/history`
* `GET  /api/bonus/history/{userId}`
* `PATCH /api/bonus/{userId}`

### Landings

* `POST /api/landings/`
* `GET  /api/landings/`

---

## 🧰 Tech Stack

* Node.js (20.x)
* TypeScript
* Express
* MongoDB + Mongoose
* Stripe
* JWT
* i18next
* Nodemailer + Handlebars templates
* Multer
* Backblaze B2 (S3-compatible via AWS SDK v3)
* Swagger (swagger-jsdoc + swagger-ui-express)
* Zod validation
* Helmet, CORS, cookie-parser, rate limiting

---

## 📜 NPM Scripts

```bash
npm run dev                    # nodemon + ts-node
npm run build                  # tsc + tsc-alias
npm run start                  # node dist/main.js
npm test                       # jest
npm run migrate:email-providers # migration script
```