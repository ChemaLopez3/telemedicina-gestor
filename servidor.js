// =========================================================
// Arranque de los servidores (PRÁCTICA 3 - Parte 3: preparado para Render)
// =========================================================

// 1) Configuración: en local se lee del archivo .env; en Render, de su panel (Environment)
try {
    process.loadEnvFile(__dirname + "/.env");
} catch (e) { } // en Render no hay archivo .env: las variables ya vienen puestas
process.env.TZ = "Europe/Madrid"; // fechas en hora de España (los servidores de Render usan hora UTC)

// 2) Servidor web: aplicación del gestor + API REST (puerto process.env.PORT en Render, 3000 en local)
var servidorWeb = require("./servidor_rest.js");

// 3) Avisos por WebSocket, sobre el mismo servidor web
var iniciarWSAvisos = require("./servidor_ws.js");
iniciarWSAvisos(servidorWeb);

// 4) Servidor RPC de la app del sanitario: solo en local (en Render solo publicamos el gestor)
if (!process.env.RENDER) {
    require("./servidor_rpc.js");
}
