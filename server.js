const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.get('/', (req, res) => {
  res.send('Serveur Aura Battle en ligne !');
});

let waitingPlayer = null;

io.on('connection', (socket) => {
  socket.on('findMatch', () => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const room = `room_${waitingPlayer.id}_${socket.id}`;
      socket.join(room);
      waitingPlayer.join(room);
      waitingPlayer.emit('matchFound', { roomId: room, isInitiator: true });
      socket.emit('matchFound', { roomId: room, isInitiator: false });
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
    }
  });

  socket.on('signal', (data) => {
    socket.to(data.room).emit('signal', { sender: socket.id, signal: data.signal });
  });

  socket.on('sendAuraAction', (data) => {
    socket.to(data.room).emit('opponentAuraAction', data);
  });

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
