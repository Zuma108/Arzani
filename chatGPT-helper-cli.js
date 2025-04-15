#!/usr/bin/env node
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import chatGPTHelper from './chatGPT-helper.js';
import pool from './db.js';

/**
 * CLI tool for testing the business verification functionality
 */
async function main() {
  console.log(chalk.blue.bold('\n🔍 Business Verification CLI Tool'));
  console.log(chalk.gray('=================================\n'));
  
  try {
    const mainChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Verify a business', value: 'verify' },
          { name: 'View verification history', value: 'history' },
          { name: 'Generate verification report', value: 'report' },
          { name: 'View verification statistics', value: 'stats' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);
    
    switch (mainChoice.action) {
      case 'verify':
        await verifyBusiness();
        break;
      case 'history':
        await viewVerificationHistory();
        break;
      case 'report':
        await generateVerificationReport();
        break;
      case 'stats':
        await viewVerificationStats();
        break;
      case 'exit':
        console.log(chalk.gray('\nExiting the verification tool. Goodbye!'));
        process.exit(0);
    }
  } catch (error) {
    console.error(chalk.red('\nError:'), error.message);
  } finally {
    // Always prompt to continue
    const { continue: shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Would you like to perform another action?',
        default: true
      }
    ]);
    
    if (shouldContinue) {
      await main();
    } else {
      console.log(chalk.gray('\nExiting the verification tool. Goodbye!'));
      process.exit(0);
    }
  }
}

/**
 * Verify a business using the AI
 */
async function verifyBusiness() {
  try {
    // Get list of businesses
    const businesses = await getBusinessList();
    
    if (businesses.length === 0) {
      console.log(chalk.yellow('\nNo businesses found in the database.'));
      return;
    }
    
    // Format choices for selection
    const businessChoices = businesses.map(b => ({
      name: `${b.id}: ${b.business_name} (${b.industry})`,
      value: b.id
    }));
    
    // Prompt user to select a business
    const { businessId, userId, verificationTypes } = await inquirer.prompt([
      {
        type: 'list',
        name: 'businessId',
        message: 'Select a business to verify:',
        choices: businessChoices
      },
      {
        type: 'input',
        name: 'userId',
        message: 'Enter your user ID:',
        default: '1',
        validate: input => !isNaN(parseInt(input)) ? true : 'Please enter a valid user ID'
      },
      {
        type: 'checkbox',
        name: 'verificationTypes',
        message: 'Select verification types to perform:',
        choices: [
          { name: 'All verifications', value: 'all', checked: true },
          { name: 'Financial consistency', value: 'financialConsistency' },
          { name: 'Industry standards', value: 'industryStandards' },
          { name: 'Market realism', value: 'marketRealism' },
          { name: 'Descriptive accuracy', value: 'descriptiveAccuracy' }
        ]
      }
    ]);
    
    // Default to 'all' if nothing selected
    const typesToUse = verificationTypes.length === 0 ? ['all'] : verificationTypes;
    
    // Show loading spinner
    const spinner = ora('Analyzing business data with AI...').start();
    
    // Call verification
    const result = await chatGPTHelper.verifyBusinessListing(
      businessId,
      parseInt(userId),
      typesToUse
    );
    
    spinner.succeed('Verification complete!');
    
    // Display results
    console.log(chalk.green.bold('\n📊 Verification Results:'));
    console.log(chalk.gray('=====================\n'));
    
    if (result.error) {
      console.log(chalk.red(`Error: ${result.message}`));
      console.log(chalk.red(`Details: ${result.details}`));
      return;
    }
    
    // Show overall score and confidence
    console.log(chalk.bold(`Verification ID: ${result.verificationId}`));
    console.log(chalk.bold(`Business ID: ${result.businessId}`));
    console.log(chalk.bold(`Overall Score: ${formatScore(result.results.weightedScore)}`));
    console.log(chalk.bold(`Confidence Level: ${formatConfidenceLevel(result.results.confidenceLevel)}`));
    console.log(chalk.bold(`Timestamp: ${result.timestamp}`));
    
    // Show category scores in a table
    const categoryTable = new Table({
      head: [chalk.cyan('Category'), chalk.cyan('Score'), chalk.cyan('Issues')],
      colWidths: [25, 15, 50]
    });
    
    for (const category of ['financialConsistency', 'industryStandards', 'marketRealism', 'descriptiveAccuracy']) {
      if (result.results[category]) {
        categoryTable.push([
          category,
          formatScore(result.results[category].score),
          (result.results[category].issues || []).join('\n')
        ]);
      }
    }
    
    console.log(categoryTable.toString());
    
    // Show recommendations
    if (result.results.recommendations && result.results.recommendations.length > 0) {
      console.log(chalk.bold('\n🧠 Recommendations:'));
      result.results.recommendations.forEach((rec, i) => {
        console.log(chalk.yellow(`${i + 1}. ${rec}`));
      });
    }
    
    // Show overall assessment
    if (result.results.overallAssessment) {
      console.log(chalk.bold('\n📝 Overall Assessment:'));
      console.log(chalk.gray(result.results.overallAssessment));
    }
    
  } catch (error) {
    console.error(chalk.red('\nError verifying business:'), error.message);
  }
}

