# Gym Tracker — frontend

Interfaz SvelteKit del tracker personal de gimnasio. Registra rutinas, ejercicios y sesiones; el análisis de sobrecarga progresiva se calcula en la interfaz a partir de los datos entregados por la API.

El backend vive en el proyecto hermano [`gym-tracker-api`](../gym-tracker-api/README.md), implementado con Actix Web y MongoDB. Este proyecto no abre conexiones a la base de datos, no gestiona contraseñas y no contiene reglas de autorización de datos.

## Desarrollo local

Se necesitan [Bun](https://bun.sh), una instancia MongoDB y la API en ejecución.

```bash
# Frontend
cd gym-tracker
bun install
cp .env.example .env
bun run dev

# En otra terminal, API
cd ../gym-tracker-api
cp .env.example .env
cargo run
```

Por defecto, el frontend se abre en `http://localhost:5173` y llama a la API en `http://localhost:8080`. Al usar Vite, configura en la API `FRONTEND_ORIGIN=http://localhost:5173`; para la imagen de producción del frontend, usa `http://localhost:3000` o el dominio público final en ambos servicios.

## Variables del frontend

| Variable  | Descripción                                                                        |
| --------- | ---------------------------------------------------------------------------------- |
| `API_URL` | URL interna, servidor-a-servidor, de `gym-tracker-api`. No se expone al navegador. |
| `ORIGIN`  | URL pública de SvelteKit; obligatoria en producción para acciones de formulario.   |
| `PORT`    | Puerto del frontend (por defecto `3000` en la imagen Docker).                      |

Consulta el README de la API para `MONGODB_URI`, `ADMIN_PASSWORD`, cookies, CORS/CSRF y el resto de configuración de seguridad.

## Uso sin conexión

La web es una PWA *offline-first*. Tras iniciar sesión una vez con conexión, guarda en IndexedDB los ejercicios, rutinas, calendario y sesiones del usuario; el service worker conserva las pantallas visitadas y los recursos de la aplicación. Los cambios hechos sin red se aplican al instante en el dispositivo y quedan en una cola local.

Al volver la conexión (o al abrir de nuevo la app), la cola se sincroniza de forma idempotente contra la API. El indicador junto a la cuenta muestra si está sincronizada, sin conexión o si existen cambios pendientes. Cerrar sesión borra tanto los datos locales como las páginas personalizadas cacheadas en ese navegador.

La primera carga y el primer inicio de sesión requieren internet; una PWA no puede descargar datos de una cuenta que nunca se haya abierto en el dispositivo.

## Verificación

```bash
bun run check
bun run lint
bun test
bun run build
```

## Despliegue

Despliega `gym-tracker-api` y `gym-tracker` como servicios separados. Configura el `API_URL` del frontend con la URL privada/interna de la API, y en la API configura `FRONTEND_ORIGIN` con la URL HTTPS pública del frontend. Ambos valores deben apuntar al mismo origen público para que la protección CSRF permita las mutaciones.
