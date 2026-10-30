# Reddit Clone — Setup & Development Guide

## 1. Prerequisites

Before starting, make sure you have the following installed:
- **Node.js**: `v18.x` or higher (verify via `node -v`)
- **Git**

---

## 2. Clone & Install Dependencies

Clone the repository and install the project dependencies:

```bash
git clone https://github.com/OmarAhmedTHE25th/Reddit-clone.git
cd Reddit-clone
npm install
```

> ⚠️ **Important:** Do NOT upgrade or change Prisma to v7. Our project is pinned to Prisma `v6.4.x` to maintain full schema compatibility. Running `npm install` installs the exact pinned versions.

---

## 3. Environment Variables Setup (`.env`)

Database credentials and cryptographic secrets are omitted from Git tracking for security.

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
   *(Or create a new file named `.env` in the root folder).*

2. Paste the shared credentials into your `.env`:

```env
DATABASE_URL="postgresql://neondb_owner:npg_w0JvTpbXH8OS@ep-billowing-unit-b4sm2y4z-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_w0JvTpbXH8OS@ep-billowing-unit-b4sm2y4z.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

PORT=5000
JWT_ACCESS_SECRET="2cc3bffa8e89f69bc040097a7ec90f70d7dd6b273863c1c2bfdcd7f4a5bf3f9d86b2f6560b3fc4fb264c75c7c34477a53e3aecb57fce398294a38227bc7b397b"
JWT_REFRESH_SECRET="c60e27dd39bd3ed77584aa724566b08a358ccd737f381f998eb539d102dde881a31a4846669447852221df83e79ec09b75f486fa5ddc85c248456ef201ccd17d"
```

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

## 5. Verify Database Connection

Start your local server:

```bash
npm run dev
# or
node src/server.js
```

Open your browser and navigate to:
👉 **`http://localhost:5000/api/health`**

You should see this exact response:
```json
{
  "status": "ok",
  "database": "connected to Neon"
}
```

If you receive this response, your local setup is fully functional and successfully connected to Neon.

---

## 6. Visualizing Database Records (Prisma Studio)

To inspect, create, or update records in our Neon database using a browser interface:

```bash
npx prisma studio
```
This opens Prisma Studio at **`http://localhost:5555`**.

---

## 7. Development & Git Workflow

- **Branch Naming:** Never push directly to `main`. Create a feature branch:
  ```bash
  git checkout -b feature/<your-name>/<feature-name>
  ```
