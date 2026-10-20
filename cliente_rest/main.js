console.log("main cargado");



const ubi_select =document.getElementById('ubicacion');
const mod_select = document.getElementById('modelo');
const est_select = document.getElementById('estado');
const cat_select = document.getElementById('categoria');

const ubi_select2 = document.getElementById('ubicacion_rec');
const mod_select2 = document.getElementById('modelo_rec');
const est_select2 = document.getElementById('estado_rec');
const cat_select2 = document.getElementById('categoria_rec');

const renyas_tabla = document.getElementById("lista_resenyas");
const reservas_tabla = document.getElementById("lista_reservas");

var recurso_actual_id = null;

// PRÁCTICA 3 - JWT: si el token no es válido o ha caducado el servidor responde 401 y volvemos al login
rest.onNoAutorizado = function (mensaje) {
    if (rest.token === null) return; // ya se ha cerrado la sesión (puede haber varias peticiones a la vez): avisamos solo una vez
    alert("Sesión no válida o caducada (" + mensaje + "). Vuelve a iniciar sesión.");
    salir();
};
// ws.js - cliente gestor
var conexionWS = null;
var nombre_gestor_ws = null;
var id_gestor_ws = null;

function conectarWS(id, nombre) {
    id_gestor_ws = id;
    nombre_gestor_ws = nombre;

    // PRÁCTICA 3 - Parte 3: el WebSocket está en el mismo servidor que la página. En Render la página
    // va por https, así que el WebSocket tiene que ir cifrado (wss://); en local, ws://localhost:3000
    var protocoloWS = location.protocol === "https:" ? "wss://" : "ws://";
    conexionWS = new WebSocket(protocoloWS + location.host, "avisos");

    conexionWS.addEventListener("open", function() {
        console.log("Ya estoy conectado con el servidor");
        // Identificarse como gestor
        conexionWS.send(JSON.stringify({
            operacion: "identificar",
            tipo: "gestor",
            id: id,
            nombre: nombre,
            token: rest.token // PRÁCTICA 3 - JWT: el servidor de avisos también comprueba el token
        }));
    });

    conexionWS.addEventListener("message", function(msg) {
        var datos = JSON.parse(msg.data);
        if (datos.operacion === "aviso") {
            anyadirAviso(datos);
        } else if (datos.operacion === "error") { // PRÁCTICA 3 - JWT: el servidor ha rechazado el token
            console.error("WebSocket de avisos:", datos.texto);
        }
    });
}

function desconectarWS() {
    if (conexionWS) {
        conexionWS.close();
        conexionWS = null;
    }
}

function anyadirAviso(datos) {
    var tabla = document.getElementById("lista_avisos");
    var fila = document.createElement("tr");

    if (datos.color === "verde") fila.style.backgroundColor = "#90ee90";
    else if (datos.color === "rojo") fila.style.backgroundColor = "#ff9999";
    else if (datos.color === "azul") fila.style.backgroundColor = "#9999ff";

    var tdFecha = document.createElement("td");
    tdFecha.textContent = datos.fecha;
    var tdOrigen = document.createElement("td");
    tdOrigen.textContent = datos.origen;
    var tdTexto = document.createElement("td");
    tdTexto.textContent = datos.texto;

    fila.appendChild(tdFecha);
    fila.appendChild(tdOrigen);
    fila.appendChild(tdTexto);
    tabla.appendChild(fila);
}

// Para enviar aviso de nuevo recurso (llamado desde main.js)
function wsAvisoNuevoRecurso(nombreCategoria, nombreModelo, codigoRecurso) {
    if (!conexionWS) return;
    conexionWS.send(JSON.stringify({
        operacion: "avisoNuevoRecurso",
        nombreCategoria: nombreCategoria,
        nombreModelo: nombreModelo,
        codigoRecurso: codigoRecurso,
        quien: nombre_gestor_ws
    }));
}
function wsAvisoDevolucion(){
    if(!conexionWS) return;
    conexionWS.send(JSON.stringify({
        operacion: "avisoDevolucion",
        quien: nombre_gestor_ws
    }))
}
document.addEventListener("DOMContentLoaded", function(){

    // PRÁCTICA 3 - JWT: categorías, modelos y ubicaciones ya no se cargan aquí porque el servidor
    // exige el token; se cargan en login() después de iniciar sesión.
    cargarEstados();
// para que los modelos se actualicen una vez elijamos categoría.
    cat_select.addEventListener("change", function(){
            actualizarModelos();
        });
    cat_select2.addEventListener("change", function(){
            actualizarModelos();
        });
// cuando se cargue todo el html, ejecutamos las funciones para cargar los selects de inicio.


});

