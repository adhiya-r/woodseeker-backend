const db = require('../config/db');

exports.getCategoryById = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const [categories] = await db.query('SELECT * FROM categories WHERE category_id = ?', [categoryId]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    res.json(categories[0]);
  } catch (error) {
    console.error('Gagal ambil kategori:', error);
    res.status(500).json({ error: 'Gagal mengambil data kategori' });
  }
};