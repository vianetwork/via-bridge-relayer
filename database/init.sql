-- Create database (run this as postgres user)
-- CREATE DATABASE bridge_monitor;

-- Connect to the database and create tables
-- \c bridge_monitor;

-- Create the bridge_events table
CREATE TABLE IF NOT EXISTS bridge_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_address ON bridge_events (contract_address);
CREATE INDEX IF NOT EXISTS idx_transaction_hash ON bridge_events (transaction_hash);
CREATE INDEX IF NOT EXISTS idx_block_number ON bridge_events (block_number);
CREATE INDEX IF NOT EXISTS idx_event_name ON bridge_events (event_name);
CREATE INDEX IF NOT EXISTS idx_created_at ON bridge_events (created_at);

-- Create unique constraint to prevent duplicate events
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event 
ON bridge_events (transaction_hash, event_name, contract_address);

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON DATABASE bridge_monitor TO your_username;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;

-- Sample queries for testing
-- SELECT COUNT(*) FROM bridge_events;
-- SELECT * FROM bridge_events ORDER BY created_at DESC LIMIT 10; 