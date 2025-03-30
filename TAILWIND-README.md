# Tailwind CSS Setup Instructions

This project uses Tailwind CSS for styling. Here's how to properly set it up:

## Development Mode

When running in development mode:

1. Start the CSS watcher:
   ```
   npm run watch:css
   ```

2. In a separate terminal, start your application:
   ```
   npm run dev
   ```

The watcher will automatically rebuild your CSS when you make changes to your HTML files.

## Production Mode

For production builds:

1. Build the optimized CSS:
   ```
   npm run build:css
   ```

2. Start your application in production mode:
   ```
   NODE_ENV=production npm start
   ```

## How It Works

- In development, Tailwind CSS is loaded through the CDN for faster iteration
- In production, we use the compiled and minified CSS file at `/public/css/tailwind.min.css`
- The configuration automatically switches between these modes based on your NODE_ENV setting

## Troubleshooting

If you see the warning about not using the CDN in production:

1. Make sure NODE_ENV is set to 'production'
2. Ensure you've built the CSS with `npm run build:css`
3. Check that `/public/css/tailwind.min.css` exists
