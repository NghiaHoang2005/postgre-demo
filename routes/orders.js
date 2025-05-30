const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../auth');
const router = express.Router();

// Get/create current user's pending order (cart)
router.post('/cart', authenticateToken, async (req, res) => {
  const { id: user_id } = req.user;
  let order = (await pool.query(
    'SELECT * FROM orders WHERE user_id=$1 AND status=$2 LIMIT 1', [user_id, 'pending']
  )).rows[0];
  if (!order) {
    order = (await pool.query(
      'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *', [user_id, 'pending']
    )).rows[0];
  }
  res.json(order);
});

// Add product to cart
router.post('/cart/add', authenticateToken, async (req, res) => {
  const { product_id, quantity } = req.body;
  const { id: user_id } = req.user;
  let order = (await pool.query(
    'SELECT * FROM orders WHERE user_id=$1 AND status=$2 LIMIT 1', [user_id, 'pending']
  )).rows[0];
  if (!order) {
    order = (await pool.query(
      'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *', [user_id, 'pending']
    )).rows[0];
  }
  const existing = (await pool.query(
    'SELECT * FROM order_items WHERE order_id=$1 AND product_id=$2', [order.id, product_id]
  )).rows[0];
  if (existing) {
    await pool.query(
      'UPDATE order_items SET quantity=quantity+$1 WHERE id=$2', [quantity, existing.id]
    );
  } else {
    await pool.query(
      'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
      [order.id, product_id, quantity]
    );
  }
  res.json({ success: true });
});

// Get cart contents
router.get('/cart', authenticateToken, async (req, res) => {
  const { id: user_id } = req.user;
  const order = (await pool.query(
    'SELECT * FROM orders WHERE user_id=$1 AND status=$2 LIMIT 1', [user_id, 'pending']
  )).rows[0];
  if (!order) return res.json({ items: [] });
  const items = (await pool.query(
    `SELECT oi.id, oi.quantity, p.id as product_id, p.data FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1`, [order.id]
  )).rows;
  res.json({ order, items });
});

// Remove item from cart
router.delete('/cart/item/:item_id', authenticateToken, async (req, res) => {
  try {
    // 1. Lấy order_id của item này
    const { rows } = await pool.query(
      'SELECT order_id FROM order_items WHERE id = $1',
      [req.params.item_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    const orderId = rows[0].order_id;

    // 2. Xóa item khỏi order_items
    await pool.query('DELETE FROM order_items WHERE id = $1', [req.params.item_id]);

    // 3. Kiểm tra còn item nào trong giỏ hàng (order) này không
    const { rowCount } = await pool.query(
      'SELECT 1 FROM order_items WHERE order_id = $1 LIMIT 1',
      [orderId]
    );

    // 4. Nếu không còn item nào thì xóa luôn order
    if (rowCount === 0) {
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Checkout
router.post('/cart/checkout', authenticateToken, async (req, res) => {
  const { id: user_id } = req.user;
  const order = (await pool.query(
    'UPDATE orders SET status=$1 WHERE user_id=$2 AND status=$3 RETURNING *',
    ['placed', user_id, 'pending']
  )).rows[0];
  res.json(order || { error: 'No pending order' });
});

// View order history (user or admin)
router.get('/', authenticateToken, async (req, res) => {
  const { id: user_id } = req.user;

  // Lấy tất cả đơn hàng thuộc về user hiện tại
  const ordersRes = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [user_id]
  );

  const orders = ordersRes.rows;

  // Lấy items cho từng đơn hàng
  await Promise.all(orders.map(async (order) => {
    const itemsRes = await pool.query(`
      SELECT oi.quantity,
            json_build_object(
              'data',
              json_build_object(
                'name', p.data->>'name',
                'price', (p.data->>'price')::int
              )
            ) AS product
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [order.id]);

    order.items = itemsRes.rows;
  }));

  res.json(orders);
});



// View order details
router.get('/:order_id', authenticateToken, async (req, res) => {
  const { id: user_id, role } = req.user;
  const { order_id } = req.params;
  const order = (await pool.query('SELECT * FROM orders WHERE id=$1', [order_id])).rows[0];
  if (!order || (order.user_id !== user_id && role !== 'admin')) return res.sendStatus(403);
  const items = (await pool.query(
    `SELECT oi.quantity, p.data FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1`, [order_id]
  )).rows;
  res.json({ order, items });
});

module.exports = router;