var board1 = Chessboard('myBoard', 'start');

var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
let CurrentPlayer = null;
let currentMatchTime = null;
let gameEnded = false;
let gameHistory = JSON.parse(localStorage.getItem("gameHistory")) || [];

function startTimer(initialTime, elementId, timeUpCallback, remainingTime = null) {
  let timeRemaining = remainingTime || initialTime;
  const timerDisplay = document.getElementById(elementId);

  // ⬇️ Immediately update the UI
  timerDisplay.textContent = formatTime(timeRemaining);

  let interval;

  function updateTime() {
    timeRemaining--;
    timerDisplay.textContent = formatTime(timeRemaining);
    
    if (timeRemaining <= 0) {
      clearInterval(interval);
      timeUpCallback();
    }
  }

  interval = setInterval(updateTime, 1000);

  return {
    pause: () => clearInterval(interval),
    resume: () => {
      clearInterval(interval);
      interval = setInterval(updateTime, 1000);
    },
    reset: () => {
      timeRemaining = initialTime;
      timerDisplay.textContent = formatTime(timeRemaining); // ⬅️ reset display
      clearInterval(interval);
      interval = setInterval(updateTime, 1000);
    },
    getRemainingTime: () => timeRemaining
  };
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function onDragStart (source, piece, position, orientation) {

  console.log("Drag start - turn:", game.turn(), "CurrentPlayer:", CurrentPlayer);

  if (gameEnded) return false; // ✅ Ensure drag is blocked after game ends  
  
  if(game.turn() != CurrentPlayer) {
    return false;
  }
  
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

function onDrop(source, target) {
   if (gameEnded) return 'snapback';
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q' // auto-promote to queen
  });

  if (move === null) return 'snapback';
  // Check if a piece was captured
  if (move.captured) {
    const capturedColor = move.color === 'w' ? 'b' : 'w'; // Opponent color
    const capturedBy = move.color === 'w' ? 'White' : 'Black'; // Player who made the move
    const captured = capturedColor === 'w' ? 'White' : 'Black'; // Which color was captured
    
    // Call capturePiece locally to update the player's score
    capturePiece(captured);

    // Emit to the other player
    socket.emit('piece_captured', captured); // Emit the capture to the other player
  }
  
  // Emit game state (FEN and turn) to keep both clients in sync
  socket.emit('sync_state', game.fen(), game.turn());

  // Pause both timers before switching turns
if (blackTimerInstance) blackTimerInstance.pause();
if (whiteTimerInstance) whiteTimerInstance.pause();

  // Resume only the player whose turn it is
  if (game.turn() === 'b') {
    blackTimerInstance.resume();
  } else {
    whiteTimerInstance.resume();
  }

  updateStatus(); // Update game status
 
}
// On Change
function onChange() {
  if(game.game_over()) {
    let winner = '';
    if (game.in_checkmate()) {
      // Determine the winner (the other player)
      winner = game.turn() === 'b' ? 'White' : 'Black';
      socket.emit("game_over", winner); // Emit game over to the server with the winner
    }
  }
}
// for castling, en passant, pawn promotion
function onSnapEnd() {
  board.position(game.fen());

  // Check win condition after visual update
  if (!gameEnded) {
    if (whiteScore >= 2) {
      gameEnded = true;
      displayWinMessage("White won!");
      socket.emit("game_over", "White");

      const result = myColor === "white" ? "win" : "loss";
      gameHistory.push({ result, timestamp: Date.now(), winner: "white" });
      localStorage.setItem("gameHistory", JSON.stringify(gameHistory));

    } else if (blackScore >= 2) {
      gameEnded = true;
      displayWinMessage("Black won!");
      socket.emit("game_over", "Black");

      const result = myColor === "black" ? "win" : "loss";
      gameHistory.push({ result, timestamp: Date.now(), winner: "black" });
      localStorage.setItem("gameHistory", JSON.stringify(gameHistory));
    }
  }
}

function updateStatus () {
  var status = ''

  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black';
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status)
  $fen.html(game.fen())
  $pgn.html(game.pgn())
}

var config = {
  draggable: true,
  position: 'start',
  pieceTheme: '../Library/img/chesspieces/wikipedia/{piece}.png',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onChange: onChange,
  onSnapEnd: onSnapEnd,
  onMouseoverSquare: onMouseoverSquare,
  onMouseoutSquare: onMouseoutSquare
}

