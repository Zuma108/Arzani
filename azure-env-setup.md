# Setting Up Environment Variables in Azure

1. Log into the [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service (Arzani)
3. Go to Settings → Configuration
4. Click on "New application setting" for each environment variable in your `.env` file
5. Add the following crucial variables:
   - `NODE_ENV`: Set to `production`
   - `JWT_SECRET`: Your secure JWT secret
   - `DATABASE_URL`: Your production database connection string
   - `SESSION_SECRET`: Your session secret
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - All AWS credentials for S3 storage

> **Important**: Do not include any local development variables like `PORT` as Azure manages these automatically.

6. Click "Save" at the top of the page
7. Confirm when asked about restarting your app

After saving, Azure will restart your application with the new environment variables.
