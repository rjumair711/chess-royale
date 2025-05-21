import userModel from "../model/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto"; // ✅ Import crypto to generate gameId

export const RegisterController = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const normalizedEmail = email.toLowerCase();
        let user = await userModel.findOne({ email: normalizedEmail });
        if (user) return res.status(409).json({ message: "Email already in use" });

        const hash = crypto.createHash("sha256").update(email).digest("hex");
        const gameId = BigInt("0x" + hash).toString(36).toUpperCase().slice(0, 10); // Convert to Base36 & uppercase

        const hashedPassword = await bcrypt.hash(password, 10);

        user = new userModel({ username, email: normalizedEmail, password: hashedPassword, gameId });
        await user.save();


        res.status(201).json({
            message: "User registered successfully",
            user: { username: user.username, email: user.email },
        });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};
