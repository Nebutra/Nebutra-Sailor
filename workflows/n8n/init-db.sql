-- Initialize databases for Nebutra services
-- This script runs on first Postgres startup

-- Create n8n database
CREATE DATABASE n8n;

-- Create extension for vector search
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres;
GRANT ALL PRIVILEGES ON DATABASE nebutra TO postgres;
