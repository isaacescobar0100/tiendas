# 🛍️ MiTienda — E-commerce multi-tienda

Plataforma de e-commerce con **tres niveles de acceso**:

- **Superadmin** — gestiona todas las tiendas de la plataforma y sus administradores.
- **Admin** — dueño de una tienda; gestiona su catálogo (productos y categorías).
- **Público** — cada tienda tiene su escaparate en `/[slug-de-la-tienda]`.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL** con **Prisma** ORM
- **Auth.js (NextAuth v5)** con credenciales y roles

## Puesta en marcha

### 1. Base de datos PostgreSQL

Necesitas una base de datos PostgreSQL. La opción más rápida y gratuita es
[Neon](https://neon.tech) o [Supabase](https://supabase.com):

1. Crea un proyecto y copia la **connection string**.
2. Pégala en `.env` como `DATABASE_URL`.

> Alternativa local con Docker:
> ```bash
> docker run --name tienda-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tienda -p 5432:5432 -d postgres
> ```

### 2. Variables de entorno

Ya existe un `.env` con un `AUTH_SECRET` generado. Solo ajusta `DATABASE_URL`.
Para regenerar el secreto: `openssl rand -base64 32`.

### 3. Instalar, crear tablas y sembrar datos

```bash
npm install
npm run db:push     # crea las tablas en la base de datos
npm run db:seed     # datos de ejemplo (superadmin + tienda demo)
npm run dev
```

Abre http://localhost:3000

## Usuarios de ejemplo (tras `db:seed`)

| Rol        | Email                    | Contraseña    | Entra en        |
|------------|--------------------------|---------------|-----------------|
| Superadmin | `super@mitienda.com`     | `password123` | `/superadmin`   |
| Admin      | `admin@modacentral.com`  | `password123` | `/admin`        |

- Tienda pública de ejemplo: http://localhost:3000/moda-central
- Login: http://localhost:3000/login

## Rutas principales

| Ruta                         | Descripción                                    |
|------------------------------|------------------------------------------------|
| `/`                          | Directorio público de tiendas                  |
| `/[storeSlug]`               | Escaparate de una tienda                        |
| `/[storeSlug]/[productSlug]` | Detalle de producto (añadir al carrito)         |
| `/[storeSlug]/cart`          | Carrito de la tienda                            |
| `/[storeSlug]/checkout`      | Datos del cliente y confirmación del pedido     |
| `/[storeSlug]/checkout/success` | Pedido confirmado                            |
| `/login`                     | Acceso para admin y superadmin                  |
| `/superadmin`                | Panel de plataforma (crear/gestionar tiendas)   |
| `/admin`                     | Panel de tienda (catálogo)                       |
| `/admin/categories`          | Categorías de la tienda                          |

## Modelo de datos

- **User** — `role: SUPERADMIN | ADMIN`. Un admin es dueño de una `Store`.
- **Store** — tienda con `slug` único (su URL pública).
- **Category** — categorías por tienda.
- **Product** — precio en céntimos (`priceCents`), stock, imagen, estado.
- **Order** / **OrderItem** — pedidos por tienda. Los ítems guardan una copia
  (nombre y precio) del producto en el momento de la compra; el stock se
  descuenta de forma atómica al confirmar el pedido.

Ver [`prisma/schema.prisma`](prisma/schema.prisma).

## Comandos útiles

```bash
npm run db:studio    # explorar la BD con Prisma Studio
npm run db:migrate   # crear una migración versionada
npm run build        # build de producción
```

## Siguientes fases (roadmap)

- ✅ Carrito y checkout (pedido sin pago real)
- 📦 Panel de pedidos en `/admin` (ver y gestionar ventas)
- 💳 Pasarela de pago (Stripe)
- 🖼️ Subida de imágenes (en vez de URL)
- 🌐 Subdominios o dominios propios por tienda
