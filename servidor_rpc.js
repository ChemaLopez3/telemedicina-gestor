var rpc = require("./rpc.js");
var conexion = require("./conexion.js"); // PRÁCTICA 3 - Parte 3: base de datos PostgreSQL (Supabase)
var servidor = rpc.server(3501, function () {
    console.log("Servidor RPC escuchando en http://localhost:3501");
});

function obtenerCategorias(callback) {
    conexion.query("SELECT * FROM categorias", function (err, resultados) {
        if (err) { console.error(err); return callback(null); }
        return callback(resultados);
    });
}

function obtenerModelos(callback) {
    conexion.query("SELECT * FROM modelos", function (err, resultados) {
        if (err) { console.error(err); return callback(null); }
        return callback(resultados);
    });
}

function loginSanitario(usuario, password, callback) {
    if (usuario && password) {
        conexion.query(
            "SELECT id FROM sanitarios WHERE usuario = ? AND password = ?",
            [usuario, password],
            function (err, resultados) {
                if (err) { console.error(err); return callback(null); }
                if (resultados.length > 0) {
                    return callback(resultados[0].id);
                }
                return callback(null);
            }
        );
    } else {
        return callback(null);
    }
}


function crearSanitario(datosSanitario, callback) {
    var nombre = datosSanitario.nombre;
    var apellidos = datosSanitario.apellidos;
    var usuario = datosSanitario.usuario;
    var password = datosSanitario.password;

    if (!nombre || !apellidos || !usuario || !password) {
        return callback(null);
    }

    conexion.query("SELECT id FROM sanitarios WHERE usuario = ?", [usuario], function (err, resultados) {
        if (err) { console.error(err); return callback(null); }
        if (resultados.length > 0) {
            return callback(null);
        }

        var sql = "INSERT INTO sanitarios (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
        conexion.query(sql, [nombre, apellidos, usuario, password], function (err2, resultado2) {
            if (err2) { console.error(err2); return callback(null); }
            return callback(resultado2.insertId);
        });
    });
}

function obtenerReservas(idSanitario, callback) {
    conexion.query("SELECT * FROM reservas WHERE sanitario = ?", [idSanitario], function (err, resultados) {
        if (err) { console.error(err); return callback([]); }
        return callback(resultados);
    });
}

function obtenerResenyas(idRecurso, callback) {
    conexion.query("SELECT * FROM resenyas WHERE recurso = ?", [idRecurso], function (err, resultados) {
        if (err) { console.error(err); return callback([]); }
        return callback(resultados);
    });
}

function crearResenya(idRecurso, idSanitario, valoracion, descripcion, callback) {
    if (valoracion < 1 || valoracion > 5) {
        return callback(null);
    }
    var sql = "INSERT INTO resenyas (recurso, sanitario, fecha, valor, descripcion) VALUES (?, ?, NOW(), ?, ?)";
    conexion.query(sql, [idRecurso, idSanitario, valoracion, descripcion], function (err, resultado) {
        if (err) { console.error(err); return callback(null); }
        return callback(resultado.insertId);
    });
}

function actualizarSanitario(idSanitario, datosSanitario, callback) {
    var login = datosSanitario.usuario;

    conexion.query("SELECT id FROM sanitarios WHERE id = ?", [idSanitario], function (err, resultados) {
        if (err) { console.error(err); return callback("Sanitario no encontrado"); }
        if (resultados.length === 0) {
            return callback("Sanitario no encontrado");
        }

        conexion.query("SELECT id FROM sanitarios WHERE usuario = ? AND id != ?", [login, idSanitario], function (err2, resultados2) {
            if (err2) { console.error(err2); return callback("Usuario repetido u otro problema"); }
            if (resultados2.length > 0) {
                return callback("Usuario repetido u otro problema");
            }

            var sql = "UPDATE sanitarios SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?";
            var valores = [datosSanitario.nombre, datosSanitario.apellidos, login, datosSanitario.password, idSanitario];
            conexion.query(sql, valores, function (err3) {
                if (err3) { console.error(err3); return callback("Usuario repetido u otro problema"); }
                return callback("Sanitario actualizado");
            });
        });
    });
}


function obtenerSanitario(idSanitario, callback) {
    conexion.query(
        "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?",
        [idSanitario],
        function (err, resultados) {
            if (err) { console.error(err); return callback(null); }
            if (resultados.length === 0) {
                return callback(null);
            }
            return callback(resultados[0]);
        }
    );
}


function obtenerRecursos(idModelo, callback) {
    conexion.query("SELECT * FROM recursos WHERE modelo = ? AND estado = 0", [idModelo], function (err, resultados) {
        if (err) { console.error(err); return callback(null); }
        if (resultados.length === 0) {
            return callback(null);
        }
        return callback(resultados);
    });
}


function cancelarReserva(idReserva, callback) {
    conexion.query("DELETE FROM reservas WHERE id = ?", [idReserva], function (err, resultado) {
        if (err) { console.error(err); return callback(null); }
        if (resultado.affectedRows === 0) {
            return callback(null);
        }
        return callback("Reserva eliminada");
    });
}

