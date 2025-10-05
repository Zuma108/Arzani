-- Database setup script for Arzani Marketplace
-- Run this as the postgres superuser

-- Create the marketplace user
CREATE USER marketplace_user WITH PASSWORD 'Olumide123!';

-- Create the database
CREATE DATABASE "my-marketplace" OWNER marketplace_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE "my-marketplace" TO marketplace_user;

-- Connect to the new database and set up schema
\c "my-marketplace"

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO marketplace_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO marketplace_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO marketplace_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO marketplace_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO marketplace_user;

-- Display success message
SELECT 'Database and user created successfully!' as status;