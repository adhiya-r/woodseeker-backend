const db = require("../config/db");

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
      WHERE p.status != 'deleted'
    `);

    // Ambil warna untuk semua produk
    const [productColors] = await db.query(`
      SELECT pc.product_id, col.name AS color_name
      FROM product_colors pc
      JOIN colors col ON pc.color_id = col.color_id
    `);

    // Gabungkan warna ke masing-masing produk
    console.log('Jumlah produk sebelum merge:', products.length);
    const productIds = products.map(p => p.product_id);
    console.log('ID produk:', productIds);
    const productsWithColors = products.map((product) => {
      const colors = productColors.filter((pc) => pc.product_id === product.product_id).map((pc) => pc.color_name);

      return {
        ...product,
        colors,
      };
    });

    res.json(productsWithColors);
    console.log('Total products:', products.length);
    products.forEach((p, i) => console.log(`Product ${i + 1}:`, p.name, p.status));
  } catch (error) {
    console.error("Gagal ambil produk:", error);
    res.status(500).json({ error: "Gagal mengambil data produk" });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, price, stock, image, description, status = "draft", material, weight, width, depth, height, category_id, colors = [] } = req.body;

    // Insert produk baru
    const [result] = await db.query(
      `
      INSERT INTO products 
      (name, price, stock, image, description, status, material, weight, width, depth, height, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [name, price, stock, image, description, status, material, weight, width, depth, height, category_id]
    );

    const productId = result.insertId;

    // Insert warna produk (jika ada)
    if (colors.length > 0) {
      const values = colors.map((color_id) => [productId, color_id]);
      await db.query("INSERT INTO product_colors (product_id, color_id) VALUES ?", [values]);
    }

    res.status(201).json({ message: "Produk berhasil ditambahkan", productId });
  } catch (error) {
    console.error("Gagal tambah produk:", error);
    res.status(500).json({ error: "Gagal menambahkan produk" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('Updating product with ID:', productId);
    console.log('Request body:', req.body);

    // Ambil data lama
    const [oldDataRows] = await db.query("SELECT * FROM products WHERE product_id = ?", [productId]);
    if (oldDataRows.length === 0) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }
    const oldData = oldDataRows[0];

    // Gunakan data baru jika ada, kalau tidak, pakai data lama
    const {
      name = oldData.name,
      price = oldData.price,
      stock = oldData.stock,
      image = oldData.image,
      description = oldData.description,
      status = oldData.status,
      material = oldData.material,
      weight = oldData.weight,
      width = oldData.width,
      depth = oldData.depth,
      height = oldData.height,
      category_id = oldData.category_id,
      colors, // jangan default-in, karena ini nullable secara logis
    } = req.body;

    console.log('Final data to update:', {
      name, price, stock, image, description, status, 
      material, weight, width, depth, height, category_id
    });

    // Update produk
    const [updateResult] = await db.query(
      `UPDATE products SET
       name = ?, price = ?, stock = ?, image = ?, description = ?, status = ?, 
       material = ?, weight = ?, width = ?, depth = ?, height = ?, category_id = ?
       WHERE product_id = ?`,
      [name, price, stock, image, description, status, material, weight, width, depth, height, category_id, productId]
    );

    console.log('Update result:', updateResult);

    // Kalau user ingin ubah warna, baru hapus & insert warna baru
    if (Array.isArray(colors)) {
      console.log('Updating colors:', colors);
      
      // Hapus warna lama
      await db.query("DELETE FROM product_colors WHERE product_id = ?", [productId]);

      // Insert warna baru (jika ada)
      if (colors.length > 0) {
        const values = colors.map((color_id) => [productId, color_id]);
        await db.query("INSERT INTO product_colors (product_id, color_id) VALUES ?", [values]);
      }
    }

    res.json({ 
      message: "Produk berhasil diperbarui",
      affectedRows: updateResult.affectedRows,
      changedRows: updateResult.changedRows
    });
  } catch (error) {
    console.error("Gagal update produk:", error);
    res.status(500).json({ error: "Gagal memperbarui produk", details: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    console.log("ID produk yang akan dihapus:", productId);

    // Cek apakah produk ada
    const [oldDataRows] = await db.query("SELECT * FROM products WHERE product_id = ?", [productId]);
    console.log("Data produk yang ditemukan:", oldDataRows);

    if (oldDataRows.length === 0) {
      console.log("Produk tidak ditemukan");
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }

    // Hapus produk secara permanen
    const [deleteResult] = await db.query("DELETE FROM products WHERE product_id = ?", [productId]);
    console.log("Hasil delete:", deleteResult);

    if (deleteResult.affectedRows === 0) {
      return res.status(500).json({ error: "Gagal menghapus produk" });
    }

    res.json({ message: "Produk berhasil dihapus secara permanen" });
  } catch (error) {
    console.error("Gagal menghapus produk:", error);
    res.status(500).json({ error: "Gagal menghapus produk" });
  }
};

// exports.recoverProduct = async (req, res) => {
//   try {
//     const productId = req.params.id;
//     // Ubah status 'deleted' kembali ke 'draft'
//     const [oldDataRows] = await db.query("SELECT * FROM products WHERE product_id = ?", [productId]);
//     if (oldDataRows.length === 0) {
//       return res.status(404).json({ error: "Produk tidak ditemukan" });
//     }

//     await db.query("UPDATE products SET status = ? WHERE product_id = ?", ["draft", productId]);

//     res.json({ message: "Produk berhasil dikembalikan dari tempat sampah" });
//   } catch (error) {
//     console.error("Gagal recover produk:", error);
//     res.status(500).json({ error: "Gagal mengembalikan produk" });
//   }
// };

// // GET produk yang statusnya 'deleted' (tempat sampah)
// exports.getTrashProducts = async (req, res) => {
//   try {
//     const [trashedProducts] = await db.query(`
//       SELECT 
//         p.product_id, p.name, p.price, p.stock, p.image, p.description,
//         p.status, p.material, p.weight, p.width, p.depth, p.height,
//         c.category_id, c.name AS category_name
//       FROM products p
//       LEFT JOIN categories c ON p.category_id = c.category_id
//       WHERE p.status = 'deleted'
//     `);

//     // Ambil warna untuk produk trash
//     const productIds = trashedProducts.map((p) => p.product_id);
//     let productColors = [];
//     if (productIds.length > 0) {
//       const placeholders = productIds.map(() => "?").join(",");
//       [productColors] = await db.query(
//         `
//         SELECT pc.product_id, col.name AS color_name
//         FROM product_colors pc
//         JOIN colors col ON pc.color_id = col.color_id
//         WHERE pc.product_id IN (${placeholders})
//       `,
//         productIds
//       );
//     }

//     // Gabungkan warna ke masing-masing produk trash
//     const productsWithColors = trashedProducts.map((product) => {
//       const colors = productColors.filter((pc) => pc.product_id === product.product_id).map((pc) => pc.color_name);

//       return {
//         ...product,
//         colors,
//       };
//     });

//     res.json(productsWithColors);
//   } catch (error) {
//     console.error("Gagal ambil produk trash:", error);
//     res.status(500).json({ error: "Gagal mengambil data produk trash" });
//   }
// };

// Update banyak produk sekaligus (batch update) - untuk saveChanges()
// Di backend updateManyProducts
// exports.updateManyProducts = async (req, res) => {
//   const products = req.body;

//   const conn = await db.getConnection();
//   try {
//     await conn.beginTransaction();

//     console.log(`📊 Updating product ${product_id}: status ${status}`);

//     for (const prod of products) {
//       const { product_id, name, price, stock, image, description, status, material, weight, width, depth, height, category_id, colors = [] } = prod;

//       // Update produk - akses dengan [0]
//       const updateResult = await conn.query(
//         `UPDATE products SET
//         name = ?, price = ?, stock = ?, image = ?, description = ?, status = ?, material = ?, weight = ?, width = ?, depth = ?, height = ?, category_id = ?
//         WHERE product_id = ?`,
//         [name, price, stock, image, description, status, material, weight, width, depth, height, category_id, product_id]
//       );

//       console.log(`✅ Product ${product_id}: matched=${updateResult[0].affectedRows}, changed=${updateResult[0].changedRows}`);

//       const checkStatus = await conn.query(
//         "SELECT name, status FROM products WHERE product_id = ?",
//         [product_id]
//       );

//       // Update warna produk
//       const deleteResult = await conn.query("DELETE FROM product_colors WHERE product_id = ?", [product_id]);
//       console.log(`🗑️ Deleted ${deleteResult[0].affectedRows} colors for product ${product_id}`);

//       if (colors.length > 0) {
//         const values = colors.map((color_id) => [product_id, color_id]);
//         const colorResult = await conn.query("INSERT INTO product_colors (product_id, color_id) VALUES ?", [values]);
//         console.log(`🎨 Inserted ${colorResult[0].affectedRows} colors for product ${product_id}`);
//       }
//     }

//     await conn.commit();
//     console.log('✅ All updates committed successfully');
//     res.json({ message: "Semua produk berhasil diperbarui" });
//   } catch (error) {
//     await conn.rollback();
//     console.error("❌ Transaction failed:", error);
//     res.status(500).json({ error: "Gagal memperbarui produk", details: error.message });
//   } finally {
//     conn.release();
//   }
// };

// GET produk berdasarkan ID
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    const [products] = await db.query(
      `
      SELECT 
        p.product_id, p.name, p.price, p.stock, p.image, p.description,
        p.status, p.material, p.weight, p.width, p.depth, p.height,
        c.category_id, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `,
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }

    // Ambil warna produk
    const [productColors] = await db.query(
      `
      SELECT col.name AS color_name
      FROM product_colors pc
      JOIN colors col ON pc.color_id = col.color_id
      WHERE pc.product_id = ?
    `,
      [productId]
    );

    const product = {
      ...products[0],
      colors: productColors.map((c) => c.color_name),
    };

    res.json(product);
  } catch (error) {
    console.error("Gagal ambil produk:", error);
    res.status(500).json({ error: "Gagal mengambil data produk" });
  }
};

