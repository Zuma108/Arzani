/**
 * Unit tests for A2A Protocol Implementation
 */

const request = require('supertest');
const nock = require('nock');
const { v4: uuidv4 } = require('uuid');
const app = require('../server');
const agentRegistry = require('../a2a/agentRegistry');
const { TaskManager } = require('../a2a/taskManager');
const A2AClient = require('../a2a/client');

// Mock database
jest.mock('../db/models', () => {
  return {
    SessionState: {
      upsert: jest.fn().mockResolvedValue(true),
      findAll: jest.fn().mockResolvedValue([])
    }
  };
}, { virtual: true });

describe('A2A Protocol Implementation', () => {
  const taskManager = new TaskManager();
  
  beforeEach(() => {
    // Clear any mocked responses
    nock.cleanAll();
    
    // Reset task manager
    taskManager.tasks.clear();
  });
  
  describe('Agent Discovery', () => {
    test('should return agent card for valid agent type', async () => {
      const response = await request(app)
        .get('/api/a2a/broker/.well-known/agent.json')
        .expect(200);
      
      expect(response.body).toHaveProperty('name', 'Arzani Broker Agent');
      expect(response.body).toHaveProperty('endpoints.a2a');
      expect(response.body).toHaveProperty('capabilities');
      expect(response.body).toHaveProperty('skills');
    });
    
    test('should return 404 for invalid agent type', async () => {
      await request(app)
        .get('/api/a2a/unknown-agent/.well-known/agent.json')
        .expect(404);
    });
  });
  
  describe('Task Management', () => {
    test('should create and process a task', async () => {
      const taskId = uuidv4();
      const message = {
        role: 'user',
        parts: [{ text: 'What is the value of my restaurant?' }]
      };
      
      // Mock agent response
      jest.spyOn(agentRegistry, 'sendTaskToAgent').mockResolvedValueOnce({
        message: {
          role: 'agent',
          parts: [{ text: 'Based on comps, your restaurant is worth $500K-600K.' }]
        }
      });
      
      const response = await request(app)
        .post('/api/a2a/broker/tasks/send')
        .send({ task_id: taskId, message })
        .expect(200);
      
      expect(response.body).toHaveProperty('task_id', taskId);
      expect(response.body).toHaveProperty('state', 'completed');
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[1].role).toBe('agent');
    });
    
    test('should handle task errors gracefully', async () => {
      const taskId = uuidv4();
      const message = {
        role: 'user',
        parts: [{ text: 'What is the value of my restaurant?' }]
      };
      
      // Mock agent error
      jest.spyOn(agentRegistry, 'sendTaskToAgent').mockRejectedValueOnce(
        new Error('Agent processing failed')
      );
      
      const response = await request(app)
        .post('/api/a2a/broker/tasks/send')
        .send({ task_id: taskId, message })
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('task_id', taskId);
    });
    
    test('should get task status', async () => {
      // Create a task first
      const taskId = uuidv4();
      taskManager.createTask(taskId, 'broker');
      taskManager.updateTask(taskId, { state: 'working' });
      
      const response = await request(app)
        .get(`/api/a2a/broker/tasks/${taskId}/status`)
        .expect(200);
      
      expect(response.body).toHaveProperty('task_id', taskId);
      expect(response.body).toHaveProperty('state', 'working');
    });
    
    test('should cancel a task', async () => {
      // Create a task first
      const taskId = uuidv4();
      taskManager.createTask(taskId, 'broker');
      taskManager.updateTask(taskId, { state: 'working' });
      
      const response = await request(app)
        .post(`/api/a2a/broker/tasks/${taskId}/cancel`)
        .send({ reason: 'Test cancellation' })
        .expect(200);
      
      expect(response.body).toHaveProperty('task_id', taskId);
      expect(response.body).toHaveProperty('state', 'canceled');
      expect(response.body.metadata).toHaveProperty('cancellation_reason', 'Test cancellation');
    });
  });
});

describe('A2A Client', () => {
  beforeEach(() => {
    nock.cleanAll();
  });
  
  test('should fetch agent card', async () => {
    const agentUrl = 'https://api.arzani.co.uk/a2a/broker';
    
    nock('https://api.arzani.co.uk')
      .get('/a2a/broker/.well-known/agent.json')
      .reply(200, {
        name: 'Broker Agent',
        capabilities: { streaming: true }
      });
    
    const client = new A2AClient(agentUrl);
    const card = await client.getAgentCard();
    
    expect(card).toHaveProperty('name', 'Broker Agent');
    expect(card).toHaveProperty('capabilities');
  });
  
  test('should send a task', async () => {
    const agentUrl = 'https://api.arzani.co.uk/a2a/broker';
    const taskId = uuidv4();
    const message = 'What is the value of my business?';
    
    nock('https://api.arzani.co.uk')
      .post('/a2a/broker/tasks/send')
      .reply(200, {
        task_id: taskId,
        state: 'completed',
        message: { role: 'agent', parts: [{ text: 'Your business is worth...' }] }
      });
    
    const client = new A2AClient(agentUrl);
    const result = await client.sendTask(message, { taskId });
    
    expect(result).toHaveProperty('task_id', taskId);
    expect(result).toHaveProperty('state', 'completed');
    expect(result).toHaveProperty('message');
  });
});
