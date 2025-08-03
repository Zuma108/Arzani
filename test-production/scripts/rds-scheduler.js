import { RDSClient, StopDBInstanceCommand, StartDBInstanceCommand } from '@aws-sdk/client-rds';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

// Initialize RDS client
const rdsClient = new RDSClient({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const dbInstanceIdentifier = process.env.RDS_INSTANCE_ID;

// Stop RDS instance
async function stopRdsInstance() {
  try {
    const command = new StopDBInstanceCommand({
      DBInstanceIdentifier: dbInstanceIdentifier
    });
    
    const response = await rdsClient.send(command);
    console.log(`RDS instance ${dbInstanceIdentifier} stopping:`, response);
    return response;
  } catch (error) {
    console.error('Error stopping RDS instance:', error);
    throw error;
  }
}

// Start RDS instance
async function startRdsInstance() {
  try {
    const command = new StartDBInstanceCommand({
      DBInstanceIdentifier: dbInstanceIdentifier
    });
    
    const response = await rdsClient.send(command);
    console.log(`RDS instance ${dbInstanceIdentifier} starting:`, response);
    return response;
  } catch (error) {
    console.error('Error starting RDS instance:', error);
    throw error;
  }
}

// Schedule RDS stop/start during off-hours (if RDS_INSTANCE_ID is set)
if (dbInstanceIdentifier) {
  // Stop at 10 PM UTC every weekday (customize as needed)
  cron.schedule('0 22 * * 1-5', async () => {
    console.log('Running scheduled RDS shutdown...');
    try {
      await stopRdsInstance();
      console.log('RDS instance stopped successfully');
    } catch (error) {
      console.error('Scheduled RDS stop failed:', error);
    }
  });

  // Start at 6 AM UTC every weekday (customize as needed)
  cron.schedule('0 7 * * 1-5', async () => {
    console.log('Running scheduled RDS startup...');
    try {
      await startRdsInstance();
      console.log('RDS instance started successfully');
    } catch (error) {
      console.error('Scheduled RDS start failed:', error);
    }
  });
  
  console.log(`RDS scheduling enabled for instance: ${dbInstanceIdentifier}`);
  console.log('Schedule: Stop at 10 PM UTC, Start at 6 AM UTC (Mon-Fri)');
} else {
  console.log('RDS scheduling disabled. Set RDS_INSTANCE_ID env variable to enable.');
}

// Export for direct usage
export {
  startRdsInstance,
  stopRdsInstance
};

// If run directly from command line
if (process.argv[2] === 'start') {
  startRdsInstance()
    .then(() => console.log('RDS instance start command sent'))
    .catch(err => console.error('Failed to start RDS instance:', err))
    .finally(() => process.exit());
} else if (process.argv[2] === 'stop') {
  stopRdsInstance()
    .then(() => console.log('RDS instance stop command sent'))
    .catch(err => console.error('Failed to stop RDS instance:', err))
    .finally(() => process.exit());
}