/**
 * View verification history for a business
 */
async function viewVerificationHistory() {
  try {
    // Get list of businesses
    const businesses = await getBusinessList();
    
    if (businesses.length === 0) {
      console.log(chalk.yellow('\nNo businesses found in the database.'));
      return;
    }
    
    // Format choices for selection
    const businessChoices = businesses.map(b => ({
      name: `${b.id}: ${b.business_name} (${b.industry})`,
      value: b.id
    }));
    
    // Prompt user to select a business
    const { businessId, limit } = await inquirer.prompt([
      {
        type: 'list',
        name: 'businessId',
        message: 'Select a business to view verification history:',
        choices: businessChoices
      },
      {
        type: 'input',
        name: 'limit',
        message: 'Number of records to retrieve:',
        default: '5',
        validate: input => !isNaN(parseInt(input)) ? true : 'Please enter a valid number'
      }
    ]);
    
    // Show loading spinner
    const spinner = ora('Retrieving verification history...').start();
    
    // Get verification history
    const history = await chatGPTHelper.getBusinessVerificationHistory(
      businessId,
      parseInt(limit)
    );
    
    spinner.succeed('Retrieved verification history!');
    
    // Display results
    console.log(chalk.green.bold('\n📜 Verification History:'));
    console.log(chalk.gray('=====================\n'));
    
    if (history.length === 0) {
      console.log(chalk.yellow('No verification history found for this business.'));
      return;
    }
    
    // Show history in a table
    const historyTable = new Table({
      head: [
        chalk.cyan('ID'), 
        chalk.cyan('Score'), 
        chalk.cyan('Confidence'), 
        chalk.cyan('Verified By'),
        chalk.cyan('Date')
      ],
      colWidths: [8, 12, 15, 20, 30]
    });
    
    history.forEach(record => {
      historyTable.push([
        record.id,
        formatScore(record.weighted_score),
        formatConfidenceLevel(record.confidence_level),
        record.verified_by || 'System',
        new Date(record.created_at).toLocaleString()
      ]);
    });
    
    console.log(historyTable.toString());
    
    // Prompt to view details of a specific verification
    const { viewDetails, verificationId } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'viewDetails',
        message: 'Would you like to view detailed results for a verification?',
        default: false
      },
      {
        type: 'list',
        name: 'verificationId',
        message: 'Select a verification to view:',
        choices: history.map(h => ({
          name: `ID: ${h.id}, Score: ${formatScore(h.weighted_score)}, Date: ${new Date(h.created_at).toLocaleString()}`,
          value: h.id
        })),
        when: answers => answers.viewDetails
      }
    ]);
    
    if (viewDetails) {
      await viewVerificationDetails(verificationId);
    }
    
  } catch (error) {
    console.error(chalk.red('\nError viewing verification history:'), error.message);
  }
}

/**
 * View detailed verification results
 */
