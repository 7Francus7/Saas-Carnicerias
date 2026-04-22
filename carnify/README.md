# Carnify — Sistema de Gestión para Carnicerías

El sistema más completo para gestionar tu carnicería. Control de ventas, stock, clientes, caja y más.

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Estilos**: CSS + Tailwind CSS 4
- **Base de datos**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: Better Auth
- **Estado**: Zustand

## Getting Started

### 1. Clonar y configurar

```bash
git clone <tu-repo>
cd carnify
npm install
```

### 2. Variables de entorno

Crea `.env` basado en `.env`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# Better Auth
BETTER_AUTH_SECRET="tu-secreto-aqui"
BETTER_AUTH_URL="https://tu-dominio.vercel.app"

# Google OAuth (opcional)
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"

# App
NEXT_PUBLIC_APP_URL="https://tu-dominio.vercel.app"
```

### 3. Deploy en Vercel

1. Sube el proyecto a GitHub
2. Ve a [Vercel](https://vercel.com/new)
3. Importa el repo
4. Añade las variables de entorno en Vercel dashboard
5. Deploy

**Importante**: Cambia `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` a tu dominio de producción antes de hacer deploy.

## Desarrollo local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Features

- ✅ Dashboard con stats en tiempo real
- ✅ POS (Punto de Venta) rápido
- ✅ Gestión de productos con PLU
- ✅ Control de caja y arqueo
- ✅ Cuenta corriente de clientes
- ✅ Gestión de personal y permisos
- ✅ Reportes y gráficos
- ✅ Sistema multi-tenant (varias carnicerías)

## License

MIT