# @cobradiario/web — Panel admin (Next.js 15 + shadcn/ui)

Panel para dueños/supervisores: login, cartera con stats, crear crédito y registrar abonos,
con actualización **en tiempo real** (Socket.IO) cuando entra un pago.

## Stack
Next.js 15 (App Router) · React 19 · Tailwind 3 · componentes estilo shadcn/ui
(`class-variance-authority` + Radix) · `socket.io-client` · `sonner` (toasts).

## Arrancar
```bash
# 1. Backend arriba (desde la raíz): pnpm db:up && pnpm api:dev
# 2. Web:
pnpm --filter @cobradiario/web dev     # http://localhost:3000
```
Login demo: `owner@demo.com` / `Password123`.

## Configuración
Por defecto apunta a `http://localhost:4000`. Para cambiarlo, crea `web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

## Estructura
```
src/
├─ app/            # rutas: / (redirect), /login, /dashboard
├─ components/
│  ├─ ui/          # primitivos shadcn (button, card, input, dialog, table, badge…)
│  ├─ auth-provider.tsx      # contexto de sesión + guard
│  ├─ create-loan-dialog.tsx
│  └─ pay-dialog.tsx
└─ lib/            # api (gql fetch + tokens), graphql (queries tipadas), socket, utils
```

## Realtime
`lib/socket.ts` conecta al gateway con el JWT; el dashboard escucha `payment.registered`
y refresca la cartera + muestra un toast. Verificado end-to-end contra el backend.

## Próximo
Refresh automático de token (401 → refresh), detalle de crédito con plan de cuotas,
gestión de rutas/cobradores, dashboards con gráficas (Recharts).
