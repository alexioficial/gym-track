# 🏋️ Gym Tracker

Tracker personal de gimnasio con foco en **sobrecarga progresiva**: registra tus rutinas, los ejercicios de
cada día y tus sesiones, y cada semana te dice en qué mejoraste por ejercicio (más peso, más reps, ambos o más
volumen).

- **SvelteKit** (Svelte 5 runes) + **TypeScript**
- **MongoDB** (driver oficial)
- **Bun** como runtime/gestor de paquetes
- **Tailwind 4**, tema oscuro (amarillo + grises/negros), minimalista, mobile-first
- **Dockerfile** listo para deploy en **Coolify**
- Protección con **PIN** (una sola persona)

## Cómo funciona la sobrecarga progresiva

Por cada ejercicio, agrupamos tus sets por **semana** y calculamos:

- **Volumen** = Σ (peso × reps) de todos los sets.
- **e1RM (1RM estimado)** con la fórmula de **Epley**: `1RM = peso × (1 + reps / 30)` — buena aproximación en 2–10 reps.
- **Top set** = tu mejor set (más peso, y las reps a ese peso).

Comparamos la última semana contra la anterior y te decimos el veredicto: **más peso**, **más reps**, **ambos**,
**más volumen**, igual o bajó.

## Desarrollo local

Requisitos: [Bun](https://bun.sh) y una instancia de MongoDB (Atlas gratis, o un Mongo local).

```bash
# 1. Instalar dependencias
bun install

# 2. Variables de entorno
cp .env.example .env
# edita .env con tu MONGODB_URI, AUTH_PIN y SESSION_SECRET

# 3. Arrancar en modo dev
bun run dev
```

Abre http://localhost:5173, entra con tu `AUTH_PIN` y empieza a registrar.

Verificar tipos: `bun run check`

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `MONGODB_URI` | Cadena de conexión a MongoDB. |
| `MONGODB_DB` | Nombre de la base de datos (ej. `gym_tracker`). |
| `AUTH_PIN` | PIN/contraseña para entrar. |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión (`openssl rand -hex 32`). |
| `ORIGIN` | URL pública. **Obligatoria en prod** para los form actions (CSRF). |
| `PORT` | Puerto del servidor (default 3000). |

## Deploy en Coolify

1. Sube este proyecto a un repo de GitHub.
2. En Coolify crea una aplicación desde ese repo y cambia el **Build Pack** de Nixpacks a **Dockerfile** (usa el `Dockerfile` de la raíz).
3. Define las variables de entorno de la tabla anterior. `ORIGIN` debe ser la URL final con `https://` (ej. `https://gym.tudominio.com`).
4. La app escucha en el puerto **3000** (ya expuesto en el Dockerfile).
5. Para `MONGODB_URI` usa un MongoDB Atlas o un servicio MongoDB creado en el mismo Coolify.

## Build de producción (local)

```bash
docker build -t gym-tracker .
docker run --rm -p 3000:3000 --env-file .env gym-tracker
```