function onMouseoverSquare(square, piece) {
  // Ensure this is only processed by the local player
  if (!CurrentPlayer) return;

  // Only show highlights for the local player's own pieces
  if (!piece || piece.charAt(0) !== CurrentPlayer) return;

  const moves = game.moves({
    square: square,
    verbose: true
  });

  if (moves.length === 0) return;

  highlightSquare(square);

  for (let i = 0; i < moves.length; i++) {
    highlightSquare(moves[i].to);
  }
}

function onMouseoutSquare(square, piece) {
  removeHighlights()
}

function highlightSquare(square) {
  const squareEl = $('#myBoard .square-' + square)
  squareEl.addClass('highlight-hover')
}

function removeHighlights() {
  $('#myBoard .square-55d63').removeClass('highlight-hover')
}


board = Chessboard('myBoard', config)

updateStatus();

let waitingInterval = null;

function startWaitingDots(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const baseText = "Waiting for opponent to join";
  let dots = 0;

  waitingInterval = setInterval(() => {
    el.textContent = baseText + ".".repeat(dots);
    dots = (dots + 1) % 4;
  }, 500);
}

let socket = io('http://localhost:5000', {
  autoConnect: false, // ❗ Prevents auto-connection before gameId is set
  withCredentials: true,
});

let currentGameId = null;

async function init() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/get-profile', {
      credentials: 'include',
    });
    const data = await res.json();

    if (!data.gameId) {
      console.error("gameId not found in profile response");
      return;
    }

    currentGameId = data.gameId;
    console.log("Game ID fetched:", currentGameId);

    // ✅ Set gameId in query before connecting
    socket.io.opts.query = { gameId: currentGameId };

    socket.connect(); // ✅ Connect only after setting gameId

    // Now safe to attach listeners
    socket.on('connect', () => {
      console.log('Connected to server with socket ID:', socket.id);
    });
    
  } catch (error) {
    console.error("Failed to fetch profile or connect to socket:", error);
  }
}

init();

function handleClickEvent() {
  const timer = Number(document.getElementById('timer-select').value);
  const opponentGameId = localStorage.getItem('opponentGameId');

  if (!opponentGameId) {
    showCustomToast("warning", "No opponent selected!");  // replaced alert here
    return;
  }

  socket.emit('send_invite_to_opponent', {
    timer,
    opponentGameId,
  });
  document.getElementById('parent-btn').classList.add('hidden');
  $('#waiting-text').show();
}

document.addEventListener('DOMContentLoaded', function() {
  startWaitingDots("waiting-text");  
  const buttons = document.getElementsByClassName('time');
    for (let index = 0; index < buttons.length; index++) {
        const button = buttons[index];
        button.onclick = function(event) {
            handleClickEvent(event);
        }
    }
})
let blackTimerInstance = null;
let whiteTimerInstance = null;

let myColor;

socket.on("match_made", (color, time) => {
  myColor = color === "w" ? "white" : "black"; // set player's color
  CurrentPlayer = color;

  console.log("Match made. My color:", myColor, "CurrentPlayer:", CurrentPlayer);

  // UI logic
  $('#main-element').show();
  $('#waiting-text').hide();
  $('#right-panel').show();
  $('#black-timer').removeClass("hidden");
  $('#white-timer').removeClass("hidden");
  $('.time').hide();


  const currentPlayer = color === 'b' ? 'Black' : 'White';

  game.reset();
  board.clear();
  board.start();
  board.orientation(currentPlayer.toLowerCase());

  currentMatchTime = time;

  blackTimerInstance = startTimer(Number(time) * 60, "blackTimerDisplay", () => {
    socket.emit("time_out", 'b');
  });

  whiteTimerInstance = startTimer(Number(time) * 60, "whiteTimerDisplay", () => {
    socket.emit("time_out", 'w');
  });

  blackTimerInstance.pause();
  whiteTimerInstance.pause();

  if (game.turn() === 'b') {
    blackTimerInstance.resume();
  } else {
    whiteTimerInstance.resume();
  }
});

