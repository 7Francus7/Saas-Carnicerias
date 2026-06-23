# 📋 Checklist de deploy a producción — Carnify

> **Contexto:** Vercel auto-deploya al pushear a `main`. El build (`prisma generate && next build`)
> **NO** aplica migraciones. La DB es **Neon producción** (branch `production`).
> Por eso el orden importa: **las migraciones se aplican ANTES de pushear el código.**

## ⚠️ ADVERTENCIA GRANDE — ORDEN OBLIGATORIO

```
PITR verificado  →  migrate deploy  →  git push (deploy Vercel)  →  smoke test
```

**NO PUSHEES EL CÓDIGO ANTES DE APLICAR LAS MIGRACIONES.**

Si pusheás primero, Vercel deploya código que lee/escribe columnas (`idempotencyKey`,
`active`) que todavía no existen en la DB → **toda venta y toda lectura de productos
falla**. Las migraciones son additivas, así que aplicarlas primero **no rompe** el código
viejo que está corriendo (su Prisma client simplemente ignora las columnas nuevas). Sin downtime.

> **Nota — commit de performance (P0, sin migración):** este deploy también incluye el
> commit `513c98d` (Sidebar persistente vía route group `(app)`, `loading.tsx`, dedup de
> permisos con `React.cache()`). **No toca el schema ni agrega migraciones** — es solo
> reestructura de rutas y código. El orden crítico de abajo **no cambia**: igual hay que
> aplicar las 3 migraciones pendientes ANTES de pushear, porque el push lleva ambos cambios
> (migraciones de negocio + performance) en el mismo deploy de Vercel.

---

## 0. Pre-vuelo
- [ ] Ventana de deploy acordada (idealmente con caja cerrada / fuera de horario).
- [ ] Estás en `main`, build local verde (typecheck/lint/build).
- [ ] Dashboards de Neon y Vercel abiertos.

## 1. Backup / PITR en Neon (obligatorio antes de tocar nada)
- [ ] Neon Console → proyecto `ep-steep-union-amsvtbxa` → branch `production`.
- [ ] **Backup & Restore** → confirmar **Point-in-Time Restore** habilitado y anotar la ventana.
- [ ] **Anotar el timestamp ART de AHORA** (punto de retorno). Ej: `2026-06-23 01:05 ART`.
- [ ] (Opcional recomendado) Crear un branch de respaldo en Neon desde el estado actual.

## 2. Las 3 migraciones pendientes (additivas, nullable/default)

| # | Migración | SQL | Riesgo |
|---|---|---|---|
| 1 | `20260623033323_add_sale_idempotency_key` | `ALTER TABLE "sale" ADD COLUMN "idempotencyKey" TEXT;` + índice único `sale_idempotencyKey_key` | bajo |
| 2 | `20260623034515_add_product_active` | `ALTER TABLE "product" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;` | bajo |
| 3 | `20260623035740_add_client_active` | `ALTER TABLE "client" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;` | bajo |

Todas additivas: columnas nuevas, sin tocar datos existentes, reversibles.

## 3. Aplicar migraciones (ANTES de pushear código)
- [ ] Confirmar que `.env` local apunta a la **DB de producción** (`DATABASE_URL` Neon `production`).
- [ ] Ver pendientes:
  ```bash
  npx prisma migrate status
  ```
  Esperado: las 3 listadas como *pending*.
- [ ] Aplicar (no resetea, solo aplica pendientes en orden):
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Re-verificar:
  ```bash
  npx prisma migrate status   # → "Database schema is up to date"
  ```
- [ ] Sanity SQL (opcional, en Neon SQL editor):
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name IN ('sale','product','client')
    AND column_name IN ('idempotencyKey','active');
  ```
  Esperado: 3 filas.

> En este punto la DB ya tiene las columnas y el código **viejo** sigue funcionando normal. Sin downtime.

## 4. Deploy del código
- [ ] Push a `main` → dispara build+deploy en Vercel:
  ```bash
  git push origin main
  ```
- [ ] En Vercel: esperar build verde (`prisma generate && next build`).
- [ ] Confirmar **Promoted to Production**.

## 5. Smoke test (en producción, con caja real o tenant de prueba)
- [ ] **Abrir caja** → fondo inicial OK.
- [ ] **Venta contado** → descuenta stock, aparece en "ventas de la sesión".
- [ ] **Venta fiado** (cliente con límite) → suma al saldo del cliente, movimiento creado.
- [ ] **Pago de cliente** (efectivo) → baja saldo + registra ingreso de caja.
- [ ] **Anular venta** → repone stock, revierte fiado, queda greyed-out con motivo.
- [ ] **Doble submit / reintento** (click rápido o recargar tras cobrar) → **NO** crea venta duplicada (idempotencyKey).
- [ ] **Crear producto** → aparece en POS y productos.
- [ ] **Borrar producto** → desaparece de listados/POS, pero **sus ventas históricas siguen** en reportes.
- [ ] **Crear cliente** → aparece en lista y selector POS.
- [ ] **Borrar cliente con saldo ≠ 0** → **bloqueado** con mensaje. Con saldo 0 → desaparece de listas, su historial sigue.
- [ ] **Revisar stock** → inventario coherente tras las ventas/anulación de arriba.
- [ ] **Cierre de caja** → teórico correcto (fiado excluido, electrónicos cuadran), diff persistido bien.
- [ ] **Dashboard** → revenue/órdenes/alertas de stock/top productos coherentes.

## 6. Rollback

### Falla el CÓDIGO (post-deploy)
- [ ] Vercel → Deployments → deployment anterior → **Promote / Rollback** (instantáneo).
- [ ] Las migraciones additivas pueden **quedarse** — el código viejo las ignora. No hace falta tocar la DB.

### Falla una MIGRACIÓN a mitad (raro, son additivas e independientes)
- [ ] `npx prisma migrate status` para ver cuál quedó aplicada.
- [ ] Como son independientes y additivas, normalmente se puede **re-correr** `npx prisma migrate deploy`.
- [ ] Solo si la DB quedó inconsistente: **Neon PITR** al timestamp del paso 1.

### Botón de pánico (corrupción de datos)
- [ ] Neon → Restore → al timestamp ART anotado en el paso 1.
- [ ] Verificar con script `tsx` + `import "dotenv/config"` antes de re-deployar.

---

**Orden resumido:** `PITR verificado → migrate deploy → git push → Vercel deploy → smoke test → (rollback si hace falta)`.
