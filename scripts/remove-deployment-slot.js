import { exec } from 'child_process';
import readline from 'readline';

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== Azure Deployment Slot Removal Tool ===');
console.log('This script will remove the b7d3ekf5fkedcsg9 deployment slot from the Arzani web app.');
console.log('Resource ID: /subscriptions/bb2425dd-930e-49ca-9a94-189a195fb5f9/resourceGroups/my-marketplace/providers/Microsoft.Web/sites/arzani/slots/b7d3ekf5fkedcsg9');

// Ask for confirmation before proceeding
rl.question('\nAre you sure you want to remove this deployment slot? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    console.log('Proceeding with deployment slot removal...');
    
    // Login to Azure first
    console.log('\n1. Logging in to Azure...');
    exec('az login', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error logging in to Azure: ${error.message}`);
        process.exit(1);
      }
      
      console.log('Successfully logged in to Azure.');
      console.log('\n2. Removing deployment slot...');
      
      // Remove the deployment slot
      const deleteCommand = 'az webapp deployment slot delete --name Arzani --slot b7d3ekf5fkedcsg9 --resource-group my-marketplace';
      
      exec(deleteCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error removing deployment slot: ${error.message}`);
          
          if (stderr.includes('not found')) {
            console.log('\nThe deployment slot does not exist or has already been removed.');
          } else {
            console.error('Full error:', stderr);
          }
          
          process.exit(1);
        }
        
        console.log('\n✅ Deployment slot successfully removed!');
        console.log('\nYou can now deploy to the production slot without conflicts.');
        process.exit(0);
      });
    });
  } else {
    console.log('Operation cancelled.');
    process.exit(0);
  }
});