socket.on('sync_state_from_server', function(fen, turn) {
  game.load(fen);
  game.setTurn(turn);
  board.position(fen);

  // Pause both timers initially
  blackTimerInstance.pause();
  whiteTimerInstance.pause();

  // Resume the timer based on whose turn it is
  if (turn === 'b') {
    blackTimerInstance.resume();
  } else {
    whiteTimerInstance.resume();
  }
});

// Initialize scores
let whiteScore = 0;
let blackScore = 0;


// Function to update score when a piece is captured
function capturePiece(captured) {
  let whiteScoreElement = document.getElementById("white-score");
  let blackScoreElement = document.getElementById("black-score");

  let capturedColor = captured.toLowerCase();

  if (capturedColor === "black") {
    whiteScore += 1;
  } else if (capturedColor === "white") {
    blackScore += 1;
  }

  if (whiteScoreElement && blackScoreElement) {
    whiteScoreElement.innerText = whiteScore;
    blackScoreElement.innerText = blackScore;
  }

  // Just emit updated score (no win logic here)
  socket.emit("score_updated", { white: whiteScore, black: blackScore });
}


// Score button toggle logic
document.getElementById("score").addEventListener("click", function () {
  let scoreDiv = document.getElementById("score-section");

  if (!scoreDiv) {
    let rightPanel = document.querySelector(".right-panel");
    scoreDiv = document.createElement("div");
    scoreDiv.id = "score-section";

    scoreDiv.innerHTML = `
      <p class='score-color'>White: <span id="white-score">${whiteScore}</span></p>
      <p class='score-color'>Black: <span id="black-score">${blackScore}</span></p>
    `;

    rightPanel.appendChild(scoreDiv);
  }

  scoreDiv.style.display = scoreDiv.style.display === "none" ? "block" : "none";
});

// Listen for opponent's score updates
socket.on("score_updated_from_server", (score) => {
  whiteScore = score.white;
  blackScore = score.black;

  const whiteScoreElement = document.getElementById("white-score");
  const blackScoreElement = document.getElementById("black-score");

  if (whiteScoreElement) whiteScoreElement.innerText = whiteScore;
  if (blackScoreElement) blackScoreElement.innerText = blackScore;
});

// Also listen for captured piece event
socket.on('piece_captured', function (capturedColor) {
  capturePiece(capturedColor); // update score on this side too
});

// Play Again Button
document.getElementById("play-again-btn").addEventListener("click", function () {

  gameEnded = false;

  // Hide win message and show the timer select dropdown
  document.getElementById("win-message").classList.add("hidden");
  document.getElementById("parent-btn").classList.remove("hidden");
  document.getElementById("play-again-btn").classList.add("hidden");

  // Hide timers
  $('#black-timer').addClass("hidden");
  $('#white-timer').addClass("hidden");

  // Clear timers
  if (blackTimerInstance) blackTimerInstance.pause();
  if (whiteTimerInstance) whiteTimerInstance.pause();
  blackTimerInstance = null;
  whiteTimerInstance = null;

  // Reset game state
  game.reset();
  board.start();

  // Reset scores
  whiteScore = 0;
  blackScore = 0;

  const whiteScoreEl = document.getElementById("white-score");
const blackScoreEl = document.getElementById("black-score");

if (whiteScoreEl) whiteScoreEl.innerText = whiteScore;
if (blackScoreEl) blackScoreEl.innerText = blackScore;

  // Sync board position again to make sure it's clean
  board.position(game.fen());
});


function displayWinMessage(message) {
  const winMessage = document.getElementById("win-message");
  const winnerText = document.getElementById("winner-text");

  winnerText.textContent = message;
  winMessage.classList.remove("hidden");
  document.getElementById("play-again-btn").classList.remove("hidden");

}

function getGameHistory() {
  return JSON.parse(localStorage.getItem("gameHistory")) || [];
}

function saveGameHistory(history) {
  localStorage.setItem("gameHistory", JSON.stringify(history));
}

socket.on("game_over_from_server", (message) => {
  const winMessage = document.getElementById("win-message");
  const winnerText = document.getElementById("winner-text");

  winnerText.textContent = message;
  winMessage.classList.remove("hidden");
  document.getElementById("play-again-btn").classList.remove("hidden");
});