function anyadir(){
    recurso_actual_id = null; // IMPORTANTE
    cambiarSeccion("recurso");

    document.getElementById("num_serie_rec").value = "";
    document.getElementById("modelo_rec").selectedIndex = 0;
    document.getElementById("categoria_rec").selectedIndex = 0;
    document.getElementById("ubicacion_rec").selectedIndex = 0;
    document.getElementById("estado_rec").selectedIndex = 0;
    document.getElementById("lista_reservas").innerHTML = "";
    document.getElementById("lista_resenyas").innerHTML = "";

    inicializarSelectsRecurso();
}
function inicializarSelectsRecurso() {
    // Rellenar categorías (igual que en el selector principal)
    cat_select2.innerHTML = '<option value="">Seleccione categoría</option>';
    categorias_lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        cat_select2.appendChild(opt);
    });
    
    // Rellenar ubicaciones
    ubi_select2.innerHTML = '<option value="">Seleccione ubicación</option>';
    ubis_lista.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre;
        ubi_select2.appendChild(opt);
    });
    
    // Rellenar estados
    const estados = [
        { id: 0, nombre: "Operativo" },
        { id: 1, nombre: "De baja/defectuoso" },
        { id: 2, nombre: "En mantenimiento" },
    ];
    
    est_select2.innerHTML = '<option value="">Seleccione estado</option>';
    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        est_select2.appendChild(option);
    });
    
    // Modelos vacío inicialmente (se llenará al seleccionar categoría)
    mod_select2.innerHTML = '<option value="">Primero seleccione categoría</option>';
}
//Para cargar los selects, el cliente necesita conocer las categorias, modelos, ubis...
function cargarCategorias(){
    rest.get("/api/categorias", function(estado,respuesta){
        if(estado == 200){
            categorias_lista = respuesta; //guardamos las categorías.
            rellenarCategorias();
        }
    });
}

function cargarModelos(){
    rest.get("/api/modelos", function(estado,respuesta){
        if(estado == 200){
            modelos_lista = respuesta; //guardamos los modelos.
        }
    });
}

function cargarUbis(){
    rest.get("/api/ubicaciones", function(estado,respuesta){
        if(estado == 200){
            ubis_lista = respuesta; //guardamos las ubicaciones.
            rellenarUbicaciones();
        }
    });
}
function cargarEstados() {

    const estados = [
        { id: 0, nombre: "Operativo" },
        { id: 1, nombre: "De baja/defectuoso" },
        { id: 2, nombre: "En mantenimiento" },

    ];

    est_select.innerHTML = '<option value="">Seleccione estado</option>';

    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        est_select.appendChild(option);

    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    est_select.appendChild(todos);
}

function rellenarCategorias(){
    // ponemos en el select un option "decorativo"
    cat_select.innerHTML = '<option value="">Seleccione categoría</option>';
    categorias_lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        cat_select.appendChild(opt); //para cada categoria, creamos un option y lo añadimos al select.

    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    cat_select.appendChild(todos);
}
//hacemos lo mismo con las ubis.
function rellenarUbicaciones(){
    ubi_select.innerHTML = '<option value="">Seleccione ubicación</option>';
    ubis_lista.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre;
        ubi_select.appendChild(opt);


    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    ubi_select.appendChild(todos); 
}
function actualizarModelos(){

    var categoriaSeleccionada = document.getElementById("categoria").value;
    var categoriaSeleccionada2 = document.getElementById("categoria_rec").value;
    mod_select.innerHTML = '<option value="">Seleccione modelo</option>';
    mod_select2.innerHTML = '<option value="">Seleccione modelo</option>';
    // ponemos en los selects los option de los modelos que pertenecen a las categorias seleccionadas.
    modelos_lista.forEach(m => {
        if(m.categoria == categoriaSeleccionada){
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.nombre;
            mod_select.appendChild(opt);
        }
    });
    modelos_lista.forEach(m => {
        if(m.categoria == categoriaSeleccionada2){
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.nombre;
            mod_select2.appendChild(opt);
        }
    })
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    mod_select.appendChild(todos);
}

var seccionActual = "login";
var gestor_identificador = "";
var password_sesion = ""; // contraseña con la que se ha iniciado sesión (para saber si se cambia en "Editar Datos")

