import userModel from "../model/User.js";

export const getOpponentProfileController = async (req, res) => {
    try {
      const { id } = req.params; // id = opponent's user _id
  
      if (!id) {
        return res.status(400).send('Opponent ID is required.');
      }
  
      const opponentUser = await userModel.findById(id).select('username profilePicture');
  
      if (!opponentUser) {
        return res.status(404).send('Opponent not found.');
      }
  
      res.json({
        username: opponentUser.username,
        profilePicture: opponentUser.profilePicture,
      });
  
    } catch (error) {
      console.error('Error in getOpponentProfileController:', error);
      res.status(500).send('Server error.');
    }
  };
  