document.getElementById("messages").addEventListener("click", function () {
  let rightPanel = document.querySelector(".right-panel");
  let messagesDiv = document.getElementById("messages-section");

  if (messagesDiv) {
    messagesDiv.style.display =
      messagesDiv.style.display === "none" ? "block" : "none";
  } else {
    // Create the messages section dynamically
    messagesDiv = document.createElement("div");
    messagesDiv.id = "messages-section";
    messagesDiv.innerHTML = `
            <input type="text" id="message" placeholder="Type a message">
            <button type="button" id='send-btn'>Send</button>
            <div id="message-container"></div>    
        `;
    rightPanel.appendChild(messagesDiv);

    // Add event listener for send button

    document.getElementById("send-btn").addEventListener("click", sendMessage);
  }
});
function sendMessage() {
  let message = document.getElementById("message").value.trim();
  if (message !== "") {
    socket.emit("sendMessage", message); // Emit message
    displayMessage(message, true); // Show user message
    document.getElementById("message").value = ""; // Clear input
  }
}

// ✅ Listen for new messages (Ensure event name matches server)
socket.on("displayMessage", function (message) {
  displayMessage(message, false); // Display opponent's message
});

function displayMessage(message, isMine) {
  let msgContainer = document.getElementById("message-container");

  let messageDiv = document.createElement("div");
  messageDiv.classList.add("message", isMine ? "mine" : "other");
  messageDiv.innerText = message; // No username, only message text

  msgContainer.appendChild(messageDiv);
  msgContainer.scrollTop = msgContainer.scrollHeight; // Auto-scroll
}

//PROFILE
document.addEventListener("DOMContentLoaded", () => {  
  document
    .getElementById("profile")
    ?.addEventListener("click", async function () {
      let rightPanel = document.querySelector(".right-panel");
      if (!rightPanel) {
        console.error("Error: .right-panel element not found.");
        return;
      }

      let detailsDiv = document.getElementById("details");
      if (detailsDiv) {
        detailsDiv.style.display =
          detailsDiv.style.display === "none" ? "block" : "none";
      } else {
        detailsDiv = document.createElement("div");
        detailsDiv.id = "details";
        rightPanel.appendChild(detailsDiv);
      }

      try {
        // Fetch user data from the server
        const response = await fetch(
          "http://localhost:5000/api/auth/get-profile",
          {
            method: "GET",
            credentials: "include", // ✅ Important for session authentication
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userData = await response.json();

        detailsDiv.innerHTML = `
                <h2>Profile Info</h2>                
                <p>Game ID: <input type="text" id="gameid-profile" value="${userData.gameId}" disabled /></p>
                <p>Username: <input type="text" id="username-profile" value="${
                  userData.username
                }" disabled /></p>
                <p>Email: <input type="email" id="email-profile" value="${
                  userData.email
                }" disabled /></p>
                <p>Location: <input type="text" id="location-profile" value="${
                  userData.location || ""
                }" /></p>
                <p>Country:
                    <select id="country-profile">
                        <option value="">Select Country</option>
                        <option value="USA" ${
                          userData.country === "USA" ? "selected" : ""
                        }>USA</option>
                        <option value="UK" ${
                          userData.country === "UK" ? "selected" : ""
                        }>UK</option>
                        <option value="Canada" ${
                          userData.country === "Canada" ? "selected" : ""
                        }>Canada</option>
                        <option value="India" ${
                          userData.country === "India" ? "selected" : ""
                        }>India</option>
                    </select>
                </p>
                <p>Language:
                    <select id="language-profile">
                        <option value="">Select Language</option>
                        <option value="English" ${
                          userData.language === "English" ? "selected" : ""
                        }>English</option>
                        <option value="Spanish" ${
                          userData.language === "Spanish" ? "selected" : ""
                        }>Spanish</option>
                        <option value="French" ${
                          userData.language === "French" ? "selected" : ""
                        }>French</option>
                        <option value="German" ${
                          userData.language === "German" ? "selected" : ""
                        }>German</option>
                    </select>
                </p>
                <button id="save-btn">Save</button>
            `;

        // Add event listener to the save button
        document
          .getElementById("save-btn")
          .addEventListener("click", async function () {
            const location = document.getElementById("location-profile").value;
            const country = document.getElementById("country-profile").value;
            const language = document.getElementById("language-profile").value;

            try {
              const updateResponse = await fetch(
                "http://localhost:5000/api/auth/update-profile",
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: "include", // ✅ Ensures session cookies are sent
                  body: JSON.stringify({ location, country, language }),
                }
              );

              if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(errorText || "Unknown error occurred.");
              }

              alert("Profile updated successfully!"); // Success feedback
            } catch (error) {
              alert("Failed to update profile: " + error.message);
            }
          });
      } catch (error) {
        console.error(error);
        alert("Failed to fetch profile: " + error.message);
      }
    });
});

