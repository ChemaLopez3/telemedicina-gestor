// =========================================================
// PRÁCTICA 3 - Parte 2: autenticación con JWT
// Funciones compartidas por el servidor REST (servidor_rest.js) y el de WebSocket (servidor_ws.js)
// =========================================================
var jwt = require("jwt-simple");

// Clave para codificar / decodificar el token. Se lee de una variable de entorno (archivo .env en local,
// panel de Render en la nube) y NUNCA se escribe en el código: el repositorio de GitHub es público
// y cualquiera que conociera la clave podría fabricarse tokens válidos.
var clave = process.env.JWT_SECRET;
if (!clave) {
    console.error("Falta la variable JWT_SECRET con la clave de los tokens (mira el archivo .env.example)");
    process.exit(1);
}
var DURACION_TOKEN = 60 * 60 * 1000; // el token caduca en 1 hora (en ms)

// Crea el token de un gestor: guardamos su id y cuándo caduca
function crearToken(idGestor) {
    var contenido = {
        usuario: idGestor,
        expira: Date.now() + DURACION_TOKEN
    };
    return jwt.encode(contenido, clave);
}

// Comprueba un token. Si es válido devuelve su contenido; si no, lanza un Error con el motivo
function comprobarToken(token) {
    if (!token) {
        throw new Error("No se ha encontrado token");
    }

    var contenido;
    try { // si el token no está firmado con nuestra clave, decode lanza un error
        contenido = jwt.decode(token, clave);
    } catch (error) {
        throw new Error("El token es incorrecto");
    }

    if (!contenido || !contenido.expira || !contenido.usuario) {
        throw new Error("El formato del token no es adecuado");
    }
    if (contenido.expira < Date.now()) {
        throw new Error("El token ha expirado");
    }
    return contenido;
}

module.exports = {
    crearToken: crearToken,
    comprobarToken: comprobarToken
};
