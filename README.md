# Telemedicina 26/27 · Aplicación del gestor

Servidor Node.js y aplicación web del **gestor** de recursos sanitarios (Telemedicina y Teleasistencia, curso 26/27).
Práctica 3: integración con el Ministerio de Sanidad, seguridad con JWT y despliegue en la nube.

## Qué hace cada parte

| Parte | Qué se ha hecho |
|---|---|
| **1. Integración** | El gestor obtiene todas las reservas del servidor (varios GET), **valida cada una** (campos vacíos o incorrectos se descartan con su motivo) y envía la remesa al Ministerio en **un POST** con `id_area: 5`. La vista principal muestra un **ranking de reservas por área médica** con los datos del Ministerio. |
| **2. Seguridad (JWT)** | Al hacer login el servidor devuelve un **token JWT** (caduca en 1 hora). Todos los servicios `/api` del gestor y el WebSocket de avisos exigen un token válido. |
| **3. Despliegue** | Base de datos **PostgreSQL en Supabase**, código en **GitHub** y servidor publicado en **Render**. |

## Estructura

```
servidor.js          Arranque: configuración, servidor web + WebSocket (+ RPC solo en local)
servidor_rest.js     API REST del gestor y archivos de la web (/gestor)
servidor_ws.js       Avisos por WebSocket (mismo puerto que la web)
servidor_rpc.js      Servidor RPC de la app del sanitario (solo en local)
autenticacion.js     Crear y comprobar tokens JWT
conexion.js          Conexión con PostgreSQL (Supabase)
cliente_rest/        Aplicación web del gestor
cliente_rpc/         Cliente web del sanitario (prácticas anteriores)
sql/esquema.sql      Tablas de la base de datos para Supabase
.env.example         Variables de configuración necesarias (plantilla)
```

## Configuración

El servidor necesita dos variables de entorno. **Nunca se escriben en el código** (este repositorio es público):

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Conexión a Supabase (*Connect → Direct → Session pooler*, puerto 5432) |
| `JWT_SECRET` | Clave secreta para firmar los tokens |

En local se ponen en un archivo `.env` (copia de `.env.example`), que no se sube a GitHub.
En Render se ponen en el panel del servicio → **Environment**.

## Ejecutar en local

```bash
npm install
node servidor.js
```

Aplicación del gestor: <http://localhost:3000/gestor/>

> Algunas redes (por ejemplo, la de la universidad) bloquean el puerto 5432 de las bases de datos externas y el servidor no podrá conectar con Supabase. En ese caso hay que usar otra red (por ejemplo, el móvil) o la versión publicada en Render.

## Base de datos

En Supabase → **SQL Editor**, ejecutar `sql/esquema.sql` para crear las tablas. Los datos de prueba no están en el repositorio.

## Despliegue en Render

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Variables de entorno:** `DATABASE_URL` y `JWT_SECRET`

Cada `push` a la rama `main` vuelve a desplegar la aplicación automáticamente.
En el plan gratuito el servidor se duerme tras un rato sin uso: la primera visita puede tardar unos 50 segundos.
