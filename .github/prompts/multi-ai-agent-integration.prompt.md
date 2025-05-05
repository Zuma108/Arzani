# Product Requirements Document (PRD)

**Project:** Arzani Multi‑Agent AI Integration (A2A)
**Version:** 1.0‑draft (04 May 2025)
**Owner:** \<Your Name / AI Platform Lead>

**Goal**
Enable fast, transparent buying/selling of brick‑and‑mortar businesses on **Arzani.co.uk** by orchestrating a network of AI agents (Generalist + Broker, Legal, Finance) that communicate through Google’s **Agent‑to‑Agent (A2A) protocol**. Agents will share a common JSON‑RPC over HTTP layer, access the PostgreSQL knowledge base, present answers via chat/voice in the EJS frontend, and fall back to humans when confidence is low.

---

## 1 Scope & Objectives

|  #  |  Objective                      |  KPI / Success Metric                                 |
| --- | ------------------------------- | ----------------------------------------------------- |
| 1   | Cut buyer‑seller matching time  | ≥ 30 % reduction vs 2024 baseline (avg time‑to‑offer) |
| 2   | Increase valuation transparency | ≥ 90 % of valuations cite comps & formulas            |
| 3   | Seamless workflow resume        | 0 data‑loss incidents; restart resumes < 5 s          |
| 4   | Protocol interoperability       | 100 % inter‑agent traffic uses A2A (v0.3 spec)        |

---

## 2 High‑Level Architecture (A2A‑Centric)

```
+───────────+             JSON‑RPC (A2A)            +───────────+
|  Frontend |  ───────────────────────────────────▶ | Generalist|
| (EJS UI)  | ◀───────────────────────────────────  |Orchestrator|
+───────────+                                       +──────┬────+
                                                       │ A2A Client
                                                       │
                                     ┌─────────────────┴─────────────────┐
                                     │                │                 │
                               +─────▼────+     +────▼────+       +─────▼────+
                               | Broker   |     |  Legal  |       |  Finance |
                               |  Agent   |     |  Agent  |       |  Agent   |
                               +──────────+     +─────────+       +──────────+
```

*All arrows = A2A JSON‑RPC `tasks/send` calls; dashed = optional SSE streaming.*

Key components:

1. **Generalist Orchestrator** – A2A Server & Client; routes tasks, merges results.
2. **Specialist Agents** – Each exposes its own `/a2a` endpoint & `/.well‑known/agent.json`.
3. **A2A Utils** – Shared Node module for JSON‑RPC structs, ID gen, validation.
4. **PostgreSQL + pgvector** – listings, user data, task & message logs.
5. **Frontend** – Express + EJS; chat/voice widget speaks A2A to Generalist.
6. **Human‑in‑Loop** – Broker/Lawyer escalation via LiveChat micro‑service.

---

## 3 Deliverable File/Folder Outline

