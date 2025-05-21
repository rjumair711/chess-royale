import { FriendRequestModel } from "../model/FriendRequests.js";
import mongoose from 'mongoose';
import userModel from '../model/User.js'; // adjust path as needed
import { FriendListModel } from '../model/FriendLists.js'; // import the new model


export const sendPlayRequest = async (req, res) => {
  try {
    const { receiverGameId } = req.body;
    const senderId = req.user.id;

    console.log('Received Game ID:', receiverGameId);

    const receiverUser = await userModel.findOne({ gameId: receiverGameId });

    if (!receiverUser) {
      return res.status(404).json({ message: `Receiver with gameId ${receiverGameId} not found.` });
    }

    // ✅ Step 1: Check for existing pending request before creating
    const existingRequest = await FriendRequestModel.findOne({
      sender: senderId,
      receiver: receiverUser._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent.' });
    }

    // ✅ Step 2: Now safe to create
    const friendRequest = new FriendRequestModel({
      sender: senderId,
      receiver: receiverUser._id,
    });

    await friendRequest.save();

    const senderUser = await userModel.findById(senderId);

    res.status(201).json({
      message: "Friend request sent successfully",
      senderUsername: senderUser.username,
      senderProfilePicture: senderUser.profilePicture || "/ChessImages/chess.png",
       myGameId: senderUser.gameId // Include this
    });


  } catch (err) {
    console.error("Send Request Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get Requests
export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await FriendRequestModel.find({ receiver: userId, status: 'pending' })
        .populate('sender', 'username');
    
    const formattedRequests = requests.map(request => ({
        senderUsername: request.sender.username,
        requestId: request._id
    }));
    
    res.json({ requests: formattedRequests });
    
    } catch (error) {
        console.error('Get Requests Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

  
  // Accept Request
  export const acceptFriendRequest = async (req, res) => {
    try {
      const requestId = req.params.id;
      const request = await FriendRequestModel.findById(requestId).populate('sender receiver');
  
      if (!request || request.status !== 'pending') {
        return res.status(400).json({ message: 'Invalid or expired request.' });
      }
  
      request.status = 'accepted';
      await request.save();
  

// Add this after: await request.save(); in acceptFriendRequest
const sender = request.sender;
const receiver = request.receiver;

// Helper function to upsert friend list
const addFriendToList = async (user, friend) => {
  let userFriendList = await FriendListModel.findOne({ user: user._id });

  if (!userFriendList) {
    userFriendList = new FriendListModel({ user: user._id, friends: [] });
  }

  const alreadyFriend = userFriendList.friends.some(f => f.friend.toString() === friend._id.toString());

  if (!alreadyFriend) {
    userFriendList.friends.push({
      friend: friend._id,
      username: friend.username,
      email: friend.email,
      gameId: friend.gameId,
      status: 'online' // or set dynamically
    });
    await userFriendList.save();
  }
};

// Save for both sender and receiver
await addFriendToList(sender, receiver);
await addFriendToList(receiver, sender);

      const roomId = new mongoose.Types.ObjectId();
  
      res.json({
        message: 'Request accepted.',
        roomId,
        opponent: request.sender, // Opponent user info
        self: request.receiver, // Current user info
        senderGameId: request.sender.gameId, // Sender's Game ID
        opponentGameId: request.receiver.gameId, // Opponent's Game ID
   });
      
    } catch (error) {
      console.error('Accept Request Error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };
  
  // Cancel request controller
  export const cancelFriendRequest = async (req, res) => {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
  
      console.log('Request ID:', requestId); // Debug log
      console.log('User ID:', userId); // Debug log
  
      const request = await FriendRequestModel.findById(requestId);
  
      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }
  
      // Ensure only receiver or sender can delete
      if (request.sender.toString() !== userId && request.receiver.toString() !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
  
      await FriendRequestModel.findByIdAndDelete(requestId);
  
      res.json({ message: 'Request cancelled successfully' });
  
    } catch (error) {
      console.error('Cancel Request Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  export const getFriendList = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendList = await FriendListModel.findOne({ user: userId });

    if (!friendList || friendList.friends.length === 0) {
      return res.json({ friends: [] });
    }

    res.json({ friends: friendList.friends });
  } catch (err) {
    console.error('Fetch Friend List Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
  
