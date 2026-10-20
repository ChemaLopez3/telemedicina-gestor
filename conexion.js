// =========================================================
// PRÁCTICA 3 - Parte 3: conexión con la base de datos PostgreSQL de Supabase
// Sustituye a conexion_mysql.js. Se usa igual que la conexión de MySQL:
//     conexion.query(sql, [valores], function (err, resultado) { ... })
// así las consultas de servidor_rest.js y servidor_rpc.js no cambian.
// =========================================================
var pg = require("pg");

if (!process.env.DATABASE_URL) {
    console.error("Falta la variable DATABASE_URL con la conexión a Supabase (mira el archivo .env.example)");
    process.exit(1);
}

// Quitamos sslmode de la URL: el cifrado lo configuramos abajo
var url = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/, "");
var esLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

var pool = new pg.Pool({ // un "pool" mantiene varias conexiones abiertas y las reutiliza
    connectionString: url,
    ssl: esLocal ? false : { rejectUnauthorized: false }, // Supabase exige conexión cifrada (SSL)
    max: 5 // el plan gratuito de Supabase limita las conexiones
});

// Cada conexión trabaja en hora de España: así NOW() guarda la hora local, como hacía MySQL
pool.on("connect", function (cliente) {
    cliente.query("SET TIME ZONE 'Europe/Madrid'");
});

// Si se corta una conexión que estaba sin usar, lo avisamos pero el servidor sigue funcionando
pool.on("error", function (err) {
    console.error("Error en una conexión con la base de datos:", err.message);
});

// Al arrancar comprobamos que la base de datos responde
pool.query("SELECT 1", function (err) {
    if (err) {
        console.error("Error en la conexión de la base de datos:", err.message);
        process.exit(1);
    }
    console.log("Conectado a la base de datos PostgreSQL");
});

function query(sql, valores, callback) {
    if (typeof valores === "function") { // query(sql, callback) sin valores
        callback = valores;
        valores = [];
    }

    // 1) MySQL usa ? para los valores y PostgreSQL usa $1, $2, $3...
    var n = 0;
    var sqlPostgres = sql.replace(/\?/g, function () {
        n++;
        return "$" + n;
    });

    // 2) MySQL devuelve el id del INSERT en insertId; en PostgreSQL hay que pedirlo con RETURNING id
    var esInsert = /^\s*INSERT/i.test(sqlPostgres);
    if (esInsert) sqlPostgres += " RETURNING id";

    pool.query(sqlPostgres, valores, function (err, resultado) {
        if (err) {
            // 3) Error de clave ajena (ej: borrar un recurso con reservas): mismo código que en MySQL
            if (err.code === "23503") err.code = "ER_ROW_IS_REFERENCED_2";
            return callback(err);
        }

        // 4) SELECT: como en MySQL, devolvemos directamente la lista de filas
        if (resultado.command === "SELECT") {
            return callback(null, resultado.rows);
        }

        // INSERT / UPDATE / DELETE: devolvemos insertId y affectedRows como en MySQL
        callback(null, {
            insertId: esInsert && resultado.rows.length > 0 ? resultado.rows[0].id : undefined,
            affectedRows: resultado.rowCount
        });
    });
}

module.exports = { query: query };
