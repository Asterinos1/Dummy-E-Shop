-- Create the orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_username VARCHAR(255) NOT NULL,
    products JSONB NOT NULL, -- JSONB is efficient for storing product details snapshots
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on customer_username for faster order history retrieval
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_username);

-- Create an index on status to quickly find Pending orders if needed
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);