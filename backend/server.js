const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

const dbUrl = process.env.DATABASE_URL || "";

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes("localhost") || dbUrl.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false },
});

/* ---------- Login & token ---------- */

const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const SECRET = process.env.TOKEN_SECRET || ADMIN_PASS || "dev-secret";

function hash(teks) {
  return crypto.createHash("sha256").update(String(teks)).digest();
}

function samaAman(a, b) {
  return crypto.timingSafeEqual(hash(a), hash(b));
}

function buatToken() {
  const exp = Date.now() + 12 * 60 * 60 * 1000; // berlaku 12 jam
  const sig = crypto.createHmac("sha256", SECRET).update(String(exp)).digest("hex");
  return exp + "." + sig;
}

function tokenValid(token) {
  const [exp, sig] = (token || "").split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const benar = crypto.createHmac("sha256", SECRET).update(exp).digest("hex");
  return sig.length === benar.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(benar));
}

function cekAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!tokenValid(token)) {
    return res.status(401).json({ error: "Sesi admin tidak valid, silakan login ulang" });
  }
  next();
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!ADMIN_USER || !ADMIN_PASS) {
    return res.status(500).json({ error: "ADMIN_USER / ADMIN_PASS belum diset di server" });
  }

  if (samaAman(username || "", ADMIN_USER) && samaAman(password || "", ADMIN_PASS)) {
    return res.json({ token: buatToken() });
  }

  res.status(401).json({ error: "Username atau password salah" });
});

/* ---------- Database ---------- */

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS paslon (
      id INT PRIMARY KEY,
      nama TEXT NOT NULL,
      suara INT NOT NULL DEFAULT 0 CHECK (suara >= 0)
    )
  `);

  await pool.query(`
    INSERT INTO paslon (id, nama, suara)
    VALUES (1, 'Paslon 01', 0), (2, 'Paslon 02', 0)
    ON CONFLICT (id) DO NOTHING
  `);
}

async function ambilSemua() {
  const { rows } = await pool.query("SELECT id, nama, suara FROM paslon ORDER BY id");
  return rows;
}

/* ---------- Endpoint suara ---------- */

// READ (terbuka untuk admin & guest)
app.get("/api/suara", async (req, res) => {
  try {
    res.json(await ambilSemua());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data" });
  }
});

// UPDATE (khusus admin)
app.post("/api/suara/:id/tambah", cekAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "UPDATE paslon SET suara = suara + 1 WHERE id = $1",
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Paslon tidak ditemukan" });
    res.json(await ambilSemua());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menambah suara" });
  }
});

app.post("/api/suara/:id/kurang", cekAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "UPDATE paslon SET suara = GREATEST(suara - 1, 0) WHERE id = $1",
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Paslon tidak ditemukan" });
    res.json(await ambilSemua());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengurangi suara" });
  }
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => app.listen(PORT, () => console.log("Server jalan di port " + PORT)))
  .catch((err) => {
    console.error("Gagal inisialisasi DB:", err);
    process.exit(1);
  });