import { execSync } from 'child_process';
import fs from 'fs';

// Get audit report in JSON format
console.log('Checking for vulnerabilities...');
const auditReport = JSON.parse(
  execSync('npm audit --json').toString()
);

// Extract vulnerable dependencies with high/critical severity
const highSeverityVulns = Object.values(auditReport.vulnerabilities || {})
  .filter(vuln => ['high', 'critical'].includes(vuln.severity));

if (highSeverityVulns.length > 0) {
  console.log(`\n⚠️ Found ${highSeverityVulns.length} high/critical vulnerabilities:`);
  
  highSeverityVulns.forEach(vuln => {
    console.log(`\n${vuln.name}: ${vuln.severity} severity`);
    console.log(`Description: ${vuln.title}`);
    
    if (vuln.fixAvailable) {
      console.log(`Fix available by updating to: ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`);
    } else {
      console.log('No direct fix available - may require updating parent dependencies');
    }
  });

  console.log('\nConsider updating these packages manually in package.json');
} else {
  console.log('No high or critical vulnerabilities found!');
}
