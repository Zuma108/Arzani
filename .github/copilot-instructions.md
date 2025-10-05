# Arzani Marketplace - AI Coding Assistant Instructions

## MCP (Model Context Protocol) Integration Guidelines

This project is enhanced with multiple MCP servers providing specialized capabilities. Use these guidelines to determine when to leverage each MCP:

### Available MCP Servers & Usage Guidelines

#### 1. **Brave Search MCP** (`@modelcontextprotocol/server-brave-search`)
**Capabilities:** Web search, news search, local business search
**When to Use:**
- User asks for current/recent information not in codebase
- Researching competitor analysis, market trends
- Finding documentation for external APIs/libraries
- Validating business requirements against industry standards
**When NOT to Use:**
- Information already available in project files
- Internal system debugging (use filesystem MCP instead)

#### 2. **Filesystem MCP** (`@modelcontextprotocol/server-filesystem`) 
**Capabilities:** Secure file operations, reading, writing, directory management
**When to Use:**
- Reading/analyzing project files for context
- Creating/modifying configuration files
- Exploring project structure and dependencies
- File operations that VS Code tools don't cover
**When NOT to Use:**
- Simple file edits (use built-in editor tools)
- Operations outside allowed directories

#### 3. **Sequential Thinking MCP** (`@modelcontextprotocol/server-sequential-thinking`)
**Capabilities:** Structured problem-solving, iterative reasoning, complex analysis
**When to Use:**
- Complex architectural decisions requiring step-by-step analysis
- Debugging multi-component issues (A2A, database, frontend)
- Planning major feature implementations
- Analyzing trade-offs in system design
**When NOT to Use:**
- Simple coding tasks or straightforward fixes
- Quick information lookups

#### 4. **Firecrawl MCP** (`firecrawl-mcp`)
**Capabilities:** Web scraping, crawling, content extraction, search
**When to Use:**
- Extracting data from competitor websites for marketplace analysis
- Scraping product catalogs or pricing information
- Gathering market research data
- Extracting structured data from business websites
**When NOT to Use:**
- Simple web searches (use Brave MCP)
- Scraping sites with strict anti-bot policies
- When data is available via APIs

#### 5. **Pinecone MCP** (`@pinecone-database/mcp`)
**Capabilities:** Vector database operations, semantic search, embeddings
**When to Use:**
- Implementing AI-powered product recommendations
- Building semantic search for marketplace listings
- Creating knowledge bases for A2A agents
- Similarity matching for business profiles
**When NOT to Use:**
- Simple text search (use PostgreSQL full-text search)
- Small datasets that don't require vector operations

#### 6. **Knowledge Graph Memory MCP** (`@modelcontextprotocol/server-memory`)
**Capabilities:** Persistent memory, entity relationships, conversational context
**When to Use:**
- Tracking complex business relationships in marketplace
- Maintaining context across A2A agent interactions
- Building user behavior profiles
- Creating persistent knowledge about market trends
**When NOT to Use:**
- Simple data storage (use PostgreSQL)
- Temporary session data

#### 7. **Perplexity Ask MCP** (`server-perplexity-ask`)
**Capabilities:** AI-powered research, real-time web search with reasoning
**When to Use:**
- Deep research requiring analysis and synthesis
- Understanding complex business/legal regulations
- Market analysis requiring multiple sources
- Technical research for architecture decisions
**When NOT to Use:**
- Simple factual queries (use Brave MCP)
- Information available in project documentation

#### 8. **Notion MCP** (`Notion`)
**Capabilities:** Workspace management, document creation, database operations
**When to Use:**
- Creating project documentation or specifications
- Managing feature backlogs or requirements
- Collaborative planning documents
- Creating user guides or API documentation
**When NOT to Use:**
- Code documentation (keep in repository)
- Temporary notes or quick references

### MCP Decision Framework

**For Research Tasks:**
1. Internal project info → Filesystem MCP
2. Current web info → Brave Search MCP  
3. Deep analysis → Perplexity Ask MCP
4. Data extraction → Firecrawl MCP

**For Development Tasks:**
1. Complex planning → Sequential Thinking MCP
2. File operations → Filesystem MCP
3. AI features → Pinecone MCP + Knowledge Graph Memory MCP
4. Documentation → Notion MCP

**For Marketplace-Specific Tasks:**
- Business intelligence → Perplexity + Firecrawl MCPs
- Product recommendations → Pinecone MCP
- User relationship tracking → Knowledge Graph Memory MCP
- Competitive analysis → Brave Search + Firecrawl MCPs

## Architecture Overview

This is a **multi-agent business marketplace** built with Node.js/Express, featuring an **Agent-to-Agent (A2A) protocol** for AI service communication. The system implements **A/B testing**, **real-time chat**, and **AI-powered business analytics**.

### Core Components

- **Main Server** (`server.js`) - Monolithic Express app with 4500+ lines handling all HTTP routes
- **A2A Agent System** (`services/`) - Microservices for legal, finance, orchestrator, and revenue analysis
- **A/B Testing** (`routes/analytics.js`) - File-based analytics system comparing buyer vs seller-focused landing pages
- **Database** - PostgreSQL with connection pooling (`db.js`)
- **Frontend** - EJS templates with TailwindCSS and vanilla JavaScript

## A2A Protocol Architecture

