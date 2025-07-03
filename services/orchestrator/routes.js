/**
 * Orchestrator Agent Routes
 * 
 * A2A protocol endpoints for the Generalist Orchestrator Agent
 */

import { validateTaskRequest } from '../../libs/a2a/schema.js';
import { 
  createErrorResponse, 
  createTaskResponse,
  ERROR_CODES 
} from '../../libs/a2a/utils.js';
import { Orchestrator } from './orchestrator.js';

const orchestrator = new Orchestrator();

/**
 * Register orchestrator routes with an Express app
 * @param {object} app - Express application instance
 */
export function registerOrchestratorRoutes(app) {
  
  /**
   * Main A2A tasks/send endpoint
   * Handles incoming task requests and routes them to specialist agents
   */
  app.post('/a2a/tasks/send', async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate the request against A2A schema
      if (!validateTaskRequest(req.body)) {
        const errors = validateTaskRequest.errors || [];
        console.error('[Orchestrator] Invalid A2A request:', errors);
        return res.status(400).json(
          createErrorResponse(
            req.body?.id || 'validation-error',
            ERROR_CODES.VALIDATION_FAILED,
            'Invalid A2A request format',
            { validation_errors: errors }
          )
        );
      }
      
      const { task, message } = req.body.params;
      const requestId = req.body.id;
      
      console.log(`[Orchestrator] Received task ${task.id} from request ${requestId}`);
      
      // Process the task through the orchestrator
      const result = await orchestrator.routeTask(task, message);
      
      const processingTime = Date.now() - startTime;
      console.log(`[Orchestrator] Task ${task.id} completed in ${processingTime}ms`);
      
      // Return A2A compliant response
      res.status(200).json(createTaskResponse(requestId, result.task, result.message));
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[Orchestrator] Error processing request (${processingTime}ms):`, error);
      
      res.status(500).json(
        createErrorResponse(
          req.body?.id || 'internal-error',
          ERROR_CODES.INTERNAL_ERROR,
          'Internal processing error',
          { 
            error_message: error.message,
            processing_time_ms: processingTime 
          }
        )
      );
    }
  });

  /**
   * Health check endpoint for agent monitoring
   */
  app.get('/health', async (req, res) => {
    try {
      const agentHealth = await orchestrator.getAgentHealth();
      const healthyAgents = agentHealth.filter(agent => agent.status === 'healthy').length;
      const totalAgents = agentHealth.length;
      
      const overallStatus = healthyAgents === totalAgents ? 'healthy' : 
                           healthyAgents > 0 ? 'degraded' : 'unhealthy';
      
      res.status(200).json({
        status: overallStatus,
        service: 'orchestrator-agent',
        timestamp: new Date().toISOString(),
        agent_health: {
          healthy_count: healthyAgents,
          total_count: totalAgents,
          agents: agentHealth
        }
      });
    } catch (error) {
      console.error('[Orchestrator] Health check error:', error);
      res.status(500).json({
        status: 'error',
        service: 'orchestrator-agent',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  /**
   * Agent discovery endpoint - returns available specialist agents
   */
  app.get('/agents', async (req, res) => {
    try {
      const agentHealth = await orchestrator.getAgentHealth();
      
      const agents = Object.entries(orchestrator.agents).map(([key, agent]) => {
        const health = agentHealth.find(h => h.agent === key);
        return {
          id: key,
          name: agent.name,
          specialties: agent.specialties,
          url: agent.url,
          status: health?.status || 'unknown'
        };
      });
      
      res.status(200).json({
        agents,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Orchestrator] Agent discovery error:', error);
      res.status(500).json({
        error: 'Failed to discover agents',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * SSE endpoint for streaming task updates (optional)
   * TODO: Implement when SSE UI is stable
   */
  app.get('/a2a/tasks/sendSubscribe', (req, res) => {
    const { taskId } = req.query;
    
    if (!taskId) {
      return res.status(400).json(
        createErrorResponse('sse-error', ERROR_CODES.INVALID_PARAMS, 'Missing taskId parameter')
      );
    }
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      taskId,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    // TODO: Implement actual task streaming
    // For now, just close the connection after sending a placeholder
    setTimeout(() => {
      res.write(`data: ${JSON.stringify({
        type: 'placeholder',
        message: 'SSE streaming not fully implemented yet',
        taskId,
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    }, 1000);
  });

  /**
   * Metrics endpoint for monitoring orchestration performance
   */
  app.get('/metrics', (req, res) => {
    // TODO: Implement proper metrics collection
    res.status(200).json({
      service: 'orchestrator-agent',
      metrics: {
        uptime_seconds: process.uptime(),
        memory_usage: process.memoryUsage(),
        // TODO: Add task completion rates, average response times, etc.
        placeholder_note: 'Detailed metrics collection not implemented yet'
      },
      timestamp: new Date().toISOString()
    });
  });
}

export default registerOrchestratorRoutes;
