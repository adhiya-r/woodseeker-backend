const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/categories.routes');
const errorHandler = require('./middlewares/error.middleware');
const app = express();

app.use(cors({
  origin: "*", 
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('🎉 Backend Woodseeker jalan!');
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

module.exports = app;