# @cobradiario/app — App móvil (Expo / React Native)

⏳ **Pendiente (siguiente fase).** App para cobradores (cobro en ruta, offline-first) y clientes.

## Bootstrap previsto
```bash
cd app
pnpm create expo-app@latest . --template            # Expo SDK 57 + Expo Router
# libs clave: @apollo/client, socket.io-client, expo-notifications,
#             expo-location, @nozbe/watermelondb (offline), zustand
```

Ver decisiones en `../context/03-adr-decisions.md` (ADR-002) y flujos offline en
`../context/01-architecture.md` §4.2.