// Saca el texto de error de una respuesta del servidor (puede venir como "texto" o como {error: "texto"})
function mensajeError(respuesta) {
    try {
        var datos = JSON.parse(respuesta);
        return datos.error || datos;
    } catch (e) {
        return respuesta;
    }
}

    /*function entrar(){
        var usuario = document.getElementById("usuario").value;
    
    cambiarSeccion("menu-principal");
    }*/
    var modelos_lista =  [];
    var ubis_lista = [];
    var categorias_lista = [];
    var recurso = [];


    function login(){ // al darle al botón, puedes ir a una vista u otra
    gestor = {        //eso depende de la respuesta del servidor, por lo que hay petición.
        usuario : document.getElementById("usuario").value,
        password : document.getElementById("password").value
    };
    
    rest.post("/api/gestores/login", gestor, function(estado, respuesta){
        if(estado == 200){
            // Guardar el identificador del gestor (solo el ID)
            // PRÁCTICA 3 - JWT: el servidor devuelve {id, token}. Guardamos el token en rest.js
            // para que lo añada automáticamente a todas las peticiones a /api
            rest.token = respuesta.token;
            gestor_identificador = respuesta.id; // ID del gestor
            password_sesion = gestor.password;
            
            // Ahora obtener los datos completos del gestor usando el ID
            rest.get("/api/gestores/" + gestor_identificador, function(estado, respuesta) {
                if(estado == 200) {
                    // respuesta contiene: {id, nombre, apellidos, usuario}
                    var nombreCompleto = respuesta.nombre + " " + (respuesta.apellidos || "");
                    
                    // Guardar en una variable global para usarla después
                    window.nombreGestorCompleto = nombreCompleto;

                    conectarWS(gestor_identificador, nombreCompleto); //Mandamos para que se conecte al WebSocket
                    cargarRanking(); // PRÁCTICA 3 - Parte 1: ranking de reservas por área
                    
                    // Cambiar a la sección de inicio
                    cambiarSeccion("inicio");
                    
                    // Cargar todos los datos necesarios
                    cargarModelos();
                    cargarUbis();
                    cargarCategorias();
                    
                    // Mostrar el nombre del gestor
                    document.getElementById("nombre_gestor").textContent = nombreCompleto;
                } else {
                    // Si falla la obtención de datos, al menos mostrar el usuario
                    window.nombreGestorCompleto = document.getElementById("usuario").value;
                    cambiarSeccion("inicio");
                    cargarModelos();
                    cargarUbis();
                    cargarCategorias();
                    document.getElementById("nombre_gestor").textContent = window.nombreGestorCompleto;
                }
            });
        } else {
            if (estado == 0) { // no hay respuesta: el servidor está parado
                alert("No se puede conectar con el servidor. Comprueba que Node y MySQL están arrancados.");
            } else { // el servidor explica el motivo: "No existe este usuario.", "Credenciales inválidas"...
                alert("Error en login: " + mensajeError(respuesta));
            }
        }
    });
}
//crear con post y comprobar respuesta
    function registro(){
    var gestor = {
        nombre: document.getElementById("nombre_reg").value,
        apellidos: document.getElementById("apellidos_reg").value,
        usuario: document.getElementById("usuario_reg").value,
        password: document.getElementById("contrasenya_reg").value,
    };

    if(gestor.nombre!="" && gestor.apellidos!="" && gestor.usuario!="" && gestor.password!=""){

    if(gestor_identificador === ""){ //no ha hecho nunca login, si lo hubiera hecho, tendría guardado el id.
        // REGISTRO NUEVO
        rest.post("/api/gestores", gestor, function (estado, respuesta) {
            console.log(respuesta)
            if (estado == 201) {
                cambiarSeccion("login");
            } else {
                alert("Error introduciendo nuevo gestor: " + mensajeError(respuesta));
            }
        });
    } else { //si ya ha hecho login, haremos una modificación de datos, no creacion (put)
        // EDICIÓN - Primero obtener los datos actuales del gestor. Para luego ver que vista ponemos.
        rest.get("/api/gestores/" + gestor_identificador, function(estado, respuesta) {
            if (estado == 200) {
                var gestorActual = respuesta;
                
                // Comparar usuario y contraseña actuales con los nuevos
                var usuarioCambiado = (gestorActual.usuario !== gestor.usuario);
                // El servidor no devuelve la contraseña: la comparamos con la que se usó al iniciar sesión
                var passwordCambiado = (password_sesion !== gestor.password);
                
                // Hacer la petición PUT para actualizar
                rest.put("/api/gestores/" + gestor_identificador, gestor, function (estado, respuesta) {
                    if (estado == 201) {
                        // Si cambió usuario o contraseña, redirigir a login
                        if (usuarioCambiado || passwordCambiado) {
                            alert("Usuario o contraseña modificados. Por favor, inicie sesión nuevamente.");
                            salir(); // cierra la sesión: borra el id, el token y el WebSocket
                        } else {
                            // Si no cambiaron credenciales, volver al inicio mostrando el nombre nuevo
                            window.nombreGestorCompleto = gestor.nombre + " " + gestor.apellidos;
                            cambiarSeccion("inicio");
                        }
                    } else {
                        alert("Error editando gestor: " + mensajeError(respuesta));
                    }
                });
            } else {
                alert("Error obteniendo datos del gestor");
            }
        });
    }
}
else{
    alert("Rellene todos los campos.");
    cambiarSeccion("datos_gestor");
}
}

    function cancelar(){
        if(gestor_identificador != ""){
            cambiarSeccion("inicio")
        }else{
            cambiarSeccion("login");
        }
    }
    
    function editar(){
        cambiarSeccion("datos_gestor");
        // Rellenamos el formulario con los datos actuales (la contraseña hay que escribirla)
        rest.get("/api/gestores/" + gestor_identificador, function(estado, respuesta){
            if(estado == 200){
                document.getElementById("nombre_reg").value = respuesta.nombre;
                document.getElementById("apellidos_reg").value = respuesta.apellidos;
                document.getElementById("usuario_reg").value = respuesta.usuario;
                document.getElementById("contrasenya_reg").value = "";
            }
        });
    }
