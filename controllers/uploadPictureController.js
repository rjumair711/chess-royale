import userModel from "../model/User.js";

export const uploadPictureController = async (req, res) => {
    try {
        if (!req.file) {
            console.log("No file uploaded.");
            return res.status(400).send('No file uploaded.');
        }

        console.log("File received:", req.file);

        const userId = req.user._id;
        console.log("User ID:", userId);

        const fileBuffer = req.file.buffer;
        const base64Image = fileBuffer.toString('base64');
        const dataUri = `data:${req.file.mimetype};base64,${base64Image}`;

        // Update the user's profile picture
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { profilePicture: dataUri },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).send('User not found.');
        }

        console.log("User updated successfully:", updatedUser);
        res.json({ profilePictureUrl: updatedUser.profilePicture });

    } catch (error) {
        console.error('Error in uploadPictureController:', error);
        res.status(500).send('Server error.');
    }
};
