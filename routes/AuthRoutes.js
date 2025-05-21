import express from 'express';
import { RegisterController } from '../controllers/registerController.js';
import { LoginController } from '../controllers/loginController.js';
import { forgotPassword, resetPassword } from '../controllers/passwordController.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';
import { Logout } from '../controllers/logoutController.js';
import { check } from '../controllers/checkController.js';
import { uploadPictureController } from '../controllers/uploadPictureController.js';
import multer from 'multer';
import { authenticateUser } from '../middlewares/authenticateUser.js';
import { getOpponentProfileController } from "../controllers/opponentPictureController.js";

const router = express.Router();

// Register User
router.post('/register', RegisterController);

// Login User
router.post('/login', LoginController);

// Forgot-Password
router.post('/forgot-password', forgotPassword);

//Reset Password
router.post("/reset-password", resetPassword);

//Get Profile Info
router.get("/get-profile", getProfile);

//Update Profile Info
router.put("/update-profile", updateProfile);

//Logout
router.post("/logout", Logout);

// Check
router.get("/check", check);

// Upload Picture
const upload = multer({ storage: multer.memoryStorage() });

// Add the upload middleware to handle single file upload
router.post('/upload-profile-picture',  authenticateUser, upload.single('profilePicture'), uploadPictureController);

// Oponent Profile
router.get('/get-opponent-profile/:id', getOpponentProfileController);

export default router;