//TODO LO QUE DEPENDA DE LA RESPUESTA DEL SERVIDOR: TIENE QUE IR EN EL CALLBACK.
//get con filtros
    function buscar(){
        console.log("entro a buscar");
        var num_serie = "";
        var categoria = document.getElementById("categoria").value;
        console.log(categoria);
        var modelo = document.getElementById("modelo").value;
        var ubicacion = document.getElementById("ubicacion").value;
        var estado = document.getElementById("estado").value
        console.log("numero serie")
        console.log("Entro en la función.")
        rest.get("/api/recursos?categoria="+categoria+"&modelo="+modelo+"&ubicacion="+ubicacion+"&estado="+estado,function(estado,respuesta){
        //le pedimos al servidor que nos devuelva la lista de recursos filtrada.
            var recursos_mostrar = respuesta;
            console.log("RECURSOS RECIBIDOS:", recursos_mostrar); // <-- AÑADE ESTO
            console.log("Primer recurso:", recursos_mostrar[0]);
            //tienen que ser iguales que los .query que hay en el servidor
            var lista = document.getElementById("lista_recursos");
            lista.innerHTML=""; // aquí no tiene un value (<tbody>value</tbody>), tiene contenido. 
            // tenemos que utilizar las funciones de carga para tener acceso a todos modelos , categorias y demás.
            for(var i = 0;i < recursos_mostrar.length;i++){
                var tr = document.createElement("tr"); //creamos una fila.
                var td_numserie = document.createElement("td"); //columna.
                td_numserie.textContent = recursos_mostrar[i].numero_serie; // podría poner directamente el que introduce.
                tr.appendChild(td_numserie);
                // MODELO + CATEGORIA
                var td_modelo = document.createElement("td");
                var td_categoria = document.createElement("td");

                var modelo_id = recursos_mostrar[i].modelo;
                var modelo_obj = null;

                // Buscar modelo UNA sola vez
                for(var j = 0; j < modelos_lista.length; j++){
                    if(modelos_lista[j].id == modelo_id){
                        modelo_obj = modelos_lista[j];
                }
            }

            if(modelo_obj != null){

                td_modelo.textContent = modelo_obj.nombre;

                // Buscar categoria
                for(var k = 0; k < categorias_lista.length; k++){
                    if(categorias_lista[k].id == modelo_obj.categoria){
                        td_categoria.textContent = categorias_lista[k].nombre;
                    }
                }
            }

            tr.appendChild(td_categoria);
            tr.appendChild(td_modelo);
                var td_ubi = document.createElement("td");
                var ubi_id = recursos_mostrar[i].ubicacion; // la respuesta nos da los ids, no el nombre.
                for(var j = 0; j < ubis_lista.length;j++){
                    if(ubi_id == ubis_lista[j].id){ //ids únicos.
                        td_ubi.textContent = ubis_lista[j].nombre;
                        console.log("entra en ubi");
                    }
                }
                tr.appendChild(td_ubi);
                var td_estado = document.createElement("td")
                var estado_id = recursos_mostrar[i].estado;
                if(estado_id == 0){
                    td_estado.textContent = "Operativo"
                }else if(estado_id == 1){
                    td_estado.textContent = "De baja/defectuoso."
                }else{
                    td_estado.textContent = "En mantenimiento"
                }
                tr.appendChild(td_estado);
                var boton_abrir = document.createElement("button")
                let identificador_recurso = recursos_mostrar[i].id;
                boton_abrir.addEventListener("click",function(){ //addEventListener se ejecuta con el click, y para ese momento el for ha acabado por tanto se guarda el id.
                    abrir(identificador_recurso);
                })
                boton_abrir.textContent = "Abrir";
                tr.appendChild(boton_abrir);
                var boton_eliminar = document.createElement("button")
                boton_eliminar.textContent = "X"
                boton_eliminar.addEventListener("click",function(){
                    eliminarRecurso(identificador_recurso);
                })
                tr.appendChild(boton_eliminar);


                lista.appendChild(tr);
            }
        })

    }
    //eliminar algo con delete y comprobar respuesta
    function eliminarRecurso(id){
        rest.delete("/api/recursos/"+id,function(estado,respuesta){
            if(estado == 200){
                alert("Recurso eliminado");
                buscar();
            }else{
                console.log("ERrro")
            }

        })

        

    }

    

    function cambiarSeccion(seccion){
    document.getElementById(seccionActual).classList.remove("activa");
    document.getElementById(seccion).classList.add("activa");
    seccionActual=seccion;
    if (seccion === "inicio" && window.nombreGestorCompleto) {
        var nombreElement = document.getElementById("nombre_gestor");
        if (nombreElement) {
            nombreElement.textContent = window.nombreGestorCompleto;
        }
    }
    }
    function iniciar_registro(){ // al darle al botón solo queremos que cambie de vista.
        gestor_identificador = "";
        
        cambiarSeccion("datos_gestor");

        //LIMPIAMOS TODOS LOS CAMPOS
        document.getElementById("nombre_reg").value = "";
        document.getElementById("apellidos_reg").value = "";
        document.getElementById("usuario_reg").value = "";
        document.getElementById("contrasenya_reg").value = "";

    }
    function salir(){
        gestor_identificador = "";
        rest.token = null; // PRÁCTICA 3 - JWT: al salir olvidamos el token
        password_sesion = "";
        //LIMPIAMOS LOS CAMPOS
        document.getElementById("usuario").value = "";
        document.getElementById("password").value = "";
        desconectarWS(); // Cuando te salgas habrá que desconectarlo del WS.
        lista_avisos.innerHTML = ""; // Limpiar avisos al salir
        mostrarResultadoEnvio("", []); // PRÁCTICA 3 - Parte 1: limpiar el resultado del envío
        cambiarSeccion("login");
    }
    //get de un elemento segun su id
 function abrir(id){
    var id_recurso = id;
    recurso_actual_id = id;
    cambiarSeccion("recurso");
    
    rest.get("/api/recursos/"+id, function(estado, respuesta){
        if(estado == 200){
            console.log(respuesta.numero_serie);
            
            // Limpiar todos los selects
            ubi_select2.innerHTML = "";
            cat_select2.innerHTML = "";
            mod_select2.innerHTML = "";
            est_select2.innerHTML = "";
            
            // Establecer el número de serie
            document.getElementById("num_serie_rec").value = respuesta.numero_serie;
            
            // Encontrar la categoría del modelo actual
            var categoria_actual = null;
            for(var i = 0; i < modelos_lista.length; i++){
                if(modelos_lista[i].id == respuesta.modelo){
                    categoria_actual = modelos_lista[i].categoria;
                    break;
                }
            }
            
            // 1. RELLENAR CATEGORÍAS (todas)
            for(var i = 0; i < categorias_lista.length; i++){
                var opt = document.createElement("option");
                opt.value = categorias_lista[i].id;
                opt.textContent = categorias_lista[i].nombre;
                
                // Marcar como selected si es la categoría actual
                if(categorias_lista[i].id == categoria_actual){
                    opt.selected = true;
                }
                
                cat_select2.appendChild(opt);
            }
            
            // 2. RELLENAR MODELOS (todos los de la categoría actual)
            for(var i = 0; i < modelos_lista.length; i++){
                if(modelos_lista[i].categoria == categoria_actual){
                    var opt = document.createElement("option");
                    opt.value = modelos_lista[i].id;
                    opt.textContent = modelos_lista[i].nombre;
                    
                    // Marcar como selected si es el modelo actual
                    if(modelos_lista[i].id == respuesta.modelo){
                        opt.selected = true;
                    }
                    
                    mod_select2.appendChild(opt);
                }
            }
            
            // 3. RELLENAR UBICACIONES (todas)
            for(var i = 0; i < ubis_lista.length; i++){
                var opt = document.createElement("option");
                opt.value = ubis_lista[i].id;
                opt.textContent = ubis_lista[i].nombre;
                
                // Marcar como selected si es la ubicación actual
                if(ubis_lista[i].id == respuesta.ubicacion){
                    opt.selected = true;
                }
                
                ubi_select2.appendChild(opt);
            }
            
            // 4. RELLENAR ESTADOS (todos)
            var estados_aux = [
                {id: 0, nombre: "Operativo"},
                {id: 1, nombre: "De baja/defectuoso"},
                {id: 2, nombre: "En mantenimiento"}
            ];
            
            for(var i = 0; i < estados_aux.length; i++){
                var opt = document.createElement("option");
                opt.value = estados_aux[i].id;
                opt.textContent = estados_aux[i].nombre;
                
                // Marcar como selected si es el estado actual
                if(estados_aux[i].id == respuesta.estado){
                    opt.selected = true;
                }
                
                est_select2.appendChild(opt);
            }
            
            // Cargar reservas y reseñas
            rellenarReservas(id_recurso);
            rellenarResenyas(id_recurso);
        }
    });
}
    //get de elemento relacionado con otro (id)
    function rellenarReservas(id){
        var lista_reservas = [];
        //necesitamos conocer las reservas de un recurso.
        rest.get("/api/recursos/"+id+"/reservas",function(estado,respuesta){
            if(estado == 200){
                lista_reservas = respuesta;
                reservas_tabla.innerHTML = "";
                console.log("lista reservas" +lista_reservas);
                for(var i = 0 ; i < lista_reservas.length; i++){ // un mismo recurso, puede tener varias reservas.
                    
                    var fila = document.createElement("tr") // hacemos esto para cada reserva del recurso.
                    var sanitario = document.createElement("td");
                    sanitario.textContent = lista_reservas[i].sanitario;
                    fila.appendChild(sanitario);
                    var horas = document.createElement("td");
                    horas.textContent = lista_reservas[i].horas_estimadas;
                    fila.appendChild(horas);
                    var fecha_pet = document.createElement("td");
                    fecha_pet.textContent = lista_reservas[i].fecha_peticion;
                    fila.appendChild(fecha_pet);
                    var fecha_ini = document.createElement("td");
                    fecha_ini.textContent = lista_reservas[i].fecha_inicio;
                    fila.appendChild(fecha_ini);
                    var fecha_end = document.createElement("td");
                    fecha_end.textContent = lista_reservas[i].fecha_fin;
                    fila.appendChild(fecha_end);
                    if(lista_reservas[i].fecha_fin == null && lista_reservas[i].fecha_inicio == null){
                        fila.style.backgroundColor = "green";
                    }else if(lista_reservas[i].fecha_fin == null){
                        fila.style.backgroundColor = "blue";
                    }
                    reservas_tabla.appendChild(fila);
                }
            }

        })

    }
    function rellenarResenyas(id){
        var lista_resenyas = []
        rest.get("/api/recursos/"+id+"/resenyas",function(estado,respuesta){
            if(estado == 200){
                lista_resenyas = respuesta;
                renyas_tabla.innerHTML = "";
                console.log("lista resenyas" + lista_resenyas);
                for(var i = 0; i < lista_resenyas.length; i++){ //un mismo recurso puede tener varias resenyas.
                var fila = document.createElement("tr");
                
                var fecha = document.createElement("td");
                fecha.textContent = lista_resenyas[i].fecha;
                fila.appendChild(fecha);
                
                var sanitario = document.createElement("td");
                sanitario.textContent = lista_resenyas[i].sanitario;
                fila.appendChild(sanitario);
                
                var valoracion = document.createElement("td");
                valoracion.textContent = lista_resenyas[i].valor + "/5";
                fila.appendChild(valoracion);
                
                var comentario = document.createElement("td");
                comentario.textContent = lista_resenyas[i].descripcion;
                fila.appendChild(comentario);
                
                
                
                renyas_tabla.appendChild(fila);
            }

            }
    })
}
    //crear algo con post o modificar con put, según si recurso_actual_id es null o no.
    //leer inputs y crear objeto
    function guardar_recurso(){
        var inputNumSerie = document.getElementById("num_serie_rec");
    console.log("INPUT NUMERO SERIE:", inputNumSerie); // ?? ¿Existe el elemento?
    console.log("VALOR DEL INPUT:", inputNumSerie.value); // ?? ¿Qué valo

    var recurso = {
        numero_serie : document.getElementById("num_serie_rec").value,
        modelo : document.getElementById("modelo_rec").value,
        ubicacion : document.getElementById("ubicacion_rec").value,
        estado : document.getElementById("estado_rec").value
    };
    console.log(recurso);
    
    



    if(recurso_actual_id != null){ 
        // EDITAR
        rest.put("/api/recursos/" + recurso_actual_id, recurso, function(estado,respuesta){
            if(estado == 201){ // el servidor responde 201 al actualizar
                alert("Recurso actualizado");
            } else {
                alert("Error actualizando el recurso: " + mensajeError(respuesta));
            }
        });
    } else {
        // CREAR
        rest.post("/api/recursos", recurso, function(estado,respuesta){
            if(estado == 201){
                alert("Recurso creado");
                var modeloObj = modelos_lista.find(m => m.id == recurso.modelo);
                var categoriaObj = categorias_lista.find(c => c.id == modeloObj.categoria); //Cogemos la categoria y el modelo del recurso y lo mandamos por el WS.
                wsAvisoNuevoRecurso(categoriaObj.nombre, modeloObj.nombre, recurso.numero_serie);
            } else {
                alert("Error creando el recurso: " + mensajeError(respuesta));
            }
        });
    }
}

