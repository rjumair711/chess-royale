export const check = async (req, res) => {
    if (req.session.isLoggedIn) {
        res.json({ isLoggedIn: true });
    } else {
        res.json({ isLoggedIn: false });
    }
}