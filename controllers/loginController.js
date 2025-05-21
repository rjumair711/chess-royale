import userModel from "../model/User.js";
import bcrypt from "bcryptjs";

export const LoginController = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists in the database
        const user = await userModel.findOne({ email });
        if (!user) return res.status(401).json({ message: "Invalid Credentials" });

        // Check if the password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid Credentials" });

        // Store the user information in the session
        req.session.user = { 
            id: user._id, 
            email: user.email,
            username: user.username,
        };
        req.session.isLoggedIn = true;
        
        console.log(req.session);  // This will log the session object for debugging
        
        res.json({ message: "Login successful", gameId: user.gameId });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};