// =========================================================
// PRÁCTICA 3 - Parte 1: envío de las reservas al Ministerio de Sanidad
// =========================================================
var URL_MINISTERIO = "https://undefined.ua.es/telemedicina/api/datos";
var ID_AREA = 5; // código de área médica que nos ha asignado el profesor

var AREAS_MEDICAS = {
    1: "Alergología", 2: "Anestesiología", 3: "Cardiología", 4: "Cirugía General",
    5: "Dermatología", 6: "Aparato Digestivo", 7: "Endocrinología", 8: "Ginecología",
    9: "Hematología", 10: "Medicina Interna", 11: "Neumología", 12: "Neurología",
    13: "Oftalmología", 14: "Oncología", 15: "Pediatría", 16: "Psiquiatría",
    17: "Traumatología", 18: "Urología"
};

// ---------- Utilidades de fechas ----------
function dosCifras(n) {
    return (n < 10 ? "0" : "") + n;
}
function formatoFecha(fecha) { // YYYY-MM-DD
    return fecha.getFullYear() + "-" + dosCifras(fecha.getMonth() + 1) + "-" + dosCifras(fecha.getDate());
}
function formatoFechaHora(fecha) { // YYYY-MM-DD HH:MM:SS
    return formatoFecha(fecha) + " " + dosCifras(fecha.getHours()) + ":" + dosCifras(fecha.getMinutes()) + ":" + dosCifras(fecha.getSeconds());
}
function estaVacio(valor) {
    return valor === null || valor === undefined || String(valor).trim() === "";
}
function leerFecha(valor) { // devuelve un Date, o null si la fecha no es válida
    var fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? null : fecha;
}

