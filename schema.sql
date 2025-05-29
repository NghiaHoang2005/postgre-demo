-- Enable extensions
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- IMMUTABLE wrapper for unaccent (needed for index)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS
$$
  SELECT public.unaccent($1::text)
$$
LANGUAGE SQL IMMUTABLE;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'customer'))
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL
);

-- Full-text search index with immutable_unaccent
CREATE INDEX IF NOT EXISTS idx_products_data_fts
  ON products
  USING GIN (to_tsvector('simple', immutable_unaccent(data::text)));

-- Trigram indexes with immutable_unaccent
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products
  USING GIN ((immutable_unaccent(data->>'name')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_desc_trgm
  ON products
  USING GIN ((immutable_unaccent(data->>'description')) gin_trgm_ops);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);