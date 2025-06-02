const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// GET kategori berdasarkan ID
router.get('/:id', categoryController.getCategoryById);

module.exports = router;