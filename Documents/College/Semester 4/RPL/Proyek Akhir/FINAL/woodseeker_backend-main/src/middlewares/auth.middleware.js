const { verifyToken } = require('../utils/token');

exports.verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyToken(token);
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token tidak valid.' });
    }
};