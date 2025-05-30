const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const app = express();

app.use(cors());
app.use(express.json());

// Các middleware xử lý dữ liệu gửi lên, PHẢI đặt trước route!
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Khởi tạo Multer để sử dụng cho các route upload file
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

app.use(express.static('public'));

// Phục vụ file ảnh tĩnh
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));