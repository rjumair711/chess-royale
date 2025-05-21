import crypto from "crypto";
import userModel from '../model/User.js';

export const getProfile = async (req, res) => {
    console.log("Session Data:", req.session); // Debugging

    // Fix: Check for req.session.user instead of req.session.userId
    if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        // Use req.session.user.id to fetch user profile
        let user = await userModel.findById(req.session.user.id).select("username email location country language gameId profilePicture");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If user does not have a gameId, generate one
        if (!user.gameId) {
            user.gameId = generateGameId(user.email);
            await user.save(); // Save the new gameId to the database
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Function to generate a random alphanumeric gameId based on the email
const generateGameId = (email) => {
    const hash = crypto.createHash("sha256").update(email).digest("hex");
    const gameId = BigInt("0x" + hash).toString(36).toUpperCase().slice(0, 10); // Convert to Base36 & uppercase
return gameId;
};


// controllers/profileController.js
export const updateProfile = async (req, res) => {
    try {
        // Fix: Use req.session.user.id instead of req.session.userId
        const userId = req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { location, country, language } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update only fields that exist in the request body
        if (location !== undefined) user.location = location;
        if (country !== undefined) user.country = country;
        if (language !== undefined) user.language = language;

        await user.save();

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
