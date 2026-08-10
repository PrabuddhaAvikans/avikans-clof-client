# Avikans Solution — Client

Enterprise React frontend for custom lighting product management, quotations, sales orders, manufacturing, inventory, delivery, and user administration.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4
- React Router, Redux Toolkit, TanStack Query & Table
- React Hook Form + Zod
- Recharts, Lucide React, Sonner, date-fns

## Getting started

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

```bash
npm run build    # typecheck + production build
npm run preview  # preview production build
```

## Architecture

```
Page → Feature hook → Service interface → Mock service
```

Mock APIs live under `src/services/`. Swap implementations in `src/services/index.ts` when connecting to the .NET REST API.

## Key routes

| Area | Path |
|------|------|
| Dashboard | `/dashboard` |
| Products | `/products`, `/products/new`, `/products/:id/edit` |
| Inventory | `/inventory`, `/inventory/movements`, `/inventory/low-stock` |
| Customers | `/customers`, `/customers/new`, `/customers/:id` |
| Estimates | `/estimates`, `/estimates/new`, `/estimates/:id/preview` |
| Sales orders | `/sales-orders`, `/sales-orders/:id/review` |
| Manufacturing | `/manufacturing/jobs`, `/manufacturing/board`, `/manufacturing/quality` |
| Deliveries | `/deliveries`, `/deliveries/:id/dispatch`, `/deliveries/:id/proof` |
| Admin | `/admin/users`, `/admin/roles`, `/admin/settings` |

Mock user: **Prabuddha Jayawardhana** (Admin) with full permissions.
