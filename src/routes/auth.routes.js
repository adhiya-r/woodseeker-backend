const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../utils/token');

router.get('/', (req, res) => {
  res.send('Auth endpoint aktif!');
});

router.post('/login', authController.login);

router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });

    try {
        const user = verifyToken(token);
        res.json({ success: true, user });
    } catch (err) {
        res.status(401).json({ error: 'Token tidak valid atau expired' });
    }
});

module.exports = router;