const userProfileImg = async() => {
  const response = await fetch(
    "http://localhost:5000/api/auth/get-profile",
    {
      method: "GET",
      credentials: "include", // ✅ Important for session authentication
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const userData = await response.json();  
  
  // username profile img 
  
  let profileImg = document.getElementById("profile-img");
  
  if (!profileImg) {
    profileImg = document.createElement("img");
    profileImg.id = "profile-img";
    const savedProfilePicture = localStorage.getItem('profilePicture');
    profileImg.src = savedProfilePicture || userData.profilePicture || "/ChessImages/chess.png";
    profileImg.style.width = "45px";
    profileImg.style.height = "45px";
    profileImg.style.cursor = "pointer";
  
    let profileImgContainer = document.getElementById("profile-img-container");
    if (profileImgContainer) {
      profileImgContainer.appendChild(profileImg);
    }
  // After setting up profileImg
  
  } else {
    const savedProfilePicture = localStorage.getItem('profilePicture');
    profileImg.src = savedProfilePicture || userData.profilePicture || "/ChessImages/chess.png";
  
    // ✨ Clone to prevent multiple listeners
    const newProfileImg = profileImg.cloneNode(true);
    profileImg.parentNode.replaceChild(newProfileImg, profileImg);
    profileImg = newProfileImg;
  }
  
  // Now clean, safe to add event listener
  profileImg.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
  
    fileInput.onchange = () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          profileImg.src = e.target.result; // Preview new image
        };
        reader.readAsDataURL(file);
  
        // Upload to server
        uploadProfilePicture(file);
      }
    };
  
    fileInput.click();
  });
  
  // Upload function
  async function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append("profilePicture", file);
  
    try {
      const response = await fetch("http://localhost:5000/api/auth/upload-profile-picture", {
        method: "POST",
        credentials: "include",
        body: formData,
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText); // Log detailed error
    }
    
    const data = await response.json();
    
    if (data && data.profilePictureUrl) {
      userData.profilePicture = data.profilePictureUrl; // ✅ Update memory
      profileImg.src = data.profilePictureUrl;           // ✅ Update DOM
      
      localStorage.setItem('profilePicture', data.profilePictureUrl); // ✅ Save to localStorage
    } else {
      console.warn('Server did not return a new profile picture URL.');
    }
  
      alert("Profile picture updated successfully!");
  
    } catch (error) {
      console.error('Upload Picture Error:', error); // ✅ no "res" here
      alert("Failed to upload profile picture: " + error.message);
    }
  }  
}
userProfileImg();

 // Username display