// ---------- Validación de una reserva ----------
// Antes de enviar una reserva comprobamos que no tenga campos vacíos o incorrectos.
// Devuelve { errores: [...], dato: {...} }. Si hay errores, la reserva no se envía.
// fecha_inicio y fecha_fin pueden ser null (reserva sin empezar / sin terminar): se envían como null.
function validarReserva(reserva, sanitarios, recursos, modelos, categorias) {
    var errores = [];
    var ahora = new Date();

    // Sanitario: tiene que existir y tener nombre y apellidos
    var sanitario = sanitarios.find(s => s.id == reserva.sanitario);
    if (!sanitario) {
        errores.push("el sanitario no existe");
    } else {
        if (estaVacio(sanitario.nombre)) errores.push("el sanitario no tiene nombre");
        if (estaVacio(sanitario.apellidos)) errores.push("el sanitario no tiene apellidos");
    }

    // Categoría: reserva -> recurso -> modelo -> categoría
    var modelo = null;
    var categoria = null;
    var recurso = recursos.find(r => r.id == reserva.recurso);
    if (!recurso) {
        errores.push("el recurso no existe");
    } else {
        modelo = modelos.find(m => m.id == recurso.modelo);
        if (!modelo) {
            errores.push("el modelo del recurso no existe");
        } else {
            categoria = categorias.find(c => c.id == modelo.categoria);
            if (!categoria || estaVacio(categoria.nombre)) errores.push("la categoría del recurso no existe");
        }
    }

    // Horas estimadas: número entero mayor que 0 y sin pasar del máximo del modelo
    var horas = Number(reserva.horas_estimadas);
    if (estaVacio(reserva.horas_estimadas) || !Number.isInteger(horas) || horas <= 0) {
        errores.push("las horas estimadas no son válidas");
    } else if (modelo && horas > modelo.horas_maximas) {
        errores.push("las horas estimadas superan el máximo del modelo");
    }

    // Fecha de petición: obligatoria, válida y no futura
    var fPeticion = null;
    if (estaVacio(reserva.fecha_peticion)) {
        errores.push("no tiene fecha de petición");
    } else {
        fPeticion = leerFecha(reserva.fecha_peticion);
        if (!fPeticion) errores.push("la fecha de petición es incorrecta");
        else if (fPeticion > ahora) errores.push("la fecha de petición es futura");
    }

    // Fecha de inicio: puede ser null; si existe, válida, no futura y posterior a la petición
    var fInicio = null;
    if (!estaVacio(reserva.fecha_inicio)) {
        fInicio = leerFecha(reserva.fecha_inicio);
        if (!fInicio) errores.push("la fecha de inicio es incorrecta");
        else if (fInicio > ahora) errores.push("la fecha de inicio es futura");
        else if (fPeticion && fInicio < fPeticion) errores.push("empieza antes de haberse pedido");
    }

    // Fecha de fin: puede ser null; si existe, necesita fecha de inicio y ser posterior a ella
    var fFin = null;
    if (!estaVacio(reserva.fecha_fin)) {
        fFin = leerFecha(reserva.fecha_fin);
        if (!fFin) errores.push("la fecha de fin es incorrecta");
        else if (fFin > ahora) errores.push("la fecha de fin es futura");
        else if (estaVacio(reserva.fecha_inicio)) errores.push("tiene fecha de fin pero no de inicio");
        else if (fInicio && fFin < fInicio) errores.push("termina antes de empezar");
    }

    if (errores.length > 0) {
        return { errores: errores, dato: null };
    }

    // Objeto con el formato exacto que pide el Ministerio
    return {
        errores: [],
        dato: {
            "nombre": sanitario.nombre,
            "apellidos": sanitario.apellidos,
            "categoría": categoria.nombre,
            "horas_estimadas": horas,
            "fec_pet": formatoFechaHora(fPeticion),
            "fec_ini": fInicio ? formatoFechaHora(fInicio) : null,
            "fecha_fin": fFin ? formatoFechaHora(fFin) : null
        }
    };
}

