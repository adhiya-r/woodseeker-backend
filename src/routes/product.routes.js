const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

// GET semua produk
router.get('/', productController.getAllProducts);

// GET produk berdasarkan id
router.get('/:id', productController.getProductById);

// POST tambah produk
router.post('/add', productController.addProduct);

// PUT update produk by id - DIPERBAIKI: ubah dari /edit/:id ke /update/:id
router.put('/update/:id', productController.updateProduct);

// PUT update status listing produk
router.put('/:id/listing', productController.updateListingStatus);

// DELETE (soft delete) produk by id
router.delete('/:id', productController.deleteProduct);

module.exports = router;