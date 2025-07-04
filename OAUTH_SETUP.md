# OAuth Configuration Guide

This guide helps you set up Google and Microsoft OAuth authentication for your marketplace application.

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Microsoft OAuth Configuration  
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here
MICROSOFT_TENANT=common
```

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Identity API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:5000` (development)
   - `https://www.arzani.co.uk` (production)
7. Add authorized redirect URIs:
   - `http://localhost:5000/auth/google/callback` (development)
   - `https://www.arzani.co.uk/auth/google/callback` (production)
8. Copy the Client ID and Client Secret to your `.env` file

## Microsoft OAuth Setup

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Set the name and supported account types (multi-tenant recommended)
5. Add redirect URIs:
   - `http://localhost:5000/auth/microsoft/callback` (development)
   - `https://www.arzani.co.uk/auth/microsoft/callback` (production)
6. Go to "Certificates & secrets" → "New client secret"
7. Copy the Application (client) ID and Client secret to your `.env` file

## API Permissions

### Google Scopes Used:
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/userinfo.email`

### Microsoft Scopes Used:
- `openid`
- `profile`
- `email`
- `User.Read`

## Security Features

- **State Parameter**: CSRF protection for OAuth flows
- **Secure Cookies**: HttpOnly cookies for refresh tokens
- **Token Verification**: Server-side verification of ID tokens
- **Database Integration**: Automatic user creation/linking

## Testing

1. Start your development server
2. Navigate to `/signup` or `/login`
3. Click "Continue with Google" or "Continue with Microsoft"
4. Complete the OAuth flow
5. Verify the user is created in your database with the correct provider information

## Troubleshooting

### Common Issues:

1. **Invalid Client ID**: Check that your environment variables are correctly set
2. **Redirect URI Mismatch**: Ensure redirect URIs in your OAuth app match exactly
3. **CORS Issues**: Make sure your domain is added to authorized origins
4. **Token Verification Failed**: Check that your client ID matches the one used for token generation

### Debug Mode:

Set `NODE_ENV=development` to enable additional logging for OAuth flows.

## Database Schema

The system uses these columns in the `users` table:
- `google_id`: Google user identifier
- `microsoft_id`: Microsoft user identifier  
- `auth_provider`: The provider used for authentication
- `google_tokens`: Stored Google tokens (JSON)
- `profile_picture`: User's profile picture URL

## Migration Path

If you have existing email/password users:
1. Users can link OAuth accounts to existing accounts by using the same email
2. The system will update their record with the OAuth provider ID
3. They can then log in with either method
