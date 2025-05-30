const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../auth');
const { requireRole } = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Đảm bảo thư mục uploads luôn tồn tại
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Tạo sản phẩm (admin) + upload ảnh
router.post(
  '/',
  authenticateToken,
  requireRole('admin'),
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, description, price } = req.body;
      const image = req.file ? '/uploads/' + req.file.filename : null;

      const productData = { name, description, price: Number(price), image };

      const { rows } = await pool.query(
        'INSERT INTO products (data) VALUES ($1) RETURNING *',
        [productData]
      );

      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Lỗi server khi thêm sản phẩm' });
    }
  }
);


// List/Search sản phẩm (accent-insensitive, typo-tolerant)
router.get('/', async (req, res) => {
  const { q } = req.query;
  let sql = 'SELECT * FROM products';
  let params = [];
  if (q) {
    sql = `
      SELECT *
      FROM products
      WHERE
        to_tsvector('simple', unaccent(data::text)) @@ plainto_tsquery('simple', unaccent($1))
        OR similarity(unaccent(data->>'name'), unaccent($1)) > 0.3
        OR similarity(unaccent(data->>'description'), unaccent($1)) > 0.3
      ORDER BY
        GREATEST(
          similarity(unaccent(data->>'name'), unaccent($1)),
          similarity(unaccent(data->>'description'), unaccent($1))
        ) DESC
      LIMIT 30
    `;
    params = [q];
  }
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

// Update sản phẩm (admin)
router.put('/:id', authenticateToken, requireRole('admin'), upload.single('image'), async (req, res) => {
  let { data } = req.body;
  data = typeof data === 'string' ? JSON.parse(data) : data;
  if (req.file) {
    data.image = '/uploads/' + req.file.filename;
  }
  const { id } = req.params;
  const { rows } = await pool.query(
    'UPDATE products SET data=$1 WHERE id=$2 RETURNING *', [data, id]
  );
  res.json(rows[0]);
});

// Xoá sản phẩm (admin)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM products WHERE id=$1', [id]);
  res.json({ success: true });
});

module.exports = router;