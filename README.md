# E-Commerce Demo (Vietnamese, Node.js, PostgreSQL)

## Chức năng chính

- Đăng nhập, đăng ký với vai trò admin hoặc customer
- Admin tạo sản phẩm kèm ảnh, tìm kiếm tiếng Việt không dấu/không phân biệt lỗi chính tả
- Customer tìm kiếm, thêm vào giỏ, đặt hàng, xem đơn hàng

## Hướng dẫn cài đặt

### 1. Chuẩn bị database
- Tạo database tên `ecommerce`
- Chạy file `backend/schema.sql` để khởi tạo bảng, index, extension

### 2. Cấu hình backend
- Copy `backend/.env.example` thành `backend/.env` và sửa thông tin DB, JWT_SECRET

### 3. Chạy backend
```sh
cd backend
npm install
npm start