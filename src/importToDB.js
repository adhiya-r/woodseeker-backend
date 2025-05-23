const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function importData() {
  const filePath = path.join(__dirname, 'data', 'products.json');
  const rawData = fs.readFileSync(filePath);
  const jsonData = JSON.parse(rawData);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'woodseeker_db',
  });

  try {
    for (const category of jsonData.categories) {
      // Insert category
      await connection.execute(
        'INSERT IGNORE INTO categories (category_id, name) VALUES (?, ?)',
        [category.id, category.name]
      );

      for (const product of category.products) {
        const { id, name, price, description, image, stock, dimensions, material, weight } = product;

        // Convert weight from string to number (e.g., "10 Kg" -> 10)
        const weightValue = parseInt(weight);

        // Insert product
        await connection.execute(
          `INSERT IGNORE INTO products 
          (product_id, name, category_id, price, description, image, stock, width, depth, height, material, weight)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            name,
            category.id,
            price,
            description,
            image,
            stock,
            dimensions.width,
            dimensions.depth,
            dimensions.height,
            material,
            weightValue
          ]
        );

        // Insert colors and product_colors
        for (const colorName of product.colors) {
          // Insert color if not exists
          const [colorRows] = await connection.execute(
            'SELECT color_id FROM colors WHERE name = ?',
            [colorName]
          );

          let colorId;
          if (colorRows.length > 0) {
            colorId = colorRows[0].color_id;
          } else {
            const [insertResult] = await connection.execute(
              'INSERT INTO colors (name) VALUES (?)',
              [colorName]
            );
            colorId = insertResult.insertId;
          }

          // Insert relation into product_colors
          await connection.execute(
            'INSERT IGNORE INTO product_colors (product_id, color_id) VALUES (?, ?)',
            [id, colorId]
          );
        }
      }
    }

        // IMPORT ADMIN
    const adminPath = path.join(__dirname, 'data', 'admin.json');
    const rawAdmin = fs.readFileSync(adminPath);
    const admins = JSON.parse(rawAdmin);

    for (const admin of admins) {
      await connection.execute(
        `INSERT IGNORE INTO admins (nama, email, password_hash) VALUES (?, ?, ?)`,
        [admin.nama, admin.email, admin.password]
      );
    }
    
    console.log('✅ Data import successful!');
  } catch (err) {
    console.error('❌ Error saat import:', err);
  } finally {
    await connection.end();
  }
}

importData();