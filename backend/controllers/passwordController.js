import userModel from "../model/User.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import bcrypt from 'bcryptjs';
dotenv.config();

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const userData = await userModel.findOne({ email });

        if (!userData) {
            return res.status(404).send({ success: false, message: "This email does not exist" });
        }

        // Store userId in session
        req.session.userId = userData._id;  
        console.log("Session userId set:", req.session.userId);

        // Send password reset email
        passwordReset(userData.username, userData.email);

        res.status(200).send({ success: true, message: "Please check your inbox for mail." });

    } catch (error) {
        console.error("Forgot password error:", error.message);
        res.status(500).send({ success: false, message: "Internal Server Error" });
    }
};

const passwordReset = async (name, email) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Reset Your Password',
            html: `<p>Hi ${name},</p>
                   <p>Please click the link below to reset your password:</p>
                   <a href="http://localhost:5000/HTML/ResetPassword.html">Reset Password</a>`
        };

        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                console.log("Email error:", error);
            } else {
                console.log("Mail sent:", info.response);
            }
        });

    } catch (error) {
        console.error("Error sending email:", error.message);
    }
};


export const resetPassword = async (req, res) => {
    try {
        const userId = req.session.userId; // Get user from session
        console.log("Session userId:", userId);

        if (!userId) {
            return res.status(401).send({ success: false, message: "Unauthorized request. Session expired or invalid." });
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).send({ success: false, message: "User not found" });
        }

        const password = req.body.password;
        console.log("New password received:", password);

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Hashed password:", hashedPassword);

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $set: { password: hashedPassword } },
            { new: true }
        );

        if (!updatedUser) {
            console.log("Password update failed");
            return res.status(500).send({ success: false, message: "Password update failed" });
        }

        console.log("Password updated successfully:", updatedUser);
        res.status(200).send({ success: true, message: "User password has been reset" });

    } catch (error) {
        console.error("Error resetting password:", error.message);
        res.status(500).send({ success: false, message: "Internal Server Error" });
    }
};
