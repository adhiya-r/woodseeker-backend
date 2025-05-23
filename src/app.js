const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = require('./config/db');
const fs = require('fs');
const path = require('path');

const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');

const app = express();

// app.use(cors());
app.use(cors({
  origin: 'http://127.0.0.1:5500', // Ganti sesuai asal frontend kamu
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public')); // optional, untuk akses frontend lokal

app.get('/', (req, res) => {
  res.send('🎉 Backend Woodseeker jalan!');
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

module.exports = app;