const username = async() => {
// Fetch user data from the server to display username
try {

  const response = await fetch(
    "http://localhost:5000/api/auth/get-profile",
    {
      method: "GET",
      credentials: "include", // ✅ Important for session authentication
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const userData = await response.json();  
// Handle username separately
let usernameSpan = document.getElementById("username-span");
if (!usernameSpan) {
  usernameSpan = document.createElement("span");
  usernameSpan.id = "username-span";
  usernameSpan.style.fontWeight = "bold";
  usernameSpan.style.marginLeft = "5px";
  
  let usernameContainer = document.getElementById("username-container");
  if (usernameContainer) {
    usernameContainer.appendChild(usernameSpan);
  }
}

// Set username from server data
usernameSpan.textContent = userData.username || "User";

} catch(error) {
  console.error(error);
  alert("Failed to fetch profile: " + error.message);
}
}
username();

  // Opponent username span setup
  let opponentUsernameSpan = document.getElementById("opponent-username-span");
  if (!opponentUsernameSpan) {
    opponentUsernameSpan = document.createElement("span");
    opponentUsernameSpan.id = "opponent-username-span";
    opponentUsernameSpan.style.fontWeight = "bold";
    opponentUsernameSpan.style.marginLeft = "5px";

    const opponentUsernameContainer = document.getElementById("opponent-username-container");
    if (opponentUsernameContainer) {
      opponentUsernameContainer.appendChild(opponentUsernameSpan);
    }
  }

  // Opponent image setup
  let profileImg1 = document.getElementById("profile-img1");
  if (!profileImg1) {
    profileImg1 = document.createElement("img");
    profileImg1.id = "profile-img1";

    const savedOpponentProfilePicture = localStorage.getItem('opponentProfilePicture');
    profileImg1.src = savedOpponentProfilePicture || "/ChessImages/chess.png";

    profileImg1.style.width = "45px";
    profileImg1.style.height = "45px";
    profileImg1.style.cursor = "default";

    const profileImgContainer1 = document.getElementById("opponent-img-container");
    if (profileImgContainer1) {
      profileImgContainer1.appendChild(profileImg1);
    }
  } else {
    const savedOpponentProfilePicture = localStorage.getItem('opponentProfilePicture');
    profileImg1.src = savedOpponentProfilePicture || "/ChessImages/chess.png";
  }

// Function to update opponent's UI

// Get the elements
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('search-btn');

function updateOpponentUI(username, profilePicture) {
  const opponentUsernameSpanElement = document.getElementById("opponent-username-span");
  if (opponentUsernameSpanElement) {
      opponentUsernameSpanElement.textContent = username || "Opponent";
      localStorage.setItem('opponentUsername', username || "");
  }

  const profileImg1Element = document.getElementById("profile-img1");
  if (profileImg1Element) {
      profileImg1Element.src = profilePicture || "/ChessImages/chess.png";
      localStorage.setItem('opponentProfilePicture', profilePicture || "");
  }
}

// Add Event Listener to Search Button
searchBtn.addEventListener('click', async () => {
  const opponentId = searchInput.value.trim();
  if (!opponentId) {
    toastr.warning('Please enter a Game ID.');
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/game/send-request', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receiverGameId: opponentId })
    });

    const result = await response.json();

    if (response.ok) {
      toastr.success('Request sent successfully!');

      // Assuming server response contains sender's username and profile picture
      const { senderUsername, senderProfilePicture, myGameId } = result;
      localStorage.setItem('senderUsername', senderUsername);
      localStorage.setItem('senderProfilePicture', senderProfilePicture || "/ChessImages/chess.png");
      localStorage.setItem('myGameId', myGameId); // Save sender's own game ID
      searchInput.value = '';

      // Emit socket event AFTER request creation succeeds
      socket.emit('sendFriendRequest', {
        senderUsername: senderUsername,
        receiver: opponentId,
        requestId: result.requestId // assuming server returns it
      });

    } else {
      toastr.warning(result.message || 'Failed to send request.');
    }
  } catch (error) {
    console.error('Error sending request:', error);
    toastr.warning('Error sending request.');
  }
});

