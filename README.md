# GetPass — Gestor de Contraseñas Zero-Knowledge

GetPass es un gestor de contraseñas súper seguro diseñado en Next.js 16 donde **el servidor nunca ve tus datos reales**. Toda la información se cifra y descifra directamente en tu navegador mediante la Web Crypto API (AES-256-GCM y PBKDF2), garantizando privacidad absoluta.

---

## ⚙️ Configuración de la Base de Datos

GetPass utiliza PostgreSQL y Drizzle ORM a través de un pool de conexiones `pg` (`node-postgres`) optimizado para entornos de producción, compatible al 100% tanto con bases de datos gestionadas (Railway PostgreSQL, Neon, Supabase, Render) como con PostgreSQL local o Docker.

---

### Opción 1: Despliegue en Railway (Recomendado 🚀)

El proyecto cuenta con `railway.json` y `nixpacks.toml` listos para desplegar en [Railway.app](https://railway.app) en pocos minutos con migración automática de base de datos.

#### Paso a Paso para Railway:

1. **Subir el código a GitHub:**
   Asegúrate de que los cambios de tu proyecto estén en tu repositorio de GitHub.

2. **Crear Proyecto en Railway:**
   - Ve a [railway.app](https://railway.app/) e inicia sesión con tu cuenta de GitHub.
   - Haz clic en **"New Project"** -> **"Deploy from GitHub repo"** y selecciona tu repositorio `get-pass`.

3. **Añadir la Base de Datos PostgreSQL:**
   - Dentro del panel de tu proyecto en Railway, haz clic en **"+ New"** (o presiona `Ctrl+K` / `Cmd+K`).
   - Selecciona **"Database"** -> **"Add PostgreSQL"**.
   - Railway aprovisionará una base de datos PostgreSQL privada inmediatamente.

4. **Configurar las Variables de Entorno en el Servicio Web:**
   - Haz clic en tu servicio web de `get-pass` y ve a la pestaña **"Variables"**.
   - Haz clic en **"New Variable"** y añade las siguientes:

     | Variable | Valor / Configuración |
     | :--- | :--- |
     | `DATABASE_URL` | Haz clic en **"Add Reference"** y selecciona `Postgres.DATABASE_URL` (o `DATABASE_PRIVATE_URL`) |
     | `JWT_SECRET` | Genera una clave aleatoria segura de 32+ caracteres |
     | `JWT_REFRESH_SECRET` | Genera otra clave aleatoria segura de 32+ caracteres |
     | `NODE_ENV` | `production` |
     | `NEXT_PUBLIC_APP_URL` | Tu dominio asignado por Railway (ej. `https://tu-app.up.railway.app`) |

     > **Generar Secretos JWT:**
     > Puedes generar secretos seguros ejecutando en tu terminal:
     > ```bash
     > openssl rand -base64 32
     > ```

5. **Generar Dominio Público:**
   - En tu servicio web en Railway, ve a la pestaña **"Settings"** -> sección **"Networking"**.
   - Haz clic en **"Generate Domain"** (creará una URL del estilo `https://getpass-production.up.railway.app`).
   - Copia esa URL y asegúrate de que esté configurada en la variable `NEXT_PUBLIC_APP_URL`.

6. **Despliegue y Migraciones Automáticas:**
   - Railway detectará `railway.json` y ejecutará automáticamente `npm run build` y, al arrancar, `npm run db:push && npm run start`, creando todas las tablas en PostgreSQL automáticamente sin necesidad de comandos manuales.
   - El endpoint de salud `/api/health` mantendrá monitorizado el servicio.

---

### Opción 2: Desarrollo Local (con Neon o DB local)

1. **Configurar `.env.local`:**
   Copia `.env.example` a `.env.local` y coloca tus credenciales:
   ```env
   DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/getpass"
   JWT_SECRET="clave_secreta_super_larga_1"
   JWT_REFRESH_SECRET="clave_secreta_super_larga_2"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   NODE_ENV="development"
   ```

2. **Sincronizar el Esquema:**
   ```bash
   npm run db:push
   ```

3. **Arrancar en Desarrollo:**
   ```bash
   npm run dev
   ```

---

### Opción 3: Despliegue en Render.com

El proyecto también incluye `render.yaml` para despliegues como Blueprint en Render.com.
