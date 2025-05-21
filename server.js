import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import AuthRoutes from './routes/AuthRoutes.js';
import connectDB from './Database/DB.js';
import session from 'express-session';
import GameRoutes from './routes/GameRoutes.js'; // Adjust path if necessary
import userModel from './model/User.js'; // adjust path as needed
import { FriendRequestModel } from './model/FriendRequests.js';

// ✅ Load environment variables
dotenv.config();

// ✅ Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ✅ Initialize Express app
const app = express();
const server = createServer(app);

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
    origin: ["http://192.168.1.19:5500", "http://localhost:5500", "http://localhost:5000"], // Dev URLs
    methods: ["GET", "POST"],
    credentials: true
};
app.use(cors(corsOptions));

app.use(session({
    secret: process.env.SECRET_KEY, // Change this to a strong, random key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));


app.use('/Images', express.static('Images')); // Serve static images
app.use("/ChessImages", express.static(path.join(__dirname, "ChessImages")));
app.use(express.static(path.join(__dirname, "Client"))); // Serve frontend files
app.use(express.static(path.join(__dirname, "Client/Library"))); // Serve frontend files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// ✅ LiveReload (Only in Development)
// ✅ Connect to the database
connectDB();

// ✅ Authentication Routes
app.use('/api/auth', AuthRoutes);

// Game Friend Request Routes
app.use('/api/game', GameRoutes);

// ✅ Socket.io Setup
export const io = new Server(server, { cors: corsOptions });
let players = {};

let waiting = {
    10: [],
    15: [],
    20: [],
};
let matches = {
    10: [],
    15: [],
    20: [],
};

function removeSocketFromWaitingPeriod(socketId) {
    const timerOptions = [10, 15, 20];
    timerOptions.forEach(time => {
        const index = waiting[time].indexOf(socketId);
        if (index > -1) {
            waiting[time].splice(index, 1); // FIXED: splice on array, not object
            console.log(`Removed ${socketId} from waiting[${time}]`);
        }
    });
    console.log("Updated waiting object:", waiting);
}

function setupMatch(opponentId, socketId, time) {

  players[opponentId].emit("match_made", "w", time)
  players[socketId].emit("match_made", "b", time)
  
  players[opponentId].on('sync_state', function(fen, turn) {
    players[socketId].emit('sync_state_from_server', fen, turn);
  });
  players[socketId].on('sync_state', function(fen, turn) {
    players[opponentId].emit('sync_state_from_server', fen, turn);
  });
  players[opponentId].on('game_over', function(winner) {
    players[socketId].emit('game_over_from_server', winner);
  });
  players[socketId].on('game_over', function(winner) {
    players[opponentId].emit('game_over_from_server', winner);
  });
  //Score Updated
  players[opponentId].on('score_updated', function(score) {
    players[socketId].emit('score_updated_from_server', score);
});

players[socketId].on('score_updated', function(score) {
    players[opponentId].emit('score_updated_from_server', score);
});
}

function HandlePlayRequest(socket, time) {
    if (!waiting[time]) {
        console.log(`Invalid time option: ${time}`);
        return;
    }

    const opponentId = waiting[time].find(id => {
    const myGameId = Object.keys(connectedUsers).find(key => connectedUsers[key] === socket.id);
    const opponentGameId = Object.keys(connectedUsers).find(key => connectedUsers[key] === id);

    return acceptedFriends[myGameId]?.has(opponentGameId);
    });

    if (opponentId) {
     waiting[time] = waiting[time].filter(id => id !== opponentId);

     matches[time].push({
     player1: opponentId,
     player2: socket.id,
    });
  setupMatch(opponentId, socket.id, time);
         document.getElementById('parent-btn').classList.add('hidden');
  console.log(`Match made for timer ${time}: ${opponentId} vs ${socket.id}`);
  return;
}

    if (!waiting[time].includes(socket.id)) {
        waiting[time].push(socket.id);
        console.log(`Added ${socket.id} to waiting[${time}]`);
    }

    console.log("Current waiting list:", waiting);
}

export const connectedUsers = {}; // gameId => socketId
const acceptedFriends = {};
const gameIdToSocket = {};

io.on("connection", (socket) => {
     

    const gameId = socket.handshake.query.gameId;
    console.log("A user connected:", socket.id, "with Game ID:", gameId);

    if (gameId) {
        connectedUsers[gameId] = socket.id;
    }
    // Save gameId-to-socket mapping

    if (io.engine.clientsCount > 1) {
        socket.broadcast.emit("resetMessages");
    }

    socket.on("sendMessage", (message) => {
        console.log(`Message received from ${socket.id}: ${message}`);
        socket.broadcast.emit("displayMessage", message);
    });

    players[socket.id] = socket;

    socket.on("time_out", (timedOutColor) => {
        const opponentEntry = Object.entries(players).find(([id, s]) => s === socket);
        if (!opponentEntry) return;

        const socketId = socket.id;

        for (const time in matches) {
            const matchList = matches[time];
            for (let i = 0; i < matchList.length; i++) {
                const match = matchList[i];

                if (match.player1 === socketId || match.player2 === socketId) {
                    const isPlayer1 = match.player1 === socketId;

                    const timedOutSocketColor = timedOutColor;
                    const winnerSocketId = (timedOutSocketColor === 'w') ? match.player2 : match.player1;
                    const loserSocketId = (timedOutSocketColor === 'w') ? match.player1 : match.player2;

                    const loserColor = timedOutSocketColor === 'w' ? 'White' : 'Black';
                    const winnerColor = timedOutSocketColor === 'w' ? 'Black' : 'White';

                    const message = `${loserColor} ran out of time. ${winnerColor} won!`;

                    players[winnerSocketId].emit("game_over_from_server", message);
                    players[loserSocketId].emit("game_over_from_server", message);

                    matchList.splice(i, 1);
                    return;
                }
            }
        }
    });
  
    socket.on('sendFriendRequest', (data) => {
        console.log('Friend request sent:', data);
      
        const receiverSocketId = connectedUsers[data.receiver];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newFriendRequest', {
            senderUsername: data.senderUsername,
            requestId: data.requestId
          });
        }
      });
      

    socket.on('acceptFriendRequest', async (data) => {
        const { myGameId, senderGameId } = data;

          // Add both directions
        if (!acceptedFriends[myGameId]) acceptedFriends[myGameId] = new Set();
        if (!acceptedFriends[senderGameId]) acceptedFriends[senderGameId] = new Set();

        acceptedFriends[myGameId].add(senderGameId);
        acceptedFriends[senderGameId].add(myGameId);

        try {
            // Get both user documents
            const [me, sender] = await Promise.all([
                userModel.findOne({ gameId: myGameId }),
                userModel.findOne({ gameId: senderGameId })
            ]);
    
            if (!me || !sender) return;
    
            const mySocketId = connectedUsers[myGameId];
            const senderSocketId = connectedUsers[senderGameId];
    
            if (!mySocketId || !senderSocketId) return;
    
            // Send opponent info to each player
            io.to(mySocketId).emit('friendRequestAccepted', {
                opponentId: sender._id, // ✅ send this ID
                opponentUsername: sender.username,
                myUsername: me.username,
                myProfilePicture: me.profilePicture,
            });
            
            io.to(senderSocketId).emit('friendRequestAccepted', {
                opponentId: me._id, // ✅ send this ID
                opponentUsername: me.username,
                myUsername: sender.username,
                myProfilePicture: sender.profilePicture,
            });
              
        } catch (error) {
            console.error("Error accepting friend request:", error);
        }
    });

    socket.on("notifyRequestAccepted", ({ receiverGameId, senderGameId, opponentUsername, opponentProfilePicture }) => {
        const senderSocketId = connectedUsers[senderGameId]; // assuming you map gameId to socket.id
        if (senderSocketId) {
          io.to(senderSocketId).emit("requestAccepted", {
            opponentUsername,
            opponentProfilePicture,
            receiverGameId
          });
        }
      });
    
    socket.on('send_invite_to_opponent', ({ timer, opponentGameId }) => {
  const opponentSocketId = connectedUsers[opponentGameId];

  if (!opponentSocketId) {
    console.log("Opponent not connected.");
    return;
  }

  // Send popup to opponent
  players[opponentSocketId].emit('receive_invite_popup', {
    fromGameId: gameId, // sender's gameId
    timer,
  });
});
   
    socket.on('accept_invite', ({ fromGameId, timer }) => {
    const fromSocketId = connectedUsers[fromGameId];

    if (fromSocketId) {
    setupMatch(socket.id, fromSocketId, timer);
    console.log(`Match accepted: ${fromSocketId} vs ${socket.id}`);
  }
});

 socket.on('want_to_play', (timer) => {
  console.log(`${socket.id} wants to play with timer: ${timer}`);
  HandlePlayRequest(socket, parseInt(timer)); // parse to ensure number
});

socket.on("player_left_game", ({ gameId }) => {
  const leaverSocketId = socket.id;

  // Get opponentGameId from the accepted friends map
  const opponentSet = acceptedFriends[gameId];
  if (!opponentSet) return;

  const opponentGameId = [...opponentSet][0]; // Assuming 1v1
  const opponentSocketId = connectedUsers[opponentGameId];

  if (opponentSocketId) {
    io.to(opponentSocketId).emit("opponent_left_game", {
      message: "Your opponent has left the game.",
      opponentGameId: gameId
    });
  }

  // Optionally clean up
  delete acceptedFriends[gameId];
  delete acceptedFriends[opponentGameId];
});

socket.on("registerGameId", (gameId) => {
  gameIdToSocket[gameId] = socket;
  console.log(`Game ID ${gameId} connected`);
});

// Listen for game results from one client and inform the opponent
socket.on("gameResult", (data) => {
  const opponentSocket = gameIdToSocket[data.opponentGameId];

  if (opponentSocket) {
    // Flip the IDs and result for the opponent
    const flippedData = {
      myGameId: data.opponentGameId,
      opponentGameId: data.myGameId,
      result: data.result === "win" ? "loss" : "win",
      timestamp: data.timestamp,
    };

    opponentSocket.emit("updateOpponentGame", flippedData);
  }
});
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);

        // Remove from players
        delete players[socket.id];

        // Remove from waiting list
        removeSocketFromWaitingPeriod(socket.id);

        // Remove from matches
        Object.keys(matches).forEach(time => {
            matches[time] = matches[time].filter(
                match => match.player1 !== socket.id && match.player2 !== socket.id
            );
        });

        // Remove from connectedUsers
        const gameId = Object.keys(connectedUsers).find(key => connectedUsers[key] === socket.id);
        if (gameId) {
            delete connectedUsers[gameId];
        }

        // Optionally notify friends/opponents
    });
});


// ✅ Serve Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Client", "HTML", "Homepage.html"));
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🌍 Server running on port ${PORT}`));
