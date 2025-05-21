import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    location: { type: String, default: "" },
    country: { type: String, default: "" },
    language: { type: String, default: "" },
    gameId: { type: String, unique: true, required: true }, 
    profilePicture: { type: String, default: "" }, 
}, { collection: 'user-data' });

const userModel =  mongoose.model("User", userSchema);
 export default userModel;