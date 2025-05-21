import userModel from "../model/User.js";

export const authenticateUser = async (req, res, next) => {
  try {
    console.log("Session:", req.session); // <-- Add this

    if (!req.session || !req.session.user || !req.session.user.id) {
      console.log("No valid session found"); // <-- Add this
      return res.status(401).send('Unauthorized: No session');
    }

    const user = await userModel.findById(req.session.user.id);

    if (!user) {
      console.log("User not found in DB"); // <-- Add this
      return res.status(401).send('Unauthorized: User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error); // Already there
    res.status(500).send('Server error during authentication');
  }
};
