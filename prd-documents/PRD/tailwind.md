# Tailwind CSS Implementation

## Overview
This project uses Tailwind CSS for styling. We've implemented a conditional loading system that uses a CDN in development and optimized production CSS in production.

## Setup
The Tailwind setup is implemented through a partial: `views/partials/tailwind-setup.ejs`

This partial automatically:
- Uses a CDN in development mode for rapid iteration
- Uses optimized, minified CSS in production for performance

## Usage
To include Tailwind CSS in any view, simply include the partial:
```ejs
<%- include('partials/tailwind-setup') %>
```

## Configuration
For custom Tailwind configurations:
1. Create a `tailwind.config.js` file in the project root
2. Run the Tailwind CLI build process for production builds

## Notes
- The CDN version should only be used in development environments
- For production, we should use Tailwind CLI to build an optimized CSS file
- Current implementation uses environment detection to switch between modes
