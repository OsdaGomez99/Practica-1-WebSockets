document.addEventListener('DOMContentLoaded', function() {
  // Recorrer todos las entradas de texto y agregar el detector de eventos de pulsación de tecla Intro
  // Luego de ingresar el mensaje, vaciar cada cuadro de texto en blanco excepto el nombre de usuario. 
  let inputNodes = document.querySelectorAll('input[type="text"]');
  if (inputNodes.length) {
    inputNodes.forEach(elInput => {
      elInput.addEventListener('keypress', e => {
        // Si se presiona la tecla Intro
        if (e.keyCode == 13) {
          let msg = elInput.value;
          // En cada caso, obtener los mensajes de cada cuadro de texto
          // y vaciar los de public-text y private-text
          switch(elInput.getAttribute('id')) {
            case 'public-text':
              sendMessage('public_msg', msg);
              elInput.value = '';
              break;

            case 'name-text':
              sendMessage('username', msg);
              break;

            case 'private-text':
              sendMessage('private_msg', msg);
              elInput.value = '';
              break;
          }
        }
      });
    });
  }

  // Después de hacer clic en cualquier usuario, inicie un chat privado con ese usuario
  document.body.addEventListener('click', e => {
    if (e.target &&
      e.target.tagName === 'A' &&
      e.target.closest('#user-list') !== null) {

      e.preventDefault();
      sendMessage('connect_private_chat', e.target.getAttribute('data-id'));
      return false;
    }
  });
});

// Enviar mensaje al servidor
connect();
