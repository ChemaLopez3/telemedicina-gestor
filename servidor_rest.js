var express = require("express");
var autenticacion = require("./autenticacion.js"); // PRÁCTICA 3 - JWT
var app = express();
// PRÁCTICA 3 - Parte 3: Render indica el puerto en process.env.PORT (en local usamos el 3000)
var puerto = process.env.PORT || 3000;
var servidorWeb = app.listen(puerto, function () {
    console.log("Servidor web (gestor + API REST) en el puerto " + puerto);
});
var conexion = require("./conexion.js"); // PRÁCTICA 3 - Parte 3: base de datos PostgreSQL (Supabase)
app.use("/gestor", express.static(__dirname + "/cliente_rest"));
app.use("/sanitario", express.static(__dirname + "/cliente_rpc"));
app.use(express.json());

// =========================================================
// PRÁCTICA 3 - Parte 2: autenticación con JWT (ver autenticacion.js)
// =========================================================

// ---------- SERVICIOS PÚBLICOS (no necesitan token) ----------

//post con comprobacion previa de que no exista el usuario (registro de un gestor nuevo)
app.post("/api/gestores", function (req, res) {
    var gestor = { nombre: req.body.nombre, apellidos: req.body.apellidos, usuario: req.body.usuario, password: req.body.password };

    conexion.query("SELECT id FROM gestores WHERE usuario = ?", [gestor.usuario], function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al comprobar el usuario."); }
        if (resultados.length > 0) {
            return res.status(404).json("Usuario no valido");
        }

        var sql = "INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
        conexion.query(sql, [gestor.nombre, gestor.apellidos, gestor.usuario, gestor.password], function (err2) {
            if (err2) { console.error(err2); return res.status(500).json("Error al crear el gestor."); }
            res.status(201).json("Gestor creado");
        });
    });
})

//post tipo login: comprueba las credenciales y devuelve el id del gestor y su token
app.post("/api/gestores/login", function (req, res) {
    var usuario = req.body.usuario;
    var password = req.body.password;

    conexion.query("SELECT * FROM gestores WHERE usuario = ?", [usuario], function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al iniciar sesión."); }

        if (resultados.length === 0) {
            return res.status(403).json({ error: "No existe este usuario." });
        }
        var gestorEncontrado = resultados[0];
        if (gestorEncontrado.password !== password) {
            return res.status(403).json({ error: "Credenciales inválidas" });
        }

        // Crear el token con el id del gestor (caduca en 1 hora)
        var token = autenticacion.crearToken(gestorEncontrado.id);
        res.status(200).json({ id: gestorEncontrado.id, token: token });
    });
})

// ---------- VALIDACIÓN DEL TOKEN ----------
// Antes de este use los servicios son públicos; después, todos los /api necesitan ?token=XXXX en la URL
app.use("/api", function (req, res, next) {
    var contenidoToken;
    try {
        contenidoToken = autenticacion.comprobarToken(req.query.token);
    } catch (error) { // no hay token, es falso, tiene mal formato o ha caducado
        return res.status(401).json(error.message);
    }

    req.id_gestor = contenidoToken.usuario; // id del gestor que hace la petición
    next();
});

// ---------- SERVICIOS PRIVADOS (necesitan token) ----------

//GET de todos los elementos 
app.get("/api/ubicaciones", function (req, res) {
    conexion.query("SELECT * FROM ubicaciones", function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al consultar las ubicaciones."); }
        res.status(200).json(resultados);
    });
})

app.get("/api/categorias", function (req, res) {
    conexion.query("SELECT * FROM categorias", function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al consultar las categorías."); }
        res.status(200).json(resultados);
    });
})


app.get("/api/modelos", function (req, res) {
    conexion.query("SELECT * FROM modelos", function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al consultar los modelos."); }
        res.status(200).json(resultados);
    });
})

app.get("/api/gestores/:id", function (req, res) {
    var id = req.params.id;
    if (id != req.id_gestor) { // un gestor solo puede consultar sus propios datos
        return res.status(403).json("No puedes consultar los datos de otro gestor.");
    }
    conexion.query(
        "SELECT id, nombre, apellidos, usuario FROM gestores WHERE id = ?",
        [id],
        function (err, resultados) {
            if (err) { console.error(err); return res.status(500).json("Error al consultar el gestor."); }
            if (resultados.length === 0) {
                return res.status(404).json("No encontrado el usuario gestor.");
            }
            res.status(200).json(resultados[0]);
        }
    );
})

