# Setting Up Azure Database Access

## Option 1: Azure Database for PostgreSQL

1. In the Azure Portal, search for "Azure Database for PostgreSQL"
2. Click "Create" and select "Flexible server"
3. Configure your database:
   - Server name: `arzani-db`
   - Location: Same as your App Service
   - Version: PostgreSQL 14 (or higher)
   - Compute + storage: Based on your needs
4. Create an admin user and password
5. Configure networking to allow your App Service to connect
6. Click "Review + create" then "Create"

## Option 2: Using External Database

If using an external PostgreSQL database:

1. Ensure the database server allows connections from Azure IPs
2. Configure the firewall to allow Azure services
3. Add your connection string to App Service Configuration:
   ```
   DATABASE_URL=postgresql://username:password@hostname:port/database
   ```

## Configure Database Migration

After connecting to your database:

1. Connect to your database using a tool like pgAdmin or the Azure Portal
2. Run your database migrations:
   - Option 1: Connect to the Azure App Service Console and run migrations manually
   - Option 2: Create a deployment script in your GitHub Actions workflow