The Agent-to-Agent system is the core innovation. Agents communicate via JSON-RPC:

```javascript
// Making A2A requests
import { A2AClient } from './libs/a2a/client.js';
const client = new A2AClient({ agentId: 'orchestrator', authToken: token });
const response = await client.sendTask(url, task, message);
```

**Key A2A Files:**
- `libs/a2a/` - Protocol implementation (client, utils, schema)
- `services/orchestrator/` - Main routing agent
- `services/finance/`, `services/legal/` - Specialist agents

## Development Workflows

### Starting the System
```bash
npm start                 # Full system with agents
npm run start:basic      # Main server only
npm run start:agents-only # A2A agents only
npm run dev              # Development with nodemon
```

### A/B Testing Analysis
- Visit `/ab-dashboard` for real-time analytics
- Test variants: `/buyer-landing` vs `/marketplace-landing`
- Analytics stored in `data/analytics/ab-test-data.jsonl`

### Database Operations
```bash
npm run migrate          # Run pending migrations
npm run setup:a2a       # Initialize A2A tables
```

## Code Patterns & Conventions

### Module System
**IMPORTANT:** This project uses **ES Modules exclusively** - NOT CommonJS. Always use:
- `import` statements instead of `require()`
- `export` statements instead of `module.exports`
- File extensions in import paths (`.js`)
- Proper package.json configuration with `"type": "module"`

```javascript
// ✅ Correct - ES Modules
import { requireAuth, authenticateToken } from './middleware/auth.js';
import pool from './db.js';

// ❌ Wrong - CommonJS (don't use)
const { requireAuth } = require('./middleware/auth.js');
const pool = require('./db.js');
```

### Authentication Middleware
Always use the unified auth system from `middleware/auth.js`:
```javascript
import { requireAuth, authenticateToken } from './middleware/auth.js';
app.get('/protected', requireAuth, handler);
```

### Route Organization
- API routes: `routes/api/` - RESTful endpoints
- Web routes: `routes/` - Page rendering
- Admin routes: `routes/admin/` - Management interfaces

### Database Queries
Use the centralized pool from `db.js`:
```javascript
import pool from './db.js';
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Error Handling Pattern
```javascript
try {
  // operation
  res.json({ success: true, data });
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ error: 'Operation failed', details: error.message });
}
```

## A/B Testing Implementation

The system implements server-side A/B testing with session persistence:

1. `assignABTestVariant` middleware in `server.js` assigns variants
2. Frontend tracks events via `public/js/ab-testing-analytics.js`
3. Analytics API at `/api/analytics/ab-test` collects data
4. Dashboard at `/ab-dashboard` visualizes results

**Variant Assignment:**
```javascript
function assignABTestVariant(req, res, next) {
  const variant = req.session.abTestVariant || (Math.random() < 0.5 ? 'seller_first' : 'buyer_first');
  req.abTestVariant = variant;
  req.session.abTestVariant = variant;
  next();
}
```

## Environment Configuration

Critical environment variables in `.env`:
```bash
DATABASE_URL=           # PostgreSQL connection
JWT_SECRET=            # Auth token signing
STRIPE_SECRET_KEY=     # Payment processing
OPENAI_API_KEY=        # AI features
A2A_AUTH_ENABLED=      # A2A protocol auth
```

## File Structure Highlights

- `views/` - EJS templates (buyer-landing.ejs, marketplace-landing.ejs for A/B testing)
- `public/js/` - Frontend JavaScript (ab-testing-analytics.js for tracking)
- `migrations/` - Database schema changes
- `scripts/` - Utility scripts for setup and maintenance
- `services/` - A2A agent microservices
- `data/analytics/` - File-based analytics storage

## Testing & Debugging

- A2A agent communication: Check `services/orchestrator/index.js` logs
- A/B test data: Monitor `/ab-dashboard` or `data/analytics/ab-test-data.jsonl`
- Database issues: Use `npm run migrate` and check `db.js` connection logs
- Authentication: Debug with `middleware/auth.js` sanitizeRedirectUrl function

## Platform-Specific Commands

### Windows PowerShell Environment
When working in Windows environments, use PowerShell syntax instead of curl commands:

```powershell
# ✅ Correct - PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/endpoint" -Method POST -Body (@{key="value"} | ConvertTo-Json) -ContentType "application/json"

# ❌ Wrong - curl (Unix-style)
curl -X POST -H "Content-Type: application/json" -d '{"key":"value"}' http://localhost:3000/api/endpoint
```

**PowerShell HTTP Request Patterns:**
- GET: `Invoke-RestMethod -Uri "url"`
- POST: `Invoke-RestMethod -Uri "url" -Method POST -Body $jsonBody -ContentType "application/json"`
- Headers: `Invoke-RestMethod -Uri "url" -Headers @{"Authorization"="Bearer token"}`
- File operations: Use `Get-Content`, `Set-Content`, `Test-Path` instead of `cat`, `echo`, `ls`

## Integration Points

- **Stripe**: Payment processing via `routes/stripe.js`
- **AWS S3**: File uploads via `utils/s3.js`
- **OpenAI**: AI features in various services
- **WebSocket**: Real-time chat via `socket/chatSocket.js`
- **External APIs**: Google OAuth, SendGrid email

When modifying this system, always consider the A2A protocol implications and maintain the A/B testing variant consistency between server and client.
