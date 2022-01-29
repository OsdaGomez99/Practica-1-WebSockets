//Variables para los chats
let chatSocket;
let thisClientId;
let chattingWith;

// Conectar al servidor
function connect() {
  // El servidor debe estar corriendo en el mismo host y puerto.
  if (!window.location.hostname) {
    // Si no hay hostname, es porque estamos en localhost.
    chatSocket = new WebSocket("ws://127.0.0.1:3000");
  }
  else {
    // Si hay hostname, es porque estamos en un servidor.
    chatSocket = new WebSocket(location.origin.replace(/^http/, 'ws'));
  }
  
  // Cuando se conecta al servidor, se ejecuta el código.
  chatSocket.onopen = event => {
    // Al abrir "chatsocket", recorrer todo los cuadros de texto de entrada
     // y habilitarlos excepto el del chat privado.
     // El chat privado se habilitará cada vez que alguien haga clic en tu usuario y viceversa.
    let inputNodes = document.querySelectorAll('input[type="text"]');
    if (inputNodes.length) {
      inputNodes.forEach(elInput => {
        // Si el input no es el del chat privado, habilitarlo.
        if (elInput.getAttribute('id') !== 'private-text') {
          elInput.removeAttribute("disabled");
        }
      });
    }
  };

  // Al recibir el mensaje, reproducir en la pantalla.
  chatSocket.onmessage = event => {
    // Parsear el mensaje como un objeto JSON.
    let msg = JSON.parse(event.data);
    writeMessage(msg);
  };
}

// Enviar mensaje al servidor
function sendMessage(type, text) {
  // Crear un mensaje con los atributos de tipo, texto y fecha.
  var msg = {
    type,
    text,
    date: Date.now()
  };

  //Si el mensaje es privado, agregar el id del usuario con el que se está chateando.
  if (type === 'private_msg') {
    msg.withId = chattingWith.id;
  }

  // Envía el objeto msg como una cadena con formato JSON
  chatSocket.send(JSON.stringify(msg));
}

/**
 * Renderizacion de mensajes en el navegador
 * 
 * @param {string} msg - the actual message object.
 */

// Función para escribir un mensaje en el navegador
function writeMessage(msg) {
  
  //Cuerpo del mensaje que incluye el tipo de mensaje, el texto y la fecha.
  let text = "", timeStr = new Date(msg.date).toLocaleTimeString(), containerToWrite;

  switch(msg.type) {
    // Si el mensaje es de un nuevo usuario, agregarlo a la lista de usuarios y agregar el mensaje de bienvenida.
    case "new_user":
      containerToWrite = document.getElementById("active-list");
      text = `<b>Usuario ${msg.text}</b> (Se unió a las ${timeStr})<br />`;
      thisClientId = msg.id;
      break;

    //Si es un mensaje publico, agregarlo a la lista de mensajes publicos.
    case "public_msg":
      containerToWrite = document.getElementById("chat-public");
      if (msg.from !== null) {
        text = `<li class="in">
                  <div class="chat-body">
                    <div class="chat-message">
                      <h5>${msg.from.username}</h5>
                      <p>${msg.text} - Enviado a las ${timeStr}</p>
                    </div>
                  </div>
                </li>`;
      }
      else {
        text = `<li class="in">
                  <div class="chat-body">
                    <div class="chat-message">
                      <p>${msg.text} - Enviado a las ${timeStr}</p>
                    </div>
                  </div>
                </li>`;
      }
      break;

    //Mensaje de usuarios activos
    case "onlineusers":
      containerToWrite = document.getElementById("active-list");
      let userListText = '', userJoinedAt;
      msg.users.map(user => {
        userJoinedAt = new Date(user.date).toLocaleTimeString();
        if (thisClientId === user.id) {
          userListText += `<b>Usuario ${user.text}</b> (Se unió a las ${userJoinedAt})<br />`;
        }
        else {
          userListText += `<b>Usuario <a href="#" data-id="${user.id}"
            title="Chat con ${user.text}">${user.text}</a></b> (Se unió a las ${userJoinedAt})<br />`;
        }
      });
      containerToWrite.innerHTML = userListText;
      containerToWrite.scrollTop = containerToWrite.scrollHeight;
      break;

    //Si el inicio del chat privado falla, mostrar un mensaje de error.
    case "start_private_chat_failed":
      containerToWrite = document.getElementById("chat-private");
      containerToWrite.classList.add('error');
      containerToWrite.classList.remove('disabled');
      //
      containerToWrite.innerHTML = 'Usuario desconectado. Chat privado falló';
      setTimeout(() => {
        containerToWrite.innerHTML = '';
        containerToWrite.classList.remove('error');
        containerToWrite.classList.add('disabled');
      }, 2000);
      break;

    //Inicio de chat privado
    case "start_private_chat":
      containerToWrite = document.getElementById("chat-private");
      containerToWrite.classList.remove('disabled');
      document.getElementById("private-text").removeAttribute("disabled");
      chattingWith = {id: msg.with.id, username: msg.with.username};
      containerToWrite.innerHTML = `<div class="header">¡Empezaste un chat con ${msg.with.username}!</div>`;
      break;

    //Si el mensaje es privado, agregarlo a la lista de mensajes privados.
    case "private_msg":
      containerToWrite = document.getElementById("chat-private");

      // Si el otro usuario ha actualizado el nombre, actualizar el cliente
      if (!msg.with.self && msg.with.id === chattingWith.id) {
        containerHeader = document.querySelector("#chat-private .header");
        containerHeader.innerHTML = `¡Empezaste un chat con ${msg.with.username}!`;
      }
      text = `<li class="in">
      <div class="chat-body">
        <div class="chat-message">
          <h5>${msg.with.username}</h5>
          <p>${msg.text} - Enviado a las ${timeStr}</p>
        </div>
      </div>
    </li>`;
      break;
  }

  // Agregar el mensaje al contenedor de mensajes.
  if (text.length) {
    containerToWrite.innerHTML = containerToWrite.innerHTML + text;
    containerToWrite.scrollTop = containerToWrite.scrollHeight;
  }
}
