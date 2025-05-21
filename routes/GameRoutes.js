import { sendPlayRequest, getFriendRequests, acceptFriendRequest, cancelFriendRequest, getFriendList } from '../controllers/FriendRequestController.js';
import express from 'express';

const router = express.Router();

// Authentication middleware (example)
const authenticateUser = (req, res, next) => {
    if (!req.session.user || !req.session.isLoggedIn) {
        return res.status(401).json({ message: "User not authenticated" });
    }

    // Attach user to the request object for easy access
    req.user = req.session.user;

    next();
};

// Apply authentication middleware to the specific routes that need it
router.use(authenticateUser); // Protect all routes in this router

// POST /api/game/send-request - Send a play request
router.post('/send-request', sendPlayRequest);

// GET /api/game/get-requests - Get incoming play requests
router.get('/get-requests', getFriendRequests);

// POST /api/game/accept-request/:id - Accept a play request
router.post('/accept-request/:id', acceptFriendRequest);

// delete 
router.delete('/cancel-request/:requestId', authenticateUser, cancelFriendRequest);

// Friend Lists
router.get('/list', authenticateUser, getFriendList);

export default router;
