#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Agent configurations
const agents = [
  { name: 'Orchestrator', script: 'services/orchestrator/index.js', port: 5001, healthPath: '/health' },
  { name: 'Revenue', script: 'services/revenue/index.js', port: 5002, healthPath: '/health' },
  { name: 'Legal', script: 'services/legal/index.js', port: 5003, healthPath: '/health' },
  { name: 'Finance', script: 'services/finance/index.js', port: 5004, healthPath: '/health' }
];

const processes = [];

// Cleanup function
function cleanup() {
  console.log('\n🛑 Shutting down all processes...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });
  process.exit(0);
}

// Handle cleanup on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Function to check if agent is healthy
async function checkAgentHealth(port, healthPath) {
  try {
    const response = await axios.get(`http://localhost:${port}${healthPath}`, { timeout: 1000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Function to wait for agent to be ready
async function waitForAgent(agent, maxRetries = 30) {
  console.log(`⏳ Waiting for ${agent.name} agent to be ready...`);
  
  for (let i = 0; i < maxRetries; i++) {
    if (await checkAgentHealth(agent.port, agent.healthPath)) {
      console.log(`✅ ${agent.name} agent is ready on port ${agent.port}`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error(`❌ ${agent.name} agent failed to start within ${maxRetries} seconds`);
  return false;
}

// Start an agent
function startAgent(agent) {
  console.log(`🚀 Starting ${agent.name} agent...`);
  
  const proc = spawn('node', [agent.script], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  proc.on('error', (error) => {
    console.error(`❌ Failed to start ${agent.name} agent:`, error);
  });
  
  proc.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${agent.name} agent exited with code ${code}`);
      cleanup();
    }
  });
  
  processes.push(proc);
  return proc;
}

// Start main server
function startMainServer() {
  console.log('🚀 Starting main Arzani server...');
  
  const proc = spawn('node', ['server.js'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  proc.on('error', (error) => {
    console.error('❌ Failed to start main server:', error);
  });
  
  proc.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Main server exited with code ${code}`);
    }
    cleanup();
  });
  
  processes.push(proc);
  return proc;
}

// Main startup sequence
async function startAll() {
  console.log('🏁 Starting Arzani Marketplace with A2A agents...\n');
  
  // Start all agents
  for (const agent of agents) {
    startAgent(agent);
  }
  
  // Wait for all agents to be ready
  console.log('\n⏳ Waiting for all A2A agents to be ready...');
  const allReady = await Promise.all(
    agents.map(agent => waitForAgent(agent))
  );
  
  if (allReady.every(ready => ready)) {
    console.log('\n✅ All A2A agents are ready!');
    console.log('🚀 Starting main server...\n');
    startMainServer();
    
    console.log('\n🎉 Arzani Marketplace is now running with full A2A integration!');
    console.log('📱 Main application: http://localhost:5000');
    console.log('🤖 A2A Arzani-X interface: http://localhost:5000/arzani-x');
    console.log('\n🔧 A2A Agent Health Status:');
    for (const agent of agents) {
      console.log(`   • ${agent.name}: http://localhost:${agent.port}${agent.healthPath}`);
    }
    console.log('\n⚡ Press Ctrl+C to stop all services\n');
  } else {
    console.error('\n❌ Some A2A agents failed to start. Shutting down...');
    cleanup();
  }
}

// Start everything
startAll().catch(error => {
  console.error('❌ Failed to start services:', error);
  cleanup();
});
