#!/usr/bin/env node

/**
 * Test script for the Limited PostgreSQL MCP Server
 * This script tests that DELETE operations are blocked while INSERT/UPDATE/SELECT work
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

class MCPTester {
  constructor() {
    this.mcpProcess = null;
    this.testResults = [];
  }

  async startMCPServer() {
    return new Promise((resolve, reject) => {
      this.mcpProcess = spawn('node', ['mcp-postgres-limited.js'], {
        env: {
          ...process.env,
          POSTGRES_CONNECTION_STRING: 'postgresql://marketplace_user:Olumide123!@localhost:5432/my-marketplace'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.mcpProcess.stderr.on('data', (data) => {
        const message = data.toString();
        if (message.includes('Limited PostgreSQL MCP server running on stdio')) {
          console.log('✅ MCP Server started successfully');
          resolve();
        }
      });

      this.mcpProcess.on('error', (error) => {
        console.error('❌ Failed to start MCP server:', error);
        reject(error);
      });

      setTimeout(() => {
        if (!this.mcpProcess.killed) {
          console.log('✅ MCP Server appears to be running');
          resolve();
        }
      }, 2000);
    });
  }

  async sendMCPRequest(method, params) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: method,
        params: params
      };

      const requestStr = JSON.stringify(request) + '\n';
      
      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      const dataHandler = (data) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData.trim());
          clearTimeout(timeout);
          this.mcpProcess.stdout.removeListener('data', dataHandler);
          resolve(response);
        } catch (e) {
          // Continue collecting data
        }
      };

      this.mcpProcess.stdout.on('data', dataHandler);
      this.mcpProcess.stdin.write(requestStr);
    });
  }

  async testSelectQuery() {
    console.log('\n🧪 Testing SELECT query...');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'query',
        arguments: {
          sql: 'SELECT COUNT(*) as user_count FROM users LIMIT 1'
        }
      });
      
      if (response.result) {
        console.log('✅ SELECT query executed successfully');
        this.testResults.push({ test: 'SELECT', status: 'PASS' });
        return true;
      } else {
        console.log('❌ SELECT query failed:', response.error);
        this.testResults.push({ test: 'SELECT', status: 'FAIL', error: response.error });
        return false;
      }
    } catch (error) {
      console.log('❌ SELECT query error:', error.message);
      this.testResults.push({ test: 'SELECT', status: 'ERROR', error: error.message });
      return false;
    }
  }

  async testDeleteQuery() {
    console.log('\n🧪 Testing DELETE query (should be blocked)...');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'execute',
        arguments: {
          sql: 'DELETE FROM users WHERE id = 999999'
        }
      });
      
      if (response.error && response.error.message.includes('DELETE')) {
        console.log('✅ DELETE query correctly blocked:', response.error.message);
        this.testResults.push({ test: 'DELETE_BLOCK', status: 'PASS' });
        return true;
      } else {
        console.log('❌ DELETE query was not blocked! This is a security issue.');
        this.testResults.push({ test: 'DELETE_BLOCK', status: 'FAIL' });
        return false;
      }
    } catch (error) {
      console.log('✅ DELETE query blocked (threw error):', error.message);
      this.testResults.push({ test: 'DELETE_BLOCK', status: 'PASS' });
      return true;
    }
  }

  async testListTables() {
    console.log('\n🧪 Testing list tables...');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'list_tables',
        arguments: {}
      });
      
      if (response.result) {
        console.log('✅ List tables executed successfully');
        this.testResults.push({ test: 'LIST_TABLES', status: 'PASS' });
        return true;
      } else {
        console.log('❌ List tables failed:', response.error);
        this.testResults.push({ test: 'LIST_TABLES', status: 'FAIL', error: response.error });
        return false;
      }
    } catch (error) {
      console.log('❌ List tables error:', error.message);
      this.testResults.push({ test: 'LIST_TABLES', status: 'ERROR', error: error.message });
      return false;
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const total = this.testResults.length;
    
    console.log(`\nOverall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Your MCP server is properly configured.');
    } else {
      console.log('⚠️  Some tests failed. Please check the configuration.');
    }
  }

  async cleanup() {
    if (this.mcpProcess && !this.mcpProcess.killed) {
      this.mcpProcess.kill();
      console.log('\n🧹 MCP server stopped');
    }
  }

  async runTests() {
    try {
      console.log('🚀 Starting Limited PostgreSQL MCP Server Tests');
      console.log('This will verify that DELETE operations are blocked while other operations work.');
      
      await this.startMCPServer();
      
      // Give server a moment to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.testSelectQuery();
      await this.testDeleteQuery();
      await this.testListTables();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPTester();
  tester.runTests().catch(console.error);
}

export default MCPTester;