// PRÁCTICA 3 - Parte 1: datos necesarios para enviar las reservas al Ministerio
app.get("/api/reservas", function (req, res) {
    conexion.query("SELECT * FROM reservas", function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al consultar las reservas."); }
        res.status(200).json(resultados);
    });
})

app.get("/api/sanitarios", function (req, res) {
    conexion.query("SELECT id, nombre, apellidos FROM sanitarios", function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al consultar los sanitarios."); }
        res.status(200).json(resultados);
    });
})

app.get("/api/sanitarios/:id", function (req, res) {
    var id = req.params.id;
    conexion.query(
        "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?",
        [id],
        function (err, resultados) {
            if (err) { console.error(err); return res.status(500).json("Error al consultar el sanitario."); }
            if (resultados.length === 0) {
                return res.status(404).json("No encontrado el usuario gestor.");
            }
            res.status(200).json(resultados[0]);
        }
    );
})

//GET de un elemento por su id
app.get("/api/recursos/:id", function (req, res) {
    var id = req.params.id;
    conexion.query(
        "SELECT * FROM recursos WHERE id = ?",
        [id],
        function (err, resultados) {
            if (err) { console.error(err); return res.status(500).json("Error al consultar el recurso."); }
            if (resultados.length === 0) {
                return res.status(404).json("No se ha encontrado el recurso.");
            }
            console.log("el recurso cogido es" + resultados[0].id);
            res.status(200).json(resultados[0]);
        }
    );
})

//get de elementos relacionados con otro
app.get("/api/recursos/:id/reservas", function (req, res) {
    var id = req.params.id;
    var sql = `
        SELECT
            reservas.id,
            COALESCE(CONCAT(sanitarios.nombre, ' ', sanitarios.apellidos), 'Desconocido') AS sanitario,
            reservas.horas_estimadas,
            reservas.fecha_peticion,
            reservas.fecha_inicio,
            reservas.fecha_fin
        FROM reservas
        LEFT JOIN sanitarios ON sanitarios.id = reservas.sanitario
        WHERE reservas.recurso = ?
    `;
    conexion.query(sql, [id], function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al consultar las reservas."); }
        res.status(200).json(resultados);
    });
})

app.get("/api/recursos/:id/resenyas", function (req, res) {
    var id = req.params.id;
    var sql = `
        SELECT
            resenyas.fecha,
            COALESCE(CONCAT(sanitarios.nombre, ' ', sanitarios.apellidos), 'Desconocido') AS sanitario,
            resenyas.valor,
            resenyas.descripcion
        FROM resenyas
        LEFT JOIN sanitarios ON sanitarios.id = resenyas.sanitario
        WHERE resenyas.recurso = ?
    `;
    conexion.query(sql, [id], function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al consultar las reseñas."); }
        res.status(200).json(resultados);
    });
})

//get con filtros de elementos
app.get("/api/recursos", function (req, res) {
    var categoria = req.query.categoria;
    var modelo = req.query.modelo;
    var ubicacion = req.query.ubicacion;
    var estado = req.query.estado;

    var sql = "SELECT recursos.* FROM recursos JOIN modelos ON modelos.id = recursos.modelo WHERE 1 = 1";
    var params = [];

    // PRÁCTICA 3 - Parte 3: un filtro vacío ("") se ignora (PostgreSQL no acepta "" como número)
    if (ubicacion != undefined && ubicacion != "Todos" && ubicacion != "") {
        sql += " AND recursos.ubicacion = ?";
        params.push(ubicacion);
    }
    if (estado != undefined && estado != "Todos" && estado != "") {
        sql += " AND recursos.estado = ?";
        params.push(estado);
    }
    if (modelo != undefined && modelo != "Todos" && modelo != "") {
        sql += " AND recursos.modelo = ?";
        params.push(modelo);
    }
    if (categoria != undefined && categoria != "Todos" && categoria != "") {
        sql += " AND modelos.categoria = ?";
        params.push(categoria);
    }

    conexion.query(sql, params, function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al filtrar los recursos."); }
        res.status(200).json(resultados);
    });
})


