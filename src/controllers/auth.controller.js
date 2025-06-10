const { comparePassword } = require("../utils/hash");
const { generateToken } = require("../utils/token");
const db = require("../config/db"); // pastikan ini adalah koneksi MySQL kamu

exports.login = async (req, res) => {
  const { email, password } = req.body;

  console.log("Body:", req.body);
  try {
    // Ambil admin dari database berdasarkan email
    const [rows] = await db.query("SELECT * FROM admins WHERE email = ?", [email]);
    console.log("Query result:", rows);
    const admin = rows[0];

    if (!admin) {
      return res.status(401).json({ error: "Email tidak ditemukan" });
    }

    // Cek password
    const isPasswordValid = await comparePassword(password, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Password salah" });
    }

    // Generate token
    const token = generateToken({ email: admin.email });

    return res.status(200).json({ message: "Login berhasil", token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
};