c:\Users\Micha\OneDrive\Documents\my-marketplace-project\
│
├── .env                         # Main environment variables
├── .env.production              # Production environment variables
├── .env.example                 # Example environment file
│
├── server.js                    # Main server entry point
├── app.js                       # Application setup
├── ecosystem.config.js          # PM2 process manager config
│
├── public/                      # Static assets
│   ├── css/                     # Stylesheet files
│   ├── js/                      # Client-side JavaScript
│   │   ├── questionnaire-navigation.js
│   │   ├── ai-marketplace-integration.js
│   │   ├── conversationManager.js
│   │   └── a2a-chat.js         # Sends A2A payloads via fetch
│   └── uploads/                 # User uploads directory
│
├── services/                    # Service modules
│   ├── orchestrator/            # Generalist agent service
│   │   ├── agent.json          # Agent Card (A2A)
│   │   ├── orchestrator.js     # Routing & aggregation logic
│   │   └── routes.js           # /a2a/tasks/* endpoints
│   ├── broker/                  # Broker agent service
│   │   ├── agent.json          # Agent Card (A2A)
│   │   ├── broker.js           # Domain logic
│   │   └── routes.js           # A2A endpoints for broker
│   ├── legal/                   # Legal agent service
│   │   ├── agent.json          # Agent Card (A2A)
│   │   ├── legal.js            # Legal domain logic
│   │   └── routes.js           # A2A endpoints for legal
│   └── finance/                 # Finance agent service
│       ├── agent.json          # Agent Card (A2A)
│       ├── finance.js          # Finance domain logic
│       └── routes.js           # A2A endpoints for finance
│
├── libs/                        # Shared libraries
│   └── a2a/                     # A2A shared helpers
│       ├── client.js           # HTTP & SSE helpers
│       ├── schema.js           # JSON schema validation
│       └── utils.js            # ID gen, error helpers
│
├── routes/                      # Route definitions
├── middleware/                  # Middleware functions
├── controllers/                 # Controller functions
├── utils/                       # Utility functions
│
├── views/                       # Templates and views
│   └── partials/                # View partials
│       └── public/              # Public partials
│
├── database/                    # Database structure and config
│   ├── db.js                    # Database connection
│   ├── database.js              # Database operations
│   ├── db-setup.js              # Database setup script
│   ├── db-init.js               # Database initialization
│   ├── migrations/              # Database migrations
│   │   └── a2a-tasks/          # A2A tasks & messages tables
│   └── seeds/                   # Seed data
│
├── tests/                       # Test files
│   ├── unit/                    # Unit tests (including A2A)
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
│
├── scripts/                     # Utility scripts
│   ├── azure-debug.js
│   ├── azure-troubleshoot.js
│   ├── clean-for-deploy.js
│   ├── install-blog-deps.js
│   ├── update-plans-schema.js
│   └── a2a-setup.js            # A2A setup script
│
├── config/                      # Configuration files
├── api/                         # API endpoints
├── socket/                      # WebSocket functionality
│   ├── chatSocket.js
│   └── a2aSocket.js            # SSE for A2A streaming
│
├── .github/                     # GitHub configuration
│   └── prompts/                 # Project prompts
│       └── multi-ai-agent-integration.prompt.md
│
├── prd-documents/              # Product requirement documents
├── logs/                       # Log files
├── tmp/                        # Temporary files
├── coverage/                   # Test coverage reports
├── dist/                       # Distribution files
└── build/                      # Build files

## 4 Functional Requirements & Workflows (A2A)

### 4.1 Generalist Orchestrator

|  Step  |  Action                           |  Key Files                     |  Checklist                                             |
| ------ | --------------------------------- | ------------------------------ | ------------------------------------------------------ |
| G‑1    | Receive `tasks/send` from UI      | `orchestrator/routes.js`       | ✔ Returns HTTP 200 within 2 s                          |
| G‑2    | Classify intent → pick specialist | `orchestrator/orchestrator.js` | ✔ Logs show correct agent chosen for 10 sample prompts |
| G‑3    | Send sub‑task via A2A Client      | `libs/a2a/client.js`           | ✔ Sub‑task request conforms to JSON‑RPC schema         |
| G‑4    | Persist task & state              | `database/tasks.sql`           | ✔ Row inserted, state = "working"                      |
| G‑5    | Aggregate results & reply         | `orchestrator/orchestrator.js` | ✔ Final artifact sent; state = "completed"             |
| G‑6    | Escalate (low confidence)         | `orchestrator/orchestrator.js` | ✔ `escalate=true` when score < 0.4                     |

### 4.2 Broker Agent

|  Step  |  Action                 |  File              |  Checklist                             |
| ------ | ----------------------- | ------------------ | -------------------------------------- |
| B‑1    | Handle `tasks/send`     | `broker/routes.js` | ✔ Validates JSON; state → "working"    |
| B‑2    | Generate listing advice | `broker/broker.js` | ✔ Output cites ≥3 comps                |
| B‑3    | Return artifact         | `broker/routes.js` | ✔ Artifact TextPart length > 200 chars |

### 4.3 Legal Agent

|L‑1|Compliance lookup|`legal/legal.js`|✔ Returns regulation code + expiry|
|L‑2|Draft NDA|`legal/legal.js`|✔ Output includes signatory block|

### 4.4 Finance Agent

|F‑1|EBITDA × multiple valuation|`finance/finance.js`|✔ Matches golden result ±10 %|
|F‑2|Tax scenario summary|`finance/finance.js`|✔ ≥2 liabilities listed|

### 4.5 A2A Message Schema

* JSON‑RPC 2.0 envelope: `{jsonrpc:"2.0", id, method:"tasks/send", params}`
* `params.task.id` = UUID • `params.message.parts[i]` = `{type,text|data|file}`
* States: `submitted` → `working` → (`input‑required`)? → `completed|failed`.

---

## 5 Implementation Steps & Checklists

### Phase 0 – Environment

1. **Upgrade Node ≥18** (native fetch).
2. **Install core libs:** `npm i uuid ajv cors`.
3. **Create `.env` secrets** (DB, ports, SSE).
   **Done when:** Dev server boots all services with `npm run dev:multiprocess`.

