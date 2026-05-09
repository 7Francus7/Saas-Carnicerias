<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Setup después de cambios en schema

```bash
# 1. Generar cliente Prisma
npx prisma generate

# 2. Crear migración
npx prisma migrate dev --name <descripcion>

# 3. Seed (opcional, datos demo)
npx prisma db seed

# 4. Build
npm run build
```
