// Contoh src/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',          // atau user MySQL
  password: '',          // isi sesuai password MySQL
  database: 'woodseeker_db',
});

module.exports = pool;