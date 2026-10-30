# Reddit Clone — Next.js Setup & Development Guide

## 1. Prerequisites

Before starting, make sure you have the following installed:
- **Node.js**: `v18.18.x` or higher (verify via `node -v`)
- **Git**
- **npm**

---

## 2. Clone & Install Dependencies

Clone the repository and install the project dependencies:

```bash
git clone https://github.com/OmarAhmedTHE25th/Reddit-clone.git
cd Reddit-clone
npm install
```

> ⚠️ **Important:** Do NOT upgrade or change Prisma to v7. Our project uses Prisma `v6.19.x` to maintain full schema compatibility. Running `npm install` installs the versions declared in `package.json`.

---

## 3. Environment Variables Setup (`.env`)

Database credentials and cryptographic secrets are omitted from Git tracking for security.

1. Create a `.env` file in the project root

2. Paste the shared credentials (sent via WhatsApp) into your `.env`

---

## 4. Sync Prisma Client

After creating your `.env`, run the client generator so your local editor/IDE recognizes all database models and types:

```bash
npx prisma generate
```

> **Pulling Schema Updates:**  
> Whenever someone pushes schema updates to `prisma/schema.prisma`, pull the changes and run:
> ```bash
> npx prisma migrate dev
> ```
> *Do not manually edit files inside the `prisma/migrations/` directory.*

---

## 5. Understand the Project Structure

The project uses the Next.js App Router. The existing `prisma/` directory remains at the project root and must not be moved:

```text
app/
├── api/
│   └── health/
│       └── route.js
├── layout.js
└── page.js

lib/
└── prisma.js

prisma/
├── schema.prisma
└── migrations/
```

- `app/layout.js` is the required root layout for the App Router.
- `app/page.js` is the home page at `/`.
- `app/api/health/route.js` is the database health-check Route Handler at `/api/health`.
- `lib/prisma.js` contains the shared Prisma Client singleton. It reuses the client during development hot-reloading to help prevent Neon connection pool exhaustion.
- `prisma/schema.prisma` and committed migration files remain the source of truth for the database schema.

---

## 6. Verify the Next.js Server and Database Connection

Start the Next.js development server:

```bash
npm run dev
```

Next.js starts locally at:
👉 **`http://localhost:3000`**

Open the home page to verify that the App Router is working:
👉 **`http://localhost:3000/`**

Then open the database health-check Route Handler:
👉 **`http://localhost:3000/api/health`**

You should see this exact response:
```json
{
  "status": "ok",
  "database": "connected to Neon"
}
```

If you receive this response, your local setup is fully functional and successfully connected to Neon.

---

## 7. Build and Start the Production Server

To verify the production build:

```bash
npm run build
```

After the build succeeds, start the production server:

```bash
npm run start
```

The production server is available at:
👉 **`http://localhost:3000`**

---

## 8. Visualizing Database Records (Prisma Studio)

To inspect, create, or update records in our Neon database using a browser interface:

```bash
npx prisma studio
```
This opens Prisma Studio at **`http://localhost:5555`**.

---

## 9. Development & Git Workflow

- **Branch Naming:** Never push directly to `main`. Create a feature branch:
  ```bash
  git checkout -b feature/<your-name>/<feature-name>
  ```
