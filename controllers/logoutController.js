export const Logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout Error:", err);
            return res.status(500).json({ message: "Logout Failed" });
        }
        res.clearCookie("connect.sid"); // ✅ Clear session cookie
        
        
        res.json({ message: "Logged out successfully" });
    });
};