/**
 * WebSocket Diagnostics Tool
 * Tests WebSocket connectivity and provides diagnostic information
 */

(function() {
  // Store diagnostic results
  const diagnostics = {
    socketioAvailable: typeof io === 'function',
    webSocketAvailable: typeof WebSocket === 'function',
    origin: window.location.origin,
    port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
    tests: []
  };
  
  // Test raw WebSocket connection
  function testRawWebSocket() {
    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/ws-test`;
        
        console.log('Testing raw WebSocket connection to:', wsUrl);
        const ws = new WebSocket(wsUrl);
        
        const timeoutId = setTimeout(() => {
          ws.close();
          resolve({
            type: 'raw-websocket',
            success: false,
            message: 'Connection timed out after 5 seconds'
          });
        }, 5000);
        
        ws.onopen = () => {
          clearTimeout(timeoutId);
          ws.close();
          resolve({
            type: 'raw-websocket',
            success: true,
            message: 'Successfully connected'
          });
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeoutId);
          resolve({
            type: 'raw-websocket',
            success: false,
            message: 'Connection error',
            error: error.message || 'Unknown error'
          });
        };
      } catch (error) {
        resolve({
          type: 'raw-websocket',
          success: false,
          message: 'Exception during connection attempt',
          error: error.message
        });
      }
    });
  }
  
  // Test Socket.IO connection
  function testSocketIO() {
    return new Promise((resolve) => {
      if (typeof io !== 'function') {
        resolve({
          type: 'socket.io',
          success: false,
          message: 'Socket.IO not available'
        });
        return;
      }
      
      try {
        console.log('Testing Socket.IO connection to:', window.location.origin);
        const socket = io(window.location.origin, {
          transports: ['polling'], // Start with just polling to isolate issues
          timeout: 5000,
          forceNew: true
        });
        
        const timeoutId = setTimeout(() => {
          socket.disconnect();
          resolve({
            type: 'socket.io-polling',
            success: false,
            message: 'Connection timed out after 5 seconds'
          });
        }, 5000);
        
        socket.on('connect', () => {
          clearTimeout(timeoutId);
          socket.disconnect();
          resolve({
            type: 'socket.io-polling',
            success: true,
            message: 'Successfully connected using polling'
          });
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeoutId);
          socket.disconnect();
          resolve({
            type: 'socket.io-polling',
            success: false,
            message: 'Connection error',
            error: error.message || 'Unknown error'
          });
        });
      } catch (error) {
        resolve({
          type: 'socket.io-polling',
          success: false,
          message: 'Exception during connection attempt',
          error: error.message
        });
      }
    });
  }
  
  // Test Socket.IO connection with WebSocket transport
  function testSocketIOWebSocket() {
    return new Promise((resolve) => {
      if (typeof io !== 'function') {
        resolve({
          type: 'socket.io-websocket',
          success: false,
          message: 'Socket.IO not available'
        });
        return;
      }
      
      try {
        console.log('Testing Socket.IO WebSocket connection to:', window.location.origin);
        console.log('Note: WebSocket transport is disabled on server - this test will fail by design');
        
        const socket = io(window.location.origin, {
          transports: ['websocket'], // Force WebSocket only
          timeout: 5000,
          forceNew: true
        });
        
        const timeoutId = setTimeout(() => {
          socket.disconnect();
          resolve({
            type: 'socket.io-websocket',
            success: false,
            message: 'Connection timed out after 5 seconds (expected - WebSockets disabled on server)'
          });
        }, 5000);
        
        socket.on('connect', () => {
          clearTimeout(timeoutId);
          socket.disconnect();
          resolve({
            type: 'socket.io-websocket',
            success: true,
            message: 'Unexpectedly connected using WebSocket (server should be using polling only)'
          });
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeoutId);
          socket.disconnect();
          resolve({
            type: 'socket.io-websocket',
            success: false,
            message: 'Connection error (expected - WebSockets disabled on server)',
            error: error.message || 'websocket transport unavailable'
          });
        });
      } catch (error) {
        resolve({
          type: 'socket.io-websocket',
          success: false,
          message: 'Exception during connection attempt (expected)',
          error: error.message
        });
      }
    });
  }
  
  // Run all tests
  async function runAllTests() {
    // Run tests sequentially to avoid interference
    const rawWebSocketResult = await testRawWebSocket();
    diagnostics.tests.push(rawWebSocketResult);
    
    const socketIOResult = await testSocketIO();
    diagnostics.tests.push(socketIOResult);
    
    if (socketIOResult.success) {
      const socketIOWebSocketResult = await testSocketIOWebSocket();
      diagnostics.tests.push(socketIOWebSocketResult);
    }
    
    // Log test results
    console.log('WebSocket Diagnostics Results:', diagnostics);
    
    // Display results on page if diagnostic element exists
    const resultsElement = document.getElementById('websocket-diagnostics-results');
    if (resultsElement) {
      resultsElement.innerHTML = `
        <h2>WebSocket Diagnostics</h2>
        <p><strong>Origin:</strong> ${diagnostics.origin}</p>
        <p><strong>Port:</strong> ${diagnostics.port}</p>
        <p><strong>Socket.IO available:</strong> ${diagnostics.socketioAvailable}</p>
        <p><strong>WebSocket available:</strong> ${diagnostics.webSocketAvailable}</p>
        <h3>Tests:</h3>
        <ul>
          ${diagnostics.tests.map(test => `
            <li>
              <strong>${test.type}:</strong> 
              <span style="color: ${test.success ? 'green' : 'red'}">
                ${test.success ? 'Success' : 'Failed'}
              </span>
              <p>${test.message}</p>
              ${test.error ? `<p class="error">Error: ${test.error}</p>` : ''}
            </li>
          `).join('')}
        </ul>
        <p><strong>Recommendation:</strong> ${getRecommendation()}</p>
      `;
    }
    
    return diagnostics;
  }
  
  // Generate a recommendation based on test results
  function getRecommendation() {
    const webSocketTest = diagnostics.tests.find(t => t.type === 'raw-websocket');
    const pollingTest = diagnostics.tests.find(t => t.type === 'socket.io-polling');
    const wsSocketIOTest = diagnostics.tests.find(t => t.type === 'socket.io-websocket');
    
    // Always recommend polling transport since we've configured the server that way
    if (pollingTest?.success) {
      return "Server is configured to use Socket.IO with polling transport only - WebSocket transport is intentionally disabled";
    } else if (!pollingTest?.success) {
      return "Server-side Socket.IO may not be properly configured. Check server logs.";
    } else {
      return "Unable to determine best configuration. Check browser console for details.";
    }
  }
  
  // Make diagnostics available globally
  window.WebSocketDiagnostics = {
    run: runAllTests,
    getResults: () => diagnostics
  };
  
  // Add a button for diagnostics
  const addDiagnosticsButton = () => {
    // Only add the button if we're on a page with chat functionality
    if (document.querySelector('.chat-container')) {
      const button = document.createElement('button');
      button.textContent = 'Test WebSocket';
      button.style.position = 'fixed';
      button.style.bottom = '10px';
      button.style.right = '10px';
      button.style.zIndex = '9999';
      button.style.padding = '8px 16px';
      button.style.backgroundColor = '#4682B4';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '4px';
      button.style.cursor = 'pointer';
      
      button.onclick = () => {
        // Create or get diagnostic results container
        let resultsElement = document.getElementById('websocket-diagnostics-results');
        if (!resultsElement) {
          resultsElement = document.createElement('div');
          resultsElement.id = 'websocket-diagnostics-results';
          resultsElement.style.position = 'fixed';
          resultsElement.style.top = '50%';
          resultsElement.style.left = '50%';
          resultsElement.style.transform = 'translate(-50%, -50%)';
          resultsElement.style.maxWidth = '80%';
          resultsElement.style.maxHeight = '80%';
          resultsElement.style.overflow = 'auto';
          resultsElement.style.backgroundColor = 'white';
          resultsElement.style.padding = '20px';
          resultsElement.style.border = '1px solid #ccc';
          resultsElement.style.borderRadius = '8px';
          resultsElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
          resultsElement.style.zIndex = '10000';
          
          // Add close button
          const closeButton = document.createElement('button');
          closeButton.textContent = 'Close';
          closeButton.style.marginTop = '20px';
          closeButton.style.padding = '8px 16px';
          closeButton.style.backgroundColor = '#e53e3e';
          closeButton.style.color = 'white';
          closeButton.style.border = 'none';
          closeButton.style.borderRadius = '4px';
          closeButton.style.cursor = 'pointer';
          closeButton.onclick = () => resultsElement.remove();
          
          resultsElement.appendChild(closeButton);
          document.body.appendChild(resultsElement);
        }
        
        resultsElement.innerHTML = '<p>Running diagnostics...</p>';
        runAllTests();
      };
      
      document.body.appendChild(button);
    }
  };
  
  // Run on page load
  if (document.readyState === 'complete') {
    addDiagnosticsButton();
  } else {
    window.addEventListener('load', addDiagnosticsButton);
  }
})();