### Phase 1 – Protocol Layer

|  Task  |  Owner                                           |  Checklist                     |
| ------ | ------------------------------------------------ | ------------------------------ |
| A‑1    | Implement `libs/a2a/schema.js` (Ajv JSON schema) | ✔ Unit tests >99 % pass        |
| A‑2    | Expose `/.well‑known/agent.json` for all agents  | ✔ GET returns 200 & valid JSON |
| A‑3    | Generic A2A Client (`libs/a2a/client.js`)        | ✔ Sends POST & parses result   |

### Phase 2 – Refactor Specialists

|  Agent                                                       |  Checklist                                           |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| Broker                                                       | Handles `tasks/send`; returns artifact               |
| Legal                                                        | Handles `input‑required`; returns NDA sample         |
| Finance                                                      | Handles DataPart input; valuation logic ported to JS |
| All three: **Integration tests** with `curl` sample succeed. |                                                      |

### Phase 3 – Orchestrator Routing

|  Task                              |  Checklist                                 |
| ---------------------------------- | ------------------------------------------ |
| Intent classifier MVP (regex)      | 80 % routing accuracy on 50‑prompt set     |
| DB `tasks` & `messages` migrations | Tables created; foreign keys OK            |
| Aggregation logic                  | Merges Finance & Broker outputs coherently |

### Phase 4 – Frontend Adoption

|  Task                                |  Checklist                               |
| ------------------------------------ | ---------------------------------------- |
| `public/js/a2a‑chat.js` send wrapper | JSON matches schema; error banners shown |
| Render streaming SSE (opt‑in)        | Chats update in <500 ms latency          |
| Voice STT form posts speech as text  | Whisper accuracy ≥95 % sample set        |

### Phase 5 – End‑to‑End & Rollout

1. **Docker Compose stack** – all agents + PG spin up.
2. **Cypress E2E** – listing, valuation, legal doc flows.
3. **Pilot** – 3 brokers, 3 sellers, CSAT ≥4/5.
4. **Prod deploy** – PM2 cluster, k8s optional.

---

## 6 Non‑Functional Requirements

* **Latency:** 90th percentile first token < 2 s.
* **Throughput:** 100 concurrent users, CPU ≤ 70 %.
* **Reliability:** Auto‑restart; idempotent tasks.
* **Security:** GDPR; HTTPS; bearer token between agents.

---

## 7 State Recovery & Resilience

1. **`tasks` table** – track state.
2. **Workers (BullMQ)** – retry failed tasks.
3. **Cron** – re‑queue if `updated_at` >5 m + not completed.
4. **Nightly pg\_dump + PV snapshot**.

---

## 8 API Contracts (Excerpt)

| Endpoint                  | Method | Req Body | Resp        | Purpose                 |
| ------------------------- | ------ | -------- | ----------- | ----------------------- |
| `/a2a/tasks/send`         | POST   | A2A JSON | JSON Result | User ↔ Generalist       |
| `/a2a/tasks/send`         | POST   | A2A JSON | JSON Result | Generalist ↔ Specialist |
| `/.well‑known/agent.json` | GET    | –        | Agent Card  | Discovery               |

---

## 9 Testing Strategy

### 9.1 Unit

* Ajv schemas, UUID helper, valuation math.
* Coverage ≥80 %.

### 9.2 Integration

* `curl` → Broker returns 200.
* Orchestrator routes to Finance, returns merged answer.

### 9.3 E2E

* Cypress: seller onboarding, valuation, NDA draft.
* Voice round‑trip wav → STT → Generalist → TTS mp3.

### 9.4 UAT

* Pilot group CSAT ≥4/5; bug rate ≤5 per critical path.

---

## 10 Timeline (MVP)

| Milestone            | Owner    | Due       |
| -------------------- | -------- | --------- |
| Env & A2A Core       | Dev Lead | 10 May 25 |
| Specialists A2A      | NLP Eng  | 25 May    |
| Orchestrator Routing | NLP Eng  | 05 Jun    |
| Frontend + Voice     | FE Dev   | 15 Jun    |
| E2E Tests            | QA       | 25 Jun    |
| Pilot                | PM       | 05 Jul    |
| Prod Launch          | PM       | 20 Jul    |

---

## 11 Open Issues & Next Steps

* **Auth Scheme** – choose bearer vs mTLS for inter‑agent calls.
* **Streaming** – add `tasks/sendSubscribe` once SSE UI stable.
* **Pricing API** – integrate external comps service.
* **Data masking** – PII scrub for logs.

---

### EOF
