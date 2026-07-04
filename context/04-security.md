# Seguridad — Modelo de amenazas y controles

Es una plataforma que mueve **dinero** y datos personales (deudores). El estándar es alto.

## Auditoría de amenazas (STRIDE resumido) y severidad
| # | Amenaza | Escenario de ataque | Sev. | Control |
|---|---|---|---|---|
| 1 | **Fuga entre tenants** (IDOR) | Usuario del tenant A consulta `loanId` del tenant B | **Crítica** | `tenantId` inyectado desde JWT en cada query (Prisma extension); nunca del cliente; RLS en prod |
| 2 | **Escalada de privilegios** | Cobrador ejecuta mutación de admin (aprobar crédito) | Alta | Guards RBAC por `@Roles()`; verificación en service, no solo en resolver |
| 3 | **Robo/replay de refresh token** | Token filtrado reutilizado | Alta | Refresh rotado + hasheado en DB; detección de reuso → revoca familia de tokens |
| 4 | **Doble cobro / doble abono** | Reintento offline duplica el pago | Alta | Idempotencia por `clientRequestId` único (tenant, clientRequestId) |
| 5 | **Inyección** | Input malicioso en filtros/reportes | Alta | Prisma parametriza; prohibido `$queryRawUnsafe` con concatenación; validación `class-validator` |
| 6 | **Manipulación de montos** | Cliente envía `tenantId`/`interes` en el input | Alta | DTOs whitelist (`forbidNonWhitelisted`); montos derivados del producto en servidor |
| 7 | **Fuerza bruta a login** | Credential stuffing | Media | Rate limit por IP+usuario (throttler), bcrypt, lockout progresivo |
| 8 | **DoS por queries GraphQL** | Query profundamente anidada / batch enorme | Media | Límite de profundidad y complejidad, `csrfPrevention`, disable introspection en prod |
| 9 | **Exposición de PII** | Logs con cédulas/teléfonos | Media | Redacción en logger; cifrado en reposo (DB) + TLS en tránsito |
| 10 | **Secretos en repo** | `.env` commiteado | Media | `.env` en `.gitignore`; secretos vía gestor (AWS SM / Doppler) en prod |

## Controles implementados en la Fundación
- Passwords con **bcrypt** (rounds vía `BCRYPT_ROUNDS`).
- JWT access/refresh; refresh hasheado y revocable en tabla `RefreshToken`.
- Validación global de DTOs: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- `helmet`, CORS por allow-list (`CORS_ORIGINS`), rate limiting (`@nestjs/throttler`).
- Aislamiento por tenant en capa de aplicación (extension de Prisma).
- Manejo central de errores que **no filtra** stack traces en prod.

## Pendiente antes de producción (checklist de hardening)
- [ ] Activar **RLS** en Postgres (migración dedicada) + `SET app.tenant_id` por request.
- [ ] Límite de **profundidad/complejidad** GraphQL + desactivar introspection/playground en prod.
- [ ] Rotación de secretos vía gestor gestionado (no `.env`).
- [ ] Cifrado de columnas PII sensibles / TDE del proveedor.
- [ ] Auditoría (`AuditLog`) cubriendo todas las mutaciones financieras.
- [ ] Escaneo SAST/deps (CodeQL, `pnpm audit`, Trivy en imágenes) en CI.
- [ ] Backups automáticos + prueba de restore; retención y point-in-time recovery.
- [ ] 2FA para roles OWNER/ADMIN.
