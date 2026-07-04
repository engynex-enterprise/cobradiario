# @cobradiario/app — App móvil del cobrador (Expo + React Native)

App para cobradores: inicio de sesión, **ruta del día** (cartera) y **registro de abonos
offline-first** con cola idempotente que se sincroniza al recuperar señal, más actualización
en tiempo real (Socket.IO).

## Stack
Expo SDK 57 · React Native 0.86 · React 19 · **Expo Router** (rutas en `src/app`) ·
expo-secure-store (tokens) · AsyncStorage (cola offline) · socket.io-client.

## Arrancar
```bash
# Backend arriba (desde la raíz): pnpm db:up && pnpm api:dev
pnpm --filter @cobradiario/app start      # abre Expo (QR / simulador)
# o: pnpm --filter @cobradiario/app ios
```
Login demo: `cobrador@demo.com` / `Password123`.

> API: por defecto `http://localhost:4000`. En dispositivo físico cambia `extra.apiUrl` /
> `extra.wsUrl` en `app.json` por la IP LAN de tu PC (ej. `http://192.168.1.10:4000`).

## Offline-first (diferenciador)
`src/lib/offline-queue.ts` encola cada abono con un `clientRequestId` único y lo persiste en
AsyncStorage. Como el backend es **idempotente** por esa clave, reenviar un abono cuyo response
se perdió por falta de señal **no genera doble cobro**. La cola se drena automáticamente al
volver la conexión; los errores de negocio se descartan, los de red se reintentan.

## Estructura
```
src/
├─ app/                 # Expo Router
│  ├─ _layout.tsx       # providers (auth, safe-area, gestures)
│  ├─ index.tsx         # redirect según sesión
│  ├─ login.tsx
│  └─ (app)/            # grupo autenticado (guard)
│     ├─ _layout.tsx
│     └─ index.tsx      # ruta del día + abono + realtime
└─ lib/                 # api, graphql, auth, socket, offline-queue, format
```

## Verificado
- `tsc --noEmit` limpio.
- `expo export --platform ios` empaqueta 1580 módulos → bundle Hermes OK.

## Pendiente
- Reemplazar `Alert.prompt` (solo iOS) por un modal propio para Android.
- Detección de conectividad con `@react-native-community/netinfo` para auto-flush en background.
- Geolocalización del abono (`expo-location`), notificaciones push (`expo-notifications`).
