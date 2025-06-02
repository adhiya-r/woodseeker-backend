// Contoh src/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',         
  password: '',         
  database: 'woodseeker_db',
});

module.exports = pool;