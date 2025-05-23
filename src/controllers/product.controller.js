const db = require('../config/db');

exports.getAllProducts = async (req, res) => {
  try {
    // Ambil produk + kategori
    const [products] = await db.query(`
      SELECT 
        p.product_id, p.name, p.price, p.stock, p.image, p.description,
        p.status, p.material, p.weight, p.width, p.depth, p.height,
        c.category_id, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
    `);

    // Ambil warna untuk semua produk
    const [productColors] = await db.query(`
      SELECT pc.product_id, col.name AS color_name
      FROM product_colors pc
      JOIN colors col ON pc.color_id = col.color_id
    `);

    // Gabungkan warna ke masing-masing produk
    const productsWithColors = products.map(product => {
      const colors = productColors
        .filter(pc => pc.product_id === product.product_id)
        .map(pc => pc.color_name);

      return {
        ...product,
        colors
      };
    });

    res.json(productsWithColors);
  } catch (error) {
    console.error('Gagal ambil produk:', error);
    res.status(500).json({ error: 'Gagal mengambil data produk' });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, price, stock, image, description, status = 'draft', material, weight, width, depth, height, category_id, colors = [] } = req.body;

    // Insert produk baru
    const [result] = await db.query(`
      INSERT INTO products 
      (name, price, stock, image, description, status, material, weight, width, depth, height, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, price, stock, image, description, status, material, weight, width, depth, height, category_id]);

    const productId = result.insertId;

    // Insert warna produk (jika ada)
    if (colors.length > 0) {
      const values = colors.map(color_id => [productId, color_id]);
      await db.query('INSERT INTO product_colors (product_id, color_id) VALUES ?', [values]);
    }

    res.status(201).json({ message: 'Produk berhasil ditambahkan', productId });
  } catch (error) {
    console.error('Gagal tambah produk:', error);
    res.status(500).json({ error: 'Gagal menambahkan produk' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, price, stock, image, description, status, material, weight, width, depth, height, category_id, colors = [] } = req.body;

    // Update data produk
    await db.query(`
      UPDATE products SET
      name = ?, price = ?, stock = ?, image = ?, description = ?, status = ?, material = ?, weight = ?, width = ?, depth = ?, height = ?, category_id = ?
      WHERE product_id = ?
    `, [name, price, stock, image, description, status, material, weight, width, depth, height, category_id, productId]);

    // Update warna produk: hapus dulu yg lama, lalu insert yg baru
    await db.query('DELETE FROM product_colors WHERE product_id = ?', [productId]);

    if (colors.length > 0) {
      const values = colors.map(color_id => [productId, color_id]);
      await db.query('INSERT INTO product_colors (product_id, color_id) VALUES ?', [values]);
    }

    res.json({ message: 'Produk berhasil diperbarui' });
  } catch (error) {
    console.error('Gagal update produk:', error);
    res.status(500).json({ error: 'Gagal memperbarui produk' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    // Soft delete dengan ubah status jadi 'deleted'
    await db.query('UPDATE products SET status = ? WHERE product_id = ?', ['deleted', productId]);

    res.json({ message: 'Produk berhasil dipindahkan ke tempat sampah' });
  } catch (error) {
    console.error('Gagal hapus produk:', error);
    res.status(500).json({ error: 'Gagal menghapus produk' });
  }
};

exports.recoverProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    // Ubah status 'deleted' kembali ke 'draft'
    await db.query('UPDATE products SET status = ? WHERE product_id = ?', ['draft', productId]);

    res.json({ message: 'Produk berhasil dikembalikan dari tempat sampah' });
  } catch (error) {
    console.error('Gagal recover produk:', error);
    res.status(500).json({ error: 'Gagal mengembalikan produk' });
  }
};

// GET produk yang statusnya 'deleted' (tempat sampah)
exports.getTrashProducts = async (req, res) => {
  try {
    const [trashedProducts] = await db.query(`
      SELECT 
        p.product_id, p.name, p.price, p.stock, p.image, p.description,
        p.status, p.material, p.weight, p.width, p.depth, p.height,
        c.category_id, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'deleted'
    `);

    // Ambil warna untuk produk trash
    const productIds = trashedProducts.map(p => p.product_id);
    let productColors = [];
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      [productColors] = await db.query(`
        SELECT pc.product_id, col.name AS color_name
        FROM product_colors pc
        JOIN colors col ON pc.color_id = col.color_id
        WHERE pc.product_id IN (${placeholders})
      `, productIds);
    }

    // Gabungkan warna ke masing-masing produk trash
    const productsWithColors = trashedProducts.map(product => {
      const colors = productColors
        .filter(pc => pc.product_id === product.product_id)
        .map(pc => pc.color_name);

      return {
        ...product,
        colors
      };
    });

    res.json(productsWithColors);

  } catch (error) {
    console.error('Gagal ambil produk trash:', error);
    res.status(500).json({ error: 'Gagal mengambil data produk trash' });
  }
};

// Update banyak produk sekaligus (batch update) - untuk saveChanges()
exports.updateManyProducts = async (req, res) => {
  const products = req.body; // array produk lengkap dengan atribut & warna

  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Data harus berupa array produk' });
  }

  const conn = await db.getConnection(); // ambil connection untuk transaksi
  try {
    await conn.beginTransaction();

    for (const prod of products) {
      const { product_id, name, price, stock, image, description, status, material, weight, width, depth, height, category_id, colors = [] } = prod;

      // Update produk
      await conn.query(`
        UPDATE products SET
        name = ?, price = ?, stock = ?, image = ?, description = ?, status = ?, material = ?, weight = ?, width = ?, depth = ?, height = ?, category_id = ?
        WHERE product_id = ?
      `, [name, price, stock, image, description, status, material, weight, width, depth, height, category_id, product_id]);

      // Update warna produk (hapus dulu)
      await conn.query('DELETE FROM product_colors WHERE product_id = ?', [product_id]);

      if (colors.length > 0) {
        const values = colors.map(color_id => [product_id, color_id]);
        await conn.query('INSERT INTO product_colors (product_id, color_id) VALUES ?', [values]);
      }
    }

    await conn.commit();
    res.json({ message: 'Semua produk berhasil diperbarui' });
  } catch (error) {
    await conn.rollback();
    console.error('Gagal update banyak produk:', error);
    res.status(500).json({ error: 'Gagal memperbarui produk' });
  } finally {
    conn.release();
  }
};

// GET produk berdasarkan ID
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    const [products] = await db.query(`
      SELECT 
        p.product_id, p.name, p.price, p.stock, p.image, p.description,
        p.status, p.material, p.weight, p.width, p.depth, p.height,
        c.category_id, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `, [productId]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    // Ambil warna produk
    const [productColors] = await db.query(`
      SELECT col.name AS color_name
      FROM product_colors pc
      JOIN colors col ON pc.color_id = col.color_id
      WHERE pc.product_id = ?
    `, [productId]);

    const product = {
      ...products[0],
      colors: productColors.map(c => c.color_name)
    };

    res.json(product);
  } catch (error) {
    console.error('Gagal ambil produk:', error);
    res.status(500).json({ error: 'Gagal mengambil data produk' });
  }
};

// PUT update status listing produk
exports.updateListingStatus = async (req, res) => {
  try {
    const productId = req.params.id;
    const { listed } = req.body;

    // Misal status listing di-save di kolom 'status' dengan nilai 'listed' dan 'unlisted'
    const newStatus = listed ? 'listed' : 'unlisted';

    await db.query('UPDATE products SET status = ? WHERE product_id = ?', [newStatus, productId]);

    res.json({ message: `Status listing produk berhasil diubah menjadi ${newStatus}` });
  } catch (error) {
    console.error('Gagal update status listing:', error);
    res.status(500).json({ error: 'Gagal memperbarui status listing produk' });
  }
};

// DELETE permanen produk
exports.deletePermanentProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Hapus data warna dulu
    await db.query('DELETE FROM product_colors WHERE product_id = ?', [productId]);

    // Hapus produk
    await db.query('DELETE FROM products WHERE product_id = ?', [productId]);

    res.json({ message: 'Produk berhasil dihapus secara permanen' });
  } catch (error) {
    console.error('Gagal hapus permanen produk:', error);
    res.status(500).json({ error: 'Gagal menghapus produk secara permanen' });
  }
};