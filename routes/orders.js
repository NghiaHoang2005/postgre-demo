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
  await pool.query('DELETE FROM order_items WHERE id=$1', [req.params.item_id]);
  res.json({ success: true });
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
  const { id: user_id, role } = req.user;
  let orders;
  if (role === 'admin') {
    orders = (await pool.query('SELECT * FROM orders ORDER BY created_at DESC')).rows;
  } else {
    orders = (await pool.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [user_id])).rows;
  }
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