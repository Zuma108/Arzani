/**
 * Finance Agent Routes
 * 
 * Route handlers for the Finance Specialist Agent's A2A endpoints
 */

import { 
  validateTaskRequest,
  validateTaskResponse 
} from '../../libs/a2a/schema.js';
import { 
  createErrorResponse, 
  ERROR_CODES, 
  createTask,
  createTaskResponse
} from '../../libs/a2a/utils.js';
import { processFinanceTask } from './finance.js';

/**
 * Handle tasks/send requests for the Finance Agent
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export async function handleTaskSend(req, res) {
  const jsonRpcId = req.body?.id;
  
  if (!jsonRpcId) {
    return res.status(400).json(
      createErrorResponse('unknown-id', ERROR_CODES.INVALID_REQUEST, 'Missing JSON-RPC id')
    );
  }
  
  // Validate request against A2A schema
  if (!validateTaskRequest(req.body)) {
    const errors = validateTaskRequest.errors || [];
    return res.status(400).json(
      createErrorResponse(jsonRpcId, ERROR_CODES.VALIDATION_FAILED, 'Invalid A2A request format', errors)
    );
  }
  
  try {
    const { task: requestTask, message: requestMessage } = req.body.params;
    
    // Set task state to working and include agent ID
    const workingTask = {
      ...requestTask,
      state: 'working',
      agentId: 'finance-agent'  // Finance agent identifier
    };
    
    // Process the finance task based on the user's message
    const { task: responseTask, message: responseMessage } = await processFinanceTask(workingTask, requestMessage);
    
    // Create and return JSON-RPC response
    const response = createTaskResponse(jsonRpcId, responseTask, responseMessage);
    
    // Validate our response before sending (safeguard)
    if (!validateTaskResponse(response)) {
      const errors = validateTaskResponse.errors || [];
      console.error(`Invalid response format: ${JSON.stringify(errors)}`);
      return res.status(500).json(
        createErrorResponse(jsonRpcId, ERROR_CODES.INTERNAL_ERROR, 'Failed to generate valid response')
      );
    }
    
    res.status(200).json(response);
  } catch (err) {
    console.error(`Error processing finance task: ${err.message}`);
    console.error(err.stack);
    
    res.status(500).json(
      createErrorResponse(jsonRpcId, ERROR_CODES.INTERNAL_ERROR, `Error processing request: ${err.message}`)
    );
  }
}

/**
 * Register finance agent routes with Express app
 * 
 * @param {object} app - Express application
 */
export function registerFinanceRoutes(app) {
  // A2A protocol endpoint for tasks/send
  app.post('/a2a/tasks/send', handleTaskSend);
}

export default registerFinanceRoutes;