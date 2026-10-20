// Crear un servidor HTTP
var http = require("http");
var autenticacion = require("./autenticacion.js"); // PRÁCTICA 3 - JWT

var datos = require("./datos.js");
var sanitarios = datos.san;
var gestores = datos.ges;
var ubicaciones = datos.ubi;
var categorias = datos.cat;
var modelos = datos.mod;
var recursos = datos.rec;
var reservas = datos.res;
var resenyas = datos.resn;
// Crear servidor WS
// Necesita tener instalado el módulo websocket:
// npm install websocket
var WebSocketServer = require("websocket").server; // instalar previamente: npm install websocket

var clientes = []; // array de los clientes que se conectan


// PRÁCTICA 3 - Parte 3: el WebSocket se monta sobre el mismo servidor que la web (Render solo da un puerto).
// En local también sigue escuchando en el puerto 4444 para la app del sanitario (Cordova).
function iniciarWSAvisos(servidorWeb) {
    var servidores = [servidorWeb];
    if (!process.env.RENDER) { // la variable RENDER solo existe cuando el servidor está en Render
        var httpServer = http.createServer();
        httpServer.listen(4444, function () {
            console.log("Servidor de WebSocket iniciado en puerto:", 4444);
        });
        servidores.push(httpServer);
    }
    var wsServer = new WebSocketServer({
        httpServer: servidores
    });

    wsServer.on("request", function(request) { //esperas conexión.
        var connection = request.accept("avisos", request.origin);
        var cliente = { connection: connection, tipo: null, id: null, nombre: null }; //el cliente coge ese canal y lo puede utilizar. Es el canal más otros datos. 
        clientes.push(cliente); //guardamos la conexión

        connection.on("message", function(message) { //connection es como un objeto que representa la conexión individual con un cliente.
            if (message.type !== "utf8") return; //cuando es .on es como un operación de lectura.
            var msg = JSON.parse(message.utf8Data); //pasamos el mensaje a un objeto js que podemos usar. 
            //ES EL MENSAJE INICIAL. El mensaje tendrá datos en función del tipo que sea. 
            switch (msg.operacion) { //en función de lo que nos envíen hacemos una cosa. 

                case "identificar":
                    // El cliente se identifica tras hacer login
                    if (msg.tipo === "gestor") {
                        // PRÁCTICA 3 - JWT: un gestor solo puede conectarse con un token válido
                        var contenidoToken;
                        try {
                            contenidoToken = autenticacion.comprobarToken(msg.token);
                        } catch (error) {
                            connection.sendUTF(JSON.stringify({ operacion: "error", texto: error.message }));
                            connection.close(1008, "Token no valido"); // 1008 = conexión rechazada por la política del servidor
                            // En Render hay un proxy delante y el cierre "educado" puede no completarse:
                            // si al cabo de 1 segundo la conexión sigue abierta, la cortamos del todo
                            setTimeout(function () {
                                connection.drop(1008, "Token no valido", true);
                            }, 1000);
                            return;
                        }
                        cliente.id = contenidoToken.usuario; // el id lo sacamos del token, no de lo que diga el cliente
                    } else {
                        cliente.id = msg.id;
                    }
                    cliente.tipo = msg.tipo;       // "gestor" o "sanitario"
                    cliente.nombre = msg.nombre;
                    break;
                    //son los datos que tiene el cliente. Nos sirven para filtrar y tomar acciones de enviar solo a gestores por ejemplo.
                    // Un sanitario inició o finalizó una reserva
                    // Avisar a todos los sanitarios que tienen reserva activa en ese recurso
                    // msg: { idRecurso, nombreCategoria, nombreModelo, codigoRecurso,
                    //        sanitariosAfectados: [id1, id2...], quien: nombre }

                    //Buscamos los sanitarios afectados:
                case "avisoReserva": //en el cliente cuando ocurra, tendremos que crear una conexión con esta operación. 
                                        //También tengo que pensar la info que tengo que enviar para que el servidor sepa como filtrar.
                        let afectados = [];
                        // 1. Buscamos en las reservas globales quién tiene este recurso (sin haber terminado)
                        for(var i = 0 ; i < reservas.length; i++){
                            // Usamos msg.idRecurso que viene del cliente
                            if(reservas[i].recurso == msg.idRecurso && reservas[i].fecha_fin == null){
                                afectados.push(reservas[i].sanitario); //AÑADIMOS LOS SANITARIOS QUE TENGAN ESE RECURSO ACTIVO. 
                            }
                        }
                        //creamos la respuesta.
                        var aviso = {
                            operacion: "aviso",
                            color: "rojo",
                            fecha: new Date().toLocaleString(),
                            origen: msg.quien,
                            texto: "SE HA " + msg.accion + " LA RESERVA DEL " +
                                msg.nombreCategoria.toUpperCase() + " MODELO " +
                                msg.nombreModelo.toUpperCase() + " CON CÓDIGO " + msg.codigoRecurso
                        };

                        // 2. Enviamos el aviso SOLO a los afectados conectados
                        for (var i = 0; i < clientes.length; i++) {
                            if (clientes[i].tipo === "sanitario"){
                                for (var k = 0; k < afectados.length; k++) {
                                    // CORRECCIÓN: Usar clientes[i].id (no clienteConectado)
                                    if(String(afectados[k]) === String(clientes[i].id)) {
                                        clientes[i].connection.sendUTF(JSON.stringify(aviso));
                                        break; 
                                    }
                                }
                            }
                        }
                    break;

                case "avisoNuevoRecurso":
                    if (cliente.tipo !== "gestor") break; // PRÁCTICA 3 - JWT: solo gestores autenticados
                    // Un gestor creó un nuevo recurso → avisar a TODOS los sanitarios
                    // msg: { nombreCategoria, nombreModelo, codigoRecurso, quien }
                    var aviso = {
                        operacion: "aviso",
                        color: "azul",
                        fecha: new Date().toLocaleString(),
                        origen: msg.quien,
                        texto: "SE HA CREADO UN NUEVO RECURSO " +
                        msg.nombreCategoria.toUpperCase() + " MODELO " +
                        msg.nombreModelo.toUpperCase() + " CON CÓDIGO " + msg.codigoRecurso
                    };
                    for (var i = 0; i < clientes.length; i++) {
                        if (clientes[i].tipo === "sanitario") { //a todos los sanitarios les enviamos el aviso. 
                            clientes[i].connection.sendUTF(JSON.stringify(aviso));
                        }
                    }
                    break;

                case "avisoResenya":
                    console.log(msg.puntuacion);
                    // Un sanitario escribió una reseña → avisar a TODOS los gestores
                    // msg: { nombreCategoria, nombreModelo, codigoRecurso, puntuacion, quien }
                    var aviso = {
                        operacion: "aviso",
                        color: "verde",
                        fecha: new Date().toLocaleString(),
                        origen: msg.quien,
                        texto: "SE HA CREADO UNA RESEÑA PARA EL " +
                        msg.nombreCategoria.toUpperCase() + " MODELO " +
                        msg.nombreModelo.toUpperCase() + " CON CÓDIGO " +
                        msg.codigoRecurso + " Y PUNTUACIÓN " + msg.puntuacion
                    };
                    for (var i = 0; i < clientes.length; i++) {
                        if (clientes[i].tipo === "gestor") {
                            clientes[i].connection.sendUTF(JSON.stringify(aviso));
                        }
                    }
                    if(msg.puntuacion <= 2){
                        console.log("Entramos mala");
                        var aviso2 = {
                            operacion: "aviso",
                            color: "orange",
                            fecha: new Date().toLocaleString(),
                            origen: msg.quien,
                            texto: "Se ha evaluado con mala puntuación el dispositivo con categoria "+
                            msg.nombreCategoria+ ", modelo "+ msg.nombreModelo + " y con codigo " + msg.codigoRecurso
                        }
                        for(var j = 0; j < clientes.length; j++){
                            if(clientes[j].tipo == "sanitario"){
                                clientes[j].connection.sendUTF(JSON.stringify(aviso2));
                            }
                        }
                    }
                    break;
                case "avisoDevolucion":
                    if (cliente.tipo !== "gestor") break; // PRÁCTICA 3 - JWT: solo gestores autenticados
                    for(var i = 0 ; i < clientes.length; i++){
                        if(clientes[i].tipo === "sanitario"){
                            var sanitario_aux = clientes[i]
                            var id_sanitario = sanitario_aux.id
                            var numero = 0;
                            for(var j = 0 ; j < reservas.length; j++){
                                if(reservas[j].sanitario == id_sanitario && reservas[j].fecha_inicio != null && reservas[j].fecha_fin == null){
                                    numero++;
                                }
                            }
                            if(numero > 0){
                                var aviso = {
                                    operacion: "aviso",
                                    color: "pink",
                                    fecha: new Date().toLocaleString(),
                                    origen : msg.quien,
                                    texto: "Le recordamos que tiene "+numero+ " recurso(s) por devolver. Intente ser puntual."
                                }
                                sanitario_aux.connection.sendUTF(JSON.stringify(aviso))

                            }
                            
                        }
                    }
                    break;
            }
        });

        connection.on("close", function() {
            for (var i = 0; i < clientes.length; i++) {
                if (clientes[i].connection === connection) {
                    clientes.splice(i, 1);
                    break;
                }
            }
        });
    });

    console.log("Servidor WebSocket de avisos iniciado");
}

module.exports = iniciarWSAvisos;