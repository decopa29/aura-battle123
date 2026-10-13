const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configuration de Socket.io avec autorisations CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serveur les fichiers statiques (notamment index.html)
app.use(express.static(__dirname));

// Route principale : renvoie la page de jeu index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Variable pour stocker un joueur en attente de matchmaking
let waitingPlayer = null;

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log(`Joueur connecté : ${socket.id}`);

  // Recherche d'adversaire (Matchmaking)
  socket.on('findMatch', () => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      // Un joueur attendait, on crée une salle commune
      const roomId = `room_${waitingPlayer.id}_${socket.id}`;
      
      socket.join(roomId);
      waitingPlayer.join(roomId);

      // Prévenir les deux joueurs que la partie commence
      waitingPlayer.emit('matchFound', { roomId, role: 'player1' });
      socket.emit('matchFound', { roomId, role: 'player2' });

      console.log(`Partie lancée dans la room : ${roomId}`);
      waitingPlayer = null;
    } else {
      // Aucun joueur en attente, ce joueur devient l'attendant
      waitingPlayer = socket;
      console.log(`Joueur ${socket.id} en attente d'un adversaire...`);
    }
  });

  // Relais des actions de jeu / attaques entre les deux joueurs
  socket.on('sendAuraAction', (data) => {
    socket.to(data.room).emit('opponentAuraAction', data);
  });

  // Relais des données WebRTC ou signaux si nécessaire
  socket.on('signal', (data) => {
    socket.to(data.room).emit('signal', data);
  });

  // Déconnexion d'un joueur
  socket.on('disconnect', () => {
    console.log(`Joueur déconnecté : ${socket.id}`);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

// Port d'écoute pour Railway (0.0.0.0 est indispensable sur Railway)
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
