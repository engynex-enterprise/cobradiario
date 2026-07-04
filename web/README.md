# @cobradiario/web — Panel admin (Next.js + shadcn/ui)

⏳ **Pendiente (siguiente fase).** Panel para dueños/supervisores: cartera, rutas, caja,
reportería y dashboards en tiempo real.

## Bootstrap previsto
```bash
cd web
pnpm create next-app@latest . --ts --app --tailwind --eslint
pnpm dlx shadcn@latest init
# libs clave: @apollo/client (o urql), socket.io-client, @tanstack/react-query,
#             recharts (gráficas), zod, react-hook-form
```

Consumirá el mismo esquema GraphQL de `@cobradiario/api` y se suscribirá a eventos realtime.