//post normal y sencillo de crear un recurso
app.post("/api/recursos", function (req, res) {
    var estado = req.body.estado;
    if (estado != 0 && estado != 1 && estado != 2) {
        return res.status(400).json("Estado inválido");
    }

    var nuevoRecurso = {
        modelo: parseInt(req.body.modelo),
        ubicacion: parseInt(req.body.ubicacion),
        numero_serie: req.body.numero_serie,
        estado: parseInt(estado)
    };

    var sql = "INSERT INTO recursos (modelo, ubicacion, numero_serie, estado) VALUES (?, ?, ?, ?)";
    conexion.query(sql, [nuevoRecurso.modelo, nuevoRecurso.ubicacion, nuevoRecurso.numero_serie, nuevoRecurso.estado], function (err) {
        if (err) { console.error(err); return res.status(500).json("Error al crear el recurso."); }
        res.status(201).json("Recurso creado");
    });
})

//delete
app.delete("/api/recursos/:id", function (req, res) {
    var id_recurso = req.params.id;
    conexion.query("DELETE FROM recursos WHERE id = ?", [id_recurso], function (err, resultado) {
        if (err) {
            console.error(err);
            if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
                return res.status(409).json("No se puede eliminar: el recurso tiene reservas o reseñas asociadas.");
            }
            return res.status(500).json("Error al eliminar el recurso.");
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).json("No se ha encontrado el recurso con id: " + id_recurso);
        }
        res.status(200).json("El recurso con identificador: " + id_recurso + " ha sido eliminado");
    });
})

//put comprobacion duplicados
app.put("/api/gestores/:id", function (req, res) {
    var id_gestor = req.params.id;
    if (id_gestor != req.id_gestor) { // un gestor solo puede modificar sus propios datos
        return res.status(403).json("No puedes modificar los datos de otro gestor.");
    }
    var usuario_introducido = req.body.usuario;

    conexion.query("SELECT id FROM gestores WHERE usuario = ? AND id != ?", [usuario_introducido, id_gestor], function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al comprobar el usuario."); }
        if (resultados.length > 0) {
            return res.status(400).json({ error: "Usuario ya existe" });
        }

        var sql = "UPDATE gestores SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?";
        var valores = [req.body.nombre, req.body.apellidos, req.body.usuario, req.body.password, id_gestor];
        conexion.query(sql, valores, function (err2, resultado2) {
            if (err2) { console.error(err2); return res.status(500).json("Error al actualizar el gestor."); }
            if (resultado2.affectedRows === 0) {
                return res.status(404).json("No se ha actualizado la información.");
            }
            res.status(201).json("Se han actualizado los datos.");
        });
    });
});

//put comprobacion duplicados
app.put("/api/recursos/:id", function (req, res) {
    var id_recurso = req.params.id;
    var num_serie_introducido = req.body.numero_serie;

    conexion.query("SELECT id FROM recursos WHERE numero_serie = ? AND id != ?", [num_serie_introducido, id_recurso], function (err, resultados) {
        if (err) { console.error(err); return res.status(500).json("Error al comprobar el número de serie."); }
        if (resultados.length > 0) {
            return res.status(400).json({ error: "Número de serie ya existe." });
        }

        var sql = "UPDATE recursos SET numero_serie = ?, modelo = ?, ubicacion = ?, estado = ? WHERE id = ?";
        var valores = [req.body.numero_serie, req.body.modelo, req.body.ubicacion, req.body.estado, id_recurso];
        conexion.query(sql, valores, function (err2, resultado2) {
            if (err2) { console.error(err2); return res.status(500).json("Error al actualizar el recurso."); }
            if (resultado2.affectedRows === 0) {
                return res.status(404).json("No se ha encontrado el recurso.");
            }
            res.status(201).json("Se han actualizado los datos.");
        });
    });
})

// PRÁCTICA 3 - Parte 3: exportamos el servidor web para montar sobre él el WebSocket (servidor.js)
module.exports = servidorWeb;
