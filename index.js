const express = require('express');
const app = express();
const io = require('socket.io')(app.listen(80));

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/bildirim.mp3', (req, res) => {
  res.sendFile(__dirname + '/bildirim.mp3');
});

const users = {};
const messages = [];

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      console.log('Bir kullanıcı ayrıldı: ' + username);
      delete users[socket.id];

      io.emit('user left', username);
    }
  });

  socket.on('set username', (username) => {
    if (username?.length < 2) {
      socket.emit('username error', 'Kullanıcı adı en az 2 karakter olmalıdır.');
      return;
    }

    if (isUsernameTaken(username)) {
      socket.emit('username error', 'Bu kullanıcı adı zaten kullanımda.');
      return;
    }

    const userId = socket.id;
    const user = {
      userId: userId,
      username: username
    };
    users[userId] = user;

    console.log('Kullanıcı adı ayarlandı: ' + username);

    socket.emit('chat history', messages);

    socket.emit('user id', userId);

    socket.broadcast.emit('user joined', username);
  });

  socket.on('chat message', (msg) => {
    const userId = socket.id;
    const user = users[userId];

    if (!user) {
      return;
    }

    const username = user.username;

    console.log('Gelen mesaj: ' + msg);

    const messageData = {
      username: username,
      message: msg,
      timestamp: new Date().toLocaleTimeString()
    };

    io.emit('chat message', messageData);

    messages.push(messageData);

    if (messages.length > 10) {
      messages.shift();
    }
  });
});

function isUsernameTaken(username) {
  if (!username) {
    return true;
  }
  for (let userId in users) {
    if (users.hasOwnProperty(userId)) {
      if (users[userId].username.toLowerCase() === username.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}

function getUserIdBySocketId(socketId) {
  for (let userId in users) {
    if (users.hasOwnProperty(userId)) {
      if (userId === socketId) {
        return userId;
      }
    }
  }
  return null;
}
