# Arzani Marketplace - AI Coding Assistant Instructions

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

## Integration Points

- **Stripe**: Payment processing via `routes/stripe.js`
- **AWS S3**: File uploads via `utils/s3.js`
- **OpenAI**: AI features in various services
- **WebSocket**: Real-time chat via `socket/chatSocket.js`
- **External APIs**: Google OAuth, SendGrid email

When modifying this system, always consider the A2A protocol implications and maintain the A/B testing variant consistency between server and client.