const requestsList = document.getElementById('requests-list');
// Socket Listener for New Friend Request
socket.on('newFriendRequest', (data) => {
  document.getElementById('friend-requests').classList.remove('hidden');        
  if (!data.requestId) {
    console.error('No requestId received!');
    return; // Prevent further execution if requestId is missing
  }
  const existing = document.querySelector(`li[data-request-id="${data.requestId}"]`);
  if (existing) return; // Don't add again

  const li = document.createElement('li');
  li.innerText = `${data.sender} Wants to Play!`;
  li.setAttribute('data-request-id', data.requestId);
  
  // Accept Button (✔)
  const acceptBtn = document.createElement('button');
  acceptBtn.innerText = '✔';
  acceptBtn.style.marginRight = '10px';
  acceptBtn.onclick = () => acceptFriendRequest(data.requestId);

  // Cancel Button (❌)
  const cancelBtn = document.createElement('button');
  cancelBtn.innerText = '❌';
  cancelBtn.onclick = async () => {
    try {
      if (!data.requestId) {
        console.error('Missing requestId during cancel attempt');
        return;
      }
      
      const response = await fetch(`http://localhost:5000/api/game/cancel-request/${data.requestId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
  
      const result = await response.json();
      if (response.ok) {
        document.getElementById('friend-requests').classList.add('hidden');
        const li = document.querySelector(`li[data-request-id="${data.requestId}"]`);
        if (li) li.remove();
        toastr.success('Request cancelled.');
      } else {
        toastr.error(result.message || 'Failed to cancel request.');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toastr.error('Error cancelling request.');
    }
  };

  // Append buttons to the <li> item
  li.appendChild(acceptBtn);
  li.appendChild(cancelBtn);

  // Append to requests list
  requestsList.appendChild(li);
});

// Function to load incoming friend requests
async function loadFriendRequests() {
  try {
    const response = await fetch('http://localhost:5000/api/game/get-requests', {
      method: 'GET',
      credentials: 'include',
    });

    const result = await response.json();
    
    result.requests.forEach(req => {
      document.getElementById('friend-requests').classList.remove('hidden');  
      const li = document.createElement('li');
      li.innerText = `${req.senderUsername} Wants to Play!`;
      li.setAttribute('data-request-id', req.requestId);
      
      // Accept Button (✔)
      const acceptBtn = document.createElement('button');
      acceptBtn.innerText = '✔'; // Tick icon (or use an image/icon)
      acceptBtn.style.marginRight = '10px';
      acceptBtn.onclick = () => acceptFriendRequest(req.requestId);

      // Cancel Button (❌)
      const cancelBtn = document.createElement('button');
      cancelBtn.innerText = '❌'; // Cross icon (or use an image/icon)
      cancelBtn.onclick = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/game/cancel-request/${req.requestId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
      
          const result = await response.json();

          document.getElementById('friend-requests').classList.remove('hidden');
      
          if (response.ok) {
            const li = document.querySelector(`li[data-request-id="${req.requestId}"]`);
            if (li) li.remove();
            toastr.success('Request cancelled.');
          } else {
            toastr.error(result.message || 'Failed to cancel request.');
          }
        } catch (error) {
          console.error('Error cancelling request:', error);
          toastr.error('Error cancelling request.');
        }
      };
      
      // Append buttons to the <li> item
      li.appendChild(acceptBtn);
      li.appendChild(cancelBtn);

      // Append to requests list
      requestsList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading requests:', error);
    toastr.error('Error loading requests.');
  }
}

// Function to accept friend request
async function acceptFriendRequest(requestId) {
  console.log("Clicked accept for requestId:", requestId);

  try {
    const response = await fetch(`http://localhost:5000/api/game/accept-request/${requestId}`, {
      method: 'POST',
      credentials: 'include',
    });

    const data = await response.json();
    console.log("Accept response:", data);

    if (response.ok) {
      localStorage.setItem('opponentUsername', data.opponent.username);
      localStorage.setItem('opponentProfilePicture', data.opponent.profilePicture || '');
      localStorage.setItem('opponentGameId', data.opponent.gameId); // Opponent's Game ID
      localStorage.setItem('myUsername', data.self.username);
      localStorage.setItem('myProfilePicture', data.self.profilePicture || '');
      localStorage.setItem('myGameId', data.self.gameId); // 👈 Add this

      updateOpponentUI(data.opponent.username, data.opponent.profilePicture || "/ChessImages/chess.png");
      
      // ✅ Emit socket event only after successful accept
      socket.emit("acceptFriendRequest", {
        myGameId: localStorage.getItem("myGameId"),
        senderGameId: localStorage.getItem("opponentGameId"),
      });
      socket.emit("notifyRequestAccepted", {
        receiverGameId: localStorage.getItem("myGameId"),
        senderGameId: localStorage.getItem("opponentGameId"),
        opponentUsername: data.self.username,
        opponentProfilePicture: data.self.profilePicture || "/ChessImages/chess.png"
      });
            
      toastr.success('Request accepted! Joining game...');
      document.getElementById('leave').classList.remove('hidden');
      document.getElementById('opponent-img-container').classList.remove('hidden');
      document.getElementById('parent-btn').classList.remove('hidden');      
      document.getElementById('friend-requests').classList.add('hidden');

      const li = document.querySelector(`li[data-request-id="${requestId}"]`);
      if (li) li.style.display = 'none';
    } else {
      toastr.error(data.message || 'Failed to accept request.');
    }

  } catch (error) {
    console.error('Error accepting request:', error);
    toastr.error('Error accepting request.');
  }
}

// Inside your Chess.html script, perhaps in a function that runs on page load:

function displayOpponentUsernameOnLoad() {
  const storedOpponentUsername = localStorage.getItem('opponentUsername');
  const opponentUsernameSpan = document.getElementById("opponent-username-span");
  if (opponentUsernameSpan && storedOpponentUsername) {
      opponentUsernameSpan.textContent = storedOpponentUsername;
  }
}

function displayOpponentImageOnLoad() {
  const storedImage = localStorage.getItem('opponentProfilePicture');
  const profileImg1 = document.getElementById("profile-img1");
  if (profileImg1 && storedImage) {
    profileImg1.src = storedImage;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  displayOpponentUsernameOnLoad();
  displayOpponentImageOnLoad(); // ✅ Also load the image
});

// Listen for when the opponent accepts the friend request
socket.on('requestAccepted', (data) => {
  if (!data.opponentUsername) return;

  updateOpponentUI(data.opponentUsername, data.opponentProfilePicture || "/ChessImages/chess.png");

  localStorage.setItem('opponentUsername', data.opponentUsername);
  localStorage.setItem('opponentProfilePicture', data.opponentProfilePicture || "/ChessImages/chess.png");
  localStorage.setItem('opponentGameId', data.receiverGameId);

  showCustomToast('success', `${data.opponentUsername} accepted your request!`);
  document.getElementById('leave').classList.remove('hidden');
  document.getElementById('opponent-img-container').classList.remove('hidden');
  document.getElementById('friend-requests').classList.add('hidden');
  document.getElementById('parent-btn').classList.remove('hidden');
});

socket.on('receive_invite_popup', ({ fromGameId, timer }) => {
  const accept = confirm(`You received a ${timer}-minute game invite. Accept?`);

  if (accept) {
    document.getElementById('parent-btn').classList.add('hidden');
    socket.emit('accept_invite', {
      fromGameId,
      timer,
    });
  } else {
    socket.emit('decline_invite', { fromGameId });
  }
});

// Load friend requests when the page is loaded
loadFriendRequests();

document.getElementById("leave").addEventListener("click", () => {
  document.getElementById("leave-confirmation").classList.remove("hidden");
});

document.getElementById("confirm-no").addEventListener("click", () => {
  document.getElementById("leave-confirmation").classList.add("hidden");
});

document.getElementById("confirm-yes").addEventListener("click", () => {
  document.getElementById("leave-confirmation").classList.add("hidden");
  document.getElementById('leave').classList.add('hidden');
  document.getElementById('parent-btn').classList.add('hidden');

  const gameId = localStorage.getItem("myGameId");
  socket.emit("player_left_game", { gameId });

  localStorage.clear();
  location.reload(); // or redirect if needed
});

socket.on("opponent_left_game", ({ message }) => {
  showCustomToast('warning', message);
  document.getElementById('leave').classList.add('hidden');
  document.getElementById('parent-btn').classList.add('hidden');
  localStorage.clear();
 
  setTimeout(() => {
    location.reload();
  }, 3000);  
});

const playBtn = document.getElementById("play-btn");
const timerSelect = document.getElementById("timer-select");

playBtn.addEventListener("click", () => {
  const selectedTime = timerSelect.value;

  if (!selectedTime) {
    showCustomToast("error", "Please select a timer.");
    return;
  }

  const opponentGameId = localStorage.getItem('opponentGameId');

  if (opponentGameId) {
    // Send invite to a specific opponent
    socket.emit('send_invite_to_opponent', {
      timer: Number(selectedTime),
      opponentGameId,
    });
    $('#waiting-text').show();
    document.getElementById('parent-btn').classList.add('hidden');
    console.log("Sent invite to opponent:", opponentGameId, "with timer:", selectedTime);
  } else {
    // Regular matchmaking
    socket.emit("want_to_play", selectedTime);
    console.log("Sent play request with timer:", selectedTime);
  }
});
// Toastr 
function showCustomToast(type, message) {
  toastr.options = {
    toastClass: type === "success" ? "custom-success-toast" : type === "error" ? "custom-error-toast" : "custom-warning-toast",
    iconClasses: {
      success: "custom-success-toast",
      warning: "custom-warning-toast",
      error: "custom-error-toast"
    },
    positionClass: "toast-center-screen",
    timeOut: 3000,
    closeButton: true,
  };
  toastr[type](message);
}