async function viewVerificationDetails(verificationId) {
  try {
    // Show loading spinner
    const spinner = ora('Retrieving verification details...').start();
    
    // Get verification details
    const details = await chatGPTHelper.getVerificationDetails(verificationId);
    
    spinner.succeed('Retrieved verification details!');
    
    if (!details) {
      console.log(chalk.yellow('\nNo verification details found.'));
      return;
    }
    
    // Display detailed results
    console.log(chalk.green.bold('\n🔍 Verification Details:'));
    console.log(chalk.gray('=====================\n'));
    
    console.log(chalk.bold(`Verification ID: ${details.id}`));
    console.log(chalk.bold(`Business: ${details.business_name} (ID: ${details.business_id})`));
    console.log(chalk.bold(`Verified By: ${details.verified_by || 'System'} (ID: ${details.user_id})`));
    console.log(chalk.bold(`Date: ${new Date(details.created_at).toLocaleString()}`));
    console.log(chalk.bold(`Score: ${formatScore(details.weighted_score)}`));
    console.log(chalk.bold(`Confidence Level: ${formatConfidenceLevel(details.confidence_level)}`));
    
    // Show category scores and analysis
    if (details.verification_data && !details.verification_data.error) {
      for (const category of ['financialConsistency', 'industryStandards', 'marketRealism', 'descriptiveAccuracy']) {
        if (details.verification_data[category]) {
          console.log(chalk.yellow.bold(`\n${category}:`));
          console.log(chalk.bold(`Score: ${formatScore(details.verification_data[category].score)}`));
          
          if (details.verification_data[category].issues && details.verification_data[category].issues.length > 0) {
            console.log(chalk.bold('Issues:'));
            details.verification_data[category].issues.forEach((issue, i) => {
              console.log(chalk.gray(`  ${i + 1}. ${issue}`));
            });
          }
          
          if (details.verification_data[category].analysis) {
            console.log(chalk.bold('Analysis:'));
            console.log(chalk.gray(`  ${details.verification_data[category].analysis}`));
          }
        }
      }
      
      // Show overall assessment
      if (details.verification_data.overallAssessment) {
        console.log(chalk.yellow.bold('\nOverall Assessment:'));
        console.log(chalk.gray(details.verification_data.overallAssessment));
      }
      
      // Show recommendations
      if (details.verification_data.recommendations && details.verification_data.recommendations.length > 0) {
        console.log(chalk.yellow.bold('\nRecommendations:'));
        details.verification_data.recommendations.forEach((rec, i) => {
          console.log(chalk.gray(`  ${i + 1}. ${rec}`));
        });
      }
    } else if (details.verification_data && details.verification_data.error) {
      console.log(chalk.red('\nError in verification data:'));
      console.log(chalk.red(details.verification_data.message));
      if (details.verification_data.details) {
        console.log(chalk.red(`Details: ${details.verification_data.details}`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('\nError viewing verification details:'), error.message);
  }
}

/**
 * Generate a verification report for a business
 */
async function generateVerificationReport() {
  try {
    // Get list of businesses
    const businesses = await getBusinessList();
    
    if (businesses.length === 0) {
      console.log(chalk.yellow('\nNo businesses found in the database.'));
      return;
    }
    
    // Format choices for selection
    const businessChoices = businesses.map(b => ({
      name: `${b.id}: ${b.business_name} (${b.industry})`,
      value: b.id
    }));
    
    // Prompt user to select a business
    const { businessId, userId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'businessId',
        message: 'Select a business to generate a verification report:',
        choices: businessChoices
      },
      {
        type: 'input',
        name: 'userId',
        message: 'Enter your user ID:',
        default: '1',
        validate: input => !isNaN(parseInt(input)) ? true : 'Please enter a valid user ID'
      }
    ]);
    
    // Show loading spinner
    const spinner = ora('Generating verification report...').start();
    
    // Generate verification report
    const report = await chatGPTHelper.generateVerificationReport(
      businessId,
      parseInt(userId)
    );
    
    spinner.succeed('Report generated!');
    
    // Display results
    console.log(chalk.green.bold('\n📑 Verification Report:'));
    console.log(chalk.gray('=====================\n'));
    
    if (report.error) {
      console.log(chalk.red(`Error: ${report.message}`));
      console.log(chalk.red(`Details: ${report.details}`));
      return;
    }
    
    if (report.status === 'not_verified') {
      console.log(chalk.yellow(report.message));
      return;
    }
    
    console.log(chalk.bold(`Business: ${report.businessName} (ID: ${report.businessId})`));
    console.log(chalk.bold(`Verification ID: ${report.verificationId}`));
    console.log(chalk.bold(`Confidence Level: ${formatConfidenceLevel(report.confidenceLevel)}`));
    console.log(chalk.bold(`Score: ${formatScore(report.score)}`));
    console.log(chalk.bold(`Verification Date: ${new Date(report.verificationDate).toLocaleString()}`));
    
    console.log(chalk.green.bold('\nReport:'));
    console.log(chalk.gray(report.report));
    
  } catch (error) {
    console.error(chalk.red('\nError generating verification report:'), error.message);
  }
}

/**
 * View verification statistics
 */
async function viewVerificationStats() {
  try {
    // Show loading spinner
    const spinner = ora('Retrieving verification statistics...').start();
    
    // Get verification statistics
    const stats = await chatGPTHelper.getVerificationStats();
    
    spinner.succeed('Retrieved verification statistics!');
    
    // Display results
    console.log(chalk.green.bold('\n📊 Verification Statistics:'));
    console.log(chalk.gray('=====================\n'));
    
    const statsTable = new Table();
    
    statsTable.push(
      { 'Total Verifications': stats.total_verifications },
      { 'Average Score': formatScore(stats.avg_score) },
      { 'High Confidence': stats.high_confidence },
      { 'Medium Confidence': stats.medium_confidence },
      { 'Low Confidence': stats.low_confidence },
      { 'Very Low Confidence': stats.very_low_confidence }
    );
    
    console.log(statsTable.toString());
    
  } catch (error) {
    console.error(chalk.red('\nError viewing verification statistics:'), error.message);
  }
}

/**
 * Get list of businesses from the database
 */
async function getBusinessList() {
  try {
    const result = await pool.query(
      `SELECT id, business_name, industry, price, ai_verified
       FROM businesses
       ORDER BY business_name ASC`
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error retrieving business list:', error);
    return [];
  }
}

/**
 * Format a score for display
 */
function formatScore(score) {
  if (score === null || score === undefined) {
    return 'N/A';
  }
  
  const numScore = parseFloat(score);
  if (isNaN(numScore)) {
    return 'N/A';
  }
  
  return (numScore * 100).toFixed(1) + '%';
}

/**
 * Format confidence level for display with colors
 */
function formatConfidenceLevel(level) {
  if (!level) {
    return chalk.gray('Unknown');
  }
  
  switch (level.toLowerCase()) {
    case 'high':
      return chalk.green('High');
    case 'medium':
      return chalk.yellow('Medium');
    case 'low':
      return chalk.red('Low');
    case 'very low':
      return chalk.red.bold('Very Low');
    default:
      return chalk.gray(level);
  }
}

// Run the CLI
main().catch(error => {
  console.error(chalk.red('\nFatal error:'), error);
  process.exit(1);
});