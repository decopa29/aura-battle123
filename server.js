const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// Distribution des fichiers statiques
app.use(express.static(__dirname));

// Route principale vers index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Variable de matchmaking
let waitingPlayer = null;

io.on('connection', (socket) => {
  socket.on('findMatch', (data) => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const roomId = `room_${waitingPlayer.id}_${socket.id}`;
      
      socket.join(roomId);
      waitingPlayer.join(roomId);

      waitingPlayer.emit('matchFound', { 
        roomId, 
        role: 'player1', 
        opponentName: data ? data.nickname : 'Adversaire' 
      });
      
      socket.emit('matchFound', { 
        roomId, 
        role: 'player2', 
        opponentName: waitingPlayer.nickname || 'Adversaire' 
      });

      waitingPlayer = null;
    } else {
      socket.nickname = data ? data.nickname : 'Adversaire';
      waitingPlayer = socket;
    }
  });

  socket.on('updateAura', (data) => {
    socket.to(data.room).emit('opponentAura', data);
  });

  socket.on('signal', (data) => {
    socket.to(data.room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