// ---------- Envío de la remesa ----------
// 1) Varios GET a nuestro servidor para tener todos los datos de las reservas
// 2) Validamos cada reserva
// 3) Un POST al Ministerio con todas las reservas correctas
function enviarReservasMinisterio() {
    mostrarResultadoEnvio("Obteniendo las reservas del servidor...", []);

    rest.get("/api/reservas", function (estado, reservas) {
        if (estado != 200) return mostrarResultadoEnvio("Error obteniendo las reservas del servidor.", []);

        rest.get("/api/sanitarios", function (estado, sanitarios) {
            if (estado != 200) return mostrarResultadoEnvio("Error obteniendo los sanitarios del servidor.", []);

            rest.get("/api/recursos", function (estado, recursos) {
                if (estado != 200) return mostrarResultadoEnvio("Error obteniendo los recursos del servidor.", []);

                rest.get("/api/modelos", function (estado, modelos) {
                    if (estado != 200) return mostrarResultadoEnvio("Error obteniendo los modelos del servidor.", []);

                    rest.get("/api/categorias", function (estado, categorias) {
                        if (estado != 200) return mostrarResultadoEnvio("Error obteniendo las categorías del servidor.", []);

                        prepararYEnviarRemesa(reservas, sanitarios, recursos, modelos, categorias);
                    });
                });
            });
        });
    });
}