function iniciarReserva(idReserva, callback) {
    conexion.query("SELECT fecha_inicio FROM reservas WHERE id = ?", [idReserva], function (err, resultados) {
        if (err) { console.error(err); return callback("Reserva no encontrada."); }
        if (resultados.length === 0 || resultados[0].fecha_inicio != null) {
            return callback("Reserva no encontrada.");
        }
        conexion.query("UPDATE reservas SET fecha_inicio = NOW() WHERE id = ?", [idReserva], function (err2) {
            if (err2) { console.error(err2); return callback("Reserva no encontrada."); }
            return callback("Reserva iniciada.");
        });
    });
}

function finalizarReserva(idReserva, callback) {
    conexion.query("SELECT fecha_fin FROM reservas WHERE id = ?", [idReserva], function (err, resultados) {
        if (err) { console.error(err); return callback("No se ha encontrado la reserva."); }
        if (resultados.length === 0) {
            return callback("No se ha encontrado la reserva.");
        }
        if (resultados[0].fecha_fin != null) {
            return callback("La reserva ya está finalizada");
        }
        conexion.query("UPDATE reservas SET fecha_fin = NOW() WHERE id = ?", [idReserva], function (err2) {
            if (err2) { console.error(err2); return callback("No se ha encontrado la reserva."); }
            return callback("Se ha finalizado la reserva con id: " + idReserva);
        });
    });
}

function reservarRecurso(idRecurso, idSanitario, horas, callback) {
    var sql = `
        SELECT recursos.estado AS estado, modelos.horas_maximas AS horas_maximas
        FROM recursos
        JOIN modelos ON modelos.id = recursos.modelo
        WHERE recursos.id = ?
    `;
    conexion.query(sql, [idRecurso], function (err, resultados) {
        if (err) { console.error(err); return callback("Recurso no encontrado."); }
        if (resultados.length === 0) {
            return callback("Recurso no encontrado.");
        }
        var info = resultados[0];
        if (info.horas_maximas < horas) {
            return callback("Has sobrepasado las horas máximas del modelo.");
        }
        if (info.estado != 0) {
            return callback(null);
        }

        var insertSql = "INSERT INTO reservas (recurso, sanitario, horas_estimadas, fecha_peticion, fecha_inicio, fecha_fin) VALUES (?, ?, ?, NOW(), NULL, NULL)";
        conexion.query(insertSql, [idRecurso, idSanitario, horas], function (err2, resultado2) {
            if (err2) { console.error(err2); return callback(null); }
            return callback(resultado2.insertId);
        });
    });
}


function tiempoPendiente(idRecurso, idReserva, callback) {
    var ahora = new Date();

    conexion.query(
        "SELECT * FROM reservas WHERE recurso = ? ORDER BY fecha_peticion ASC",
        [idRecurso],
        function (err, reservas_recurso) {
            if (err) { console.error(err); return callback(0); }
            if (reservas_recurso.length === 0) {
                return callback(0);
            }

            var tiempoAcumulado = 0;

            for (var i = 0; i < reservas_recurso.length; i++) {
                var reserva = reservas_recurso[i];

                if (reserva.id == idReserva) {
                    return callback(Math.round(tiempoAcumulado * 100) / 100);
                }

                if (reserva.fecha_inicio != null && reserva.fecha_fin == null) {
                    var horasTranscurridas = (ahora - new Date(reserva.fecha_inicio)) / (1000 * 60 * 60);
                    var tiempoRestante = reserva.horas_estimadas - horasTranscurridas;
                    if (tiempoRestante > 0) {
                        tiempoAcumulado += tiempoRestante;
                    }
                } else if (reserva.fecha_inicio == null) {
                    tiempoAcumulado += reserva.horas_estimadas;
                }
            }

            return callback(Math.round(tiempoAcumulado * 100) / 100);
        }
    );
}

function obtenerRecurso(idRecurso, callback) {
    conexion.query("SELECT * FROM recursos WHERE id = ?", [idRecurso], function (err, resultados) {
        if (err) { console.error(err); return callback(null); }
        if (resultados.length === 0) {
            return callback(null);
        }
        return callback(resultados[0]);
    });
}

function obtenerUbicaciones(callback) {
    conexion.query("SELECT * FROM ubicaciones", function (err, resultados) {
        if (err) { console.error(err); return callback([]); }
        return callback(resultados);
    });
}

var app = servidor.createApp("gestion_sanitarios"); // crear aplicación de RPC. Le pone un nombre. 

//Registramos los procedimientos. Este es el segundo paso.

app.registerAsync(cancelarReserva);
app.registerAsync(obtenerCategorias);
app.registerAsync(obtenerModelos);
app.registerAsync(loginSanitario);
app.registerAsync(crearSanitario);
app.registerAsync(obtenerReservas);
app.registerAsync(obtenerResenyas);
app.registerAsync(crearResenya);
app.registerAsync(actualizarSanitario);
app.registerAsync(obtenerSanitario);
app.registerAsync(obtenerRecursos);
app.registerAsync(finalizarReserva);
app.registerAsync(iniciarReserva);
app.registerAsync(reservarRecurso);
app.registerAsync(tiempoPendiente);
app.registerAsync(obtenerRecurso);
app.registerAsync(obtenerUbicaciones);