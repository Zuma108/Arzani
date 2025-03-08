# Setting Up Azure Monitoring

## Basic Monitoring

1. In the Azure Portal, go to your App Service
2. Navigate to "Monitoring" section → "Log stream"
3. View real-time logs of your application

## Application Insights

For advanced monitoring:

1. In the Azure Portal, search for "Application Insights"
2. Click "Create" and link it to your App Service
3. Configure the sampling rate and alerts
4. Add the instrumentation key to your App Service settings:
   ```
   APPINSIGHTS_INSTRUMENTATIONKEY=your-key-here
   ```
5. Install the Application Insights SDK in your application:
   ```bash
   npm install applicationinsights --save
   ```
6. Add to your `azure-startup.js`:
   ```javascript
   const appInsights = require('applicationinsights');
   appInsights.setup()
     .setAutoDependencyCorrelation(true)
     .setAutoCollectRequests(true)
     .setAutoCollectPerformance(true)
     .setAutoCollectExceptions(true)
     .setAutoCollectDependencies(true)
     .start();
   ```

## Setting Up Alerts

1. In Application Insights, go to "Alerts"
2. Create alerts for:
   - High server response time (>1s)
   - Failed requests rate >5%
   - Server exceptions
   - CPU/Memory usage >80%
