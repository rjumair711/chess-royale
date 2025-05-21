// model/FriendList.js
import mongoose from 'mongoose';

const friendListSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  friends: [
    {
      friend: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String,
      email: String,
      gameId: String,
      status: {
        type: String,
        default: 'online' // or 'offline', etc.
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

export const FriendListModel = mongoose.model('FriendList', friendListSchema);