function prepararYEnviarRemesa(reservas, sanitarios, recursos, modelos, categorias) {
    var datos = [];       // reservas correctas, con el formato del Ministerio
    var descartadas = []; // reservas con errores: {id, motivo}

    for (var i = 0; i < reservas.length; i++) {
        var resultado = validarReserva(reservas[i], sanitarios, recursos, modelos, categorias);
        if (resultado.errores.length > 0) {
            descartadas.push({ id: reservas[i].id, motivo: resultado.errores.join(", ") });
        } else {
            datos.push(resultado.dato);
        }
    }

    if (datos.length === 0) {
        return mostrarResultadoEnvio("No hay ninguna reserva correcta para enviar.", descartadas);
    }

    var remesa = {
        id_area: ID_AREA,
        fecha: formatoFecha(new Date()), // fecha de la subida en formato YYYY-MM-DD
        datos: datos
    };

    if (!confirm("Se van a enviar " + datos.length + " reservas al Ministerio (" + descartadas.length + " descartadas por errores). ¿Continuar?")) {
        return mostrarResultadoEnvio("Envío cancelado.", descartadas);
    }

    mostrarResultadoEnvio("Enviando la remesa al Ministerio...", descartadas);
    rest.post(URL_MINISTERIO, remesa, function (estado, respuesta) {
        if (estado == 200 || estado == 201) {
            mostrarResultadoEnvio("Remesa enviada correctamente: " + datos.length + " reservas del área " + ID_AREA +
                " (" + AREAS_MEDICAS[ID_AREA] + ") con fecha " + remesa.fecha + ".", descartadas);
            cargarRanking(); // el ranking ya incluye nuestro envío
        } else {
            mostrarResultadoEnvio("El Ministerio no ha aceptado la remesa (código " + estado + ").", descartadas);
        }
    });
}

// Muestra el mensaje del envío y la tabla de reservas descartadas
function mostrarResultadoEnvio(mensaje, descartadas) {
    document.getElementById("resultado_envio").textContent = mensaje;

    var tabla = document.getElementById("tabla_descartadas");
    var lista = document.getElementById("lista_descartadas");
    lista.innerHTML = "";
    tabla.style.display = descartadas.length > 0 ? "table" : "none";

    for (var i = 0; i < descartadas.length; i++) {
        var fila = document.createElement("tr");
        var tdId = document.createElement("td");
        tdId.textContent = descartadas[i].id;
        var tdMotivo = document.createElement("td");
        tdMotivo.textContent = descartadas[i].motivo;
        fila.appendChild(tdId);
        fila.appendChild(tdMotivo);
        lista.appendChild(fila);
    }
}

// ---------- Ranking de reservas por área médica ----------
// GET al Ministerio y sumamos las reservas de todos los envíos de cada área
function cargarRanking() {
    var lista = document.getElementById("lista_ranking");

    rest.get(URL_MINISTERIO, function (estado, envios) {
        lista.innerHTML = "";
        if (estado != 200 || !Array.isArray(envios)) {
            var filaError = document.createElement("tr");
            var tdError = document.createElement("td");
            tdError.colSpan = 5;
            tdError.textContent = "No se ha podido obtener el ranking del Ministerio.";
            filaError.appendChild(tdError);
            lista.appendChild(filaError);
            return;
        }

        // Un contador por cada área médica (1..18)
        var areas = [];
        for (var codigo = 1; codigo <= 18; codigo++) {
            areas.push({ codigo: codigo, nombre: AREAS_MEDICAS[codigo], reservas: 0, envios: 0 });
        }

        // Sumamos las reservas de todos los envíos
        for (var i = 0; i < envios.length; i++) {
            var codigoArea = Number(envios[i].id_area);
            if (!Number.isInteger(codigoArea) || codigoArea < 1 || codigoArea > 18) continue; // área que no existe
            if (!Array.isArray(envios[i].datos)) continue;
            areas[codigoArea - 1].reservas += envios[i].datos.length;
            areas[codigoArea - 1].envios++;
        }

        // Ordenamos de más a menos reservas (si empatan, por código de área)
        areas.sort(function (a, b) {
            return b.reservas - a.reservas || a.codigo - b.codigo;
        });

        for (var j = 0; j < areas.length; j++) {
            var fila = document.createElement("tr");
            var valores = [j + 1, areas[j].nombre, areas[j].codigo, areas[j].reservas, areas[j].envios];
            for (var k = 0; k < valores.length; k++) {
                var td = document.createElement("td");
                td.textContent = valores[k];
                fila.appendChild(td);
            }
            if (areas[j].codigo == ID_AREA) { // resaltamos nuestra área
                fila.style.backgroundColor = "#fff3cd";
                fila.style.fontWeight = "bold";
            }
            lista.appendChild(fila);
        }
    });
}

function volver(){
    cambiarSeccion("inicio");
    //Indicamos que los selects marquen la opción por defecto. 
    document.getElementById("categoria").value = "";
    document.getElementById("modelo").value = "";
    document.getElementById("ubicacion").value = "";
    document.getElementById("estado").value = "";
    //los option se mantienen cargados.
    buscar();
}

    