// PUT update status listing produk
exports.updateListingStatus = async (req, res) => {
  try {
    const productId = req.params.id;
    const { listed } = req.body;

    // Misal status listing di-save di kolom 'status' dengan nilai 'listed' dan 'unlisted'
    const newStatus = listed ? "listed" : "unlisted";

    await db.query("UPDATE products SET status = ? WHERE product_id = ?", [newStatus, productId]);

    res.json({ message: `Status listing produk berhasil diubah menjadi ${newStatus}` });
  } catch (error) {
    console.error("Gagal update status listing:", error);
    res.status(500).json({ error: "Gagal memperbarui status listing produk" });
  }
};

// // DELETE permanen produk
// exports.deletePermanentProduct = async (req, res) => {
//   try {
//     const productId = req.params.id;

//     const [oldDataRows] = await db.query("SELECT * FROM products WHERE product_id = ?", [productId]);
//     if (oldDataRows.length === 0) {
//       return res.status(404).json({ error: "Produk tidak ditemukan" });
//     }

//     // Hapus data warna dulu
//     await db.query("DELETE FROM product_colors WHERE product_id = ?", [productId]);

//     // Hapus produk
//     await db.query("DELETE FROM products WHERE product_id = ?", [productId]);

//     res.json({ message: "Produk berhasil dihapus secara permanen" });
//   } catch (error) {
//     console.error("Gagal hapus permanen produk:", error);
//     res.status(500).json({ error: "Gagal menghapus produk secara permanen" });
//   }
// };
