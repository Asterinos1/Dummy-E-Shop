-- Create the products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    seller_username VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on seller_username for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_username);

-- Create an index on name for search performance
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Optional: Seed some initial data for testing
INSERT INTO products (name, description, price, image_url, quantity, seller_username)
VALUES 
('Gaming Laptop', 'High performance laptop with RTX 4060', 1200.00, 'https://via.placeholder.com/200', 10, 'seller1'),
('Wireless Mouse', 'Ergonomic wireless mouse', 25.50, 'https://via.placeholder.com/200', 50, 'seller1');