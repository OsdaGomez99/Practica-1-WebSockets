//Inicializacion de librerias, servidor y del puerto a conectar
const http = require("http");
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const uuid = require('uuid');
const currentPrivateChat = [];
const port = process.env.PORT || 3000;

// Creacion de un servidor estático para servir archivos de clientes
const server = http.createServer(function(req, res) {
  if (req.url === '/') {
    fs.readFile('./index.html', 'UTF-8', (err, html) => {
      // Si no hay error, se envia el archivo index.html
      res.writeHead(200, {"Content-Type": "text/html"});
      // Se envia el archivo index.html
      res.end(html);
    });
  }
  else if (req.url.match(/.css$/)) {
    // Si la url termina en .css, se envia el archivo css
    const cssStream = fs.createReadStream(path.join(__dirname, req.url), 'UTF-8');
    // Se envia el archivo css
    res.writeHead(200, {"Content-Type": "text/css"});
    cssStream.pipe(res);
  }
  else if (req.url.match(/.js$/)) {
    // Si la url termina en .js, se envia el archivo js
    const jsStream = fs.createReadStream(path.join(__dirname, req.url), 'UTF-8');
    // Se envia el archivo js
    res.writeHead(200, {"Content-Type": "application/javascript"});
    jsStream.pipe(res);
  }
}).listen(port);

//Creacion de un objeto tipo server
const wss = new WebSocket.Server({server});

// Enviar al cliente solo si hay algún cambio.
setInterval(updateOnlineUsers, 3000);

// Mensaje por consola de inicio de servidor
console.log('Servidor iniciado en el puerto ' + port);

//Evento de conexion de un cliente
wss.on('connection', ws => {
  const currentTime = Date.now();

  //Se asigna una id unico a cada cliente, se establece el nombre de usuario en Anónimo y se configura el tiempo de inicio de sesión
  //al momento de realizar la conexión.
  Object.assign(ws, {id: uuid.v4(), username: 'Anónimo', date: currentTime});

  //Se envia de nuevo al cliente para que se muestre que se agregó un nuevo usuario
  ws.send(JSON.stringify({type:'new_user', text: 'Anónimo', id: ws.id, date: currentTime}));

  //Envio de mensaje general para los demas usuarios reciban notificaciones de un nuevo usuario
  broadCastThis({type:'public_msg', text: '¡Alguien se ha unido!', from: null, date: currentTime});

  ws.on('message', message => {

    //Se obtiene el mensaje enviado por el cliente
    let messageParsed = JSON.parse(message);
    console.log(messageParsed);

    //Se obtiene el tipo de mensaje que se envió
    if (messageParsed.type === 'private_msg') {
      //Se obtiene el id del usuario que envió el mensaje
      fromClient = findClientById(ws.id);
      //Se obtiene el id del usuario al que se le envió el mensaje
      toClient = findClientById(messageParsed.withId);
      //Se obtiene el mensaje enviado por el usuario
      delete messageParsed.withId;

       // Obtener de fromClient a toClient.
       // Si no existe, se crea una nueva conversación.
      if (typeof toClient === 'undefined' ||
        toClient.readyState !== WebSocket.OPEN ||
        typeof fromClient === 'undefined' ||
        fromClient.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      //Enviar mensaje de chat privado a toClient.
      Object.assign(messageParsed, {with: {id: fromClient.id, username: fromClient.username, self: false}});
      toClient.send(JSON.stringify(messageParsed));

      //Enviar mensaje de chat privado a fromClient.
      Object.assign(messageParsed, {with: {id: toClient.id, username: 'Tu', self: true}});
      fromClient.send(JSON.stringify(messageParsed));
    }
    // Transmitir el mensaje publico a todos los usuarios
    else if(messageParsed.type === 'public_msg') {
      //Se obtiene el id del usuario que envió el mensaje
      Object.assign(messageParsed, {from: {id: ws.id, username: ws.username}});
      //Se envia el mensaje a todos los usuarios
      broadCastThis(messageParsed);
    }
    //
    else if(messageParsed.type === 'username') {
      // Actualizar nombre de usuario para el cliente
      ws.username = messageParsed.text;
    }
    else if(messageParsed.type === 'connect_private_chat') {
      connectToClient(ws.id, messageParsed.text);
    }
  });
});

// Transmitir el mensaje publico a todos los usuarios
function broadCastThis(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Buscar un cliente por su id
function findClientById(id) {
  let clientFound;
  wss.clients.forEach(client => {
    // Si el cliente tiene el id que se busca, se guarda en clientFound 
    if (client.id === id && client.readyState === WebSocket.OPEN) {
      clientFound = client;
    }
  });

  return clientFound;
}

// Actualizar el listado de usuarios en línea, incluso si alguien cerró la ventana de chat.
function updateOnlineUsers() {
  // Se obtiene el listado de usuarios en línea
  const message = {type: 'onlineusers', users: []};

  // Se recorre el listado de usuarios
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      // Se agrega el usuario a la lista de usuarios en línea
      message.users.push({id: client.id, text: client.username, date: client.date});
    }
  });

  // Se envia el listado de usuarios en línea a todos los usuarios
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Conectar a dos usuarios para el chat privado
function connectToClient(fromId, toId) {
  let fromClient, toClient;

  // Obtener de fromClient a toClient.
  fromClient = findClientById(fromId);
  toClient = findClientById(toId);

  //Si ambos usuarios no estan conectados, se muestra un mensaje de error
  if (fromClient.readyState !== WebSocket.OPEN && toClient.readyState !== WebSocket.OPEN) {
    console.log('El chat privado falló porque ambos clientes se desconectaron');
  }
  //Si uno de los dos usuarios no esta conectado, se muestra un mensaje de error
  else if (fromClient.readyState === WebSocket.OPEN && toClient.readyState !== WebSocket.OPEN) {
    fromClient.send(JSON.stringify({type: 'start_private_chat_failed'}));
  }
  //Si ambos usuarios estan conectados, se envia un mensaje de chat privado a toClient
  else if (fromClient.readyState === WebSocket.OPEN && toClient.readyState === WebSocket.OPEN) {
    let message = {type: 'start_private_chat', with: {id: fromClient.id, username: fromClient.username}};
    toClient.send(JSON.stringify(message));

    // Enviar mensaje de inicio de chat privado a fromClient
    message = {type: 'start_private_chat', with: {id: toClient.id, username: toClient.username}};
    //Se envia el mensaje a fromClient
    fromClient.send(JSON.stringify(message));

    currentPrivateChat.push({user1Id: fromClient.id, user2Id: toClient.id});
  }
}
