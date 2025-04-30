# Product Requirements Document (PRD)
**Project:** Multi‑Agent AI Integration for Arzani.co.uk  
**Version:** 0.9‑draft (24 Apr 2025)  
**Owner:** <Your Name / AI Platform Lead>  
**Goal:** Reduce time & opacity in buying/selling brick‑and‑mortar businesses by embedding an orchestrated network of AI agents (Generalist + Broker, Legal, Finance specialists) with voice, chat, smart‑form UX and seamless human escalation.

---
## 1 Scope & Objectives
| # | Objective | KPI / Success Metric |
|---|-----------|----------------------|
|1|Match buyers & sellers faster| ≥ 30 % reduction in average time‑to‑offer (baseline T‑1)|
|2|Transparent pricing guidance| ≥ 90 % of valuations cite data source & calc|
|3|Seamless workflow recovery| 0 data‑loss incidents; restart resumes < 5 s|

---
## 2 High‑Level Architecture (recap)
* **Frontend (Express + EJS templates)** – Smart Forms ➜ Conversational UI 
  *Server‑rendered HTML with progressive‑enhancement JS.*
* **Node.js Orchestrator** – LangChain.js agents, Tool hub (MCP), voice & DB adapters.
* **Specialist Agents** – Broker, Legal, Finance (GPT‑4 via OpenAI API).
* **PostgreSQL + pgvector** – persistent memory, embeddings, crash recovery.
* **Human‑in‑Loop** – Broker/Lawyer pool via Live Chat & Scheduling microservice.

---
## 3 Deliverable File/Folder Outline
```text
/arzani‑ai/
  ├── README.md                     ← setup & quick‑start
  ├── .env.example                  ← env‑vars template
  ├── docker-compose.yml            ← local dev stack
  ├── backend/
  │     ├── server.js              ← Express entry
  │     ├── mcpClient.js           ← MCP tool wrapper
  │     ├── vectorUtils.js         ← pgvector helpers
  │     ├── agents/
  │     │     ├── index.js         ← registry / factory
  │     │     ├── generalist.js    ← system‑prompt + tools map
  │     │     ├── broker.js
  │     │     ├── legal.js
  │     │     └── finance.js
  │     ├── routes/
  │     │     ├── chat.js          ← REST/WS endpoint
  │     │     ├── voice.js        
  │     ├── controllers/           ← MVC controllers for views
  │     ├── db/
  │     │     ├── migrations/
  │     │     ├── models.js        ← User, Listing, Memory, Logs
  │     │     └── seed.sql
  │     └── tests/                 ← Jest
  ├── frontend/
  │     ├── views/                 ← EJS templates
  │     │     ├── layouts/
  │     │     │     └── main.ejs
  │     │     ├── partials/
  │     │     │     ├── formWizard.ejs
  │     │     │     ├── chatWidget.ejs
  │     │     │     └── voiceRecorder.ejs
  │     │     ├── pages/
  │     │     │     ├── index.ejs
  │     │     │     └── dashboard.ejs
  │     │     └── helpers/
  │     └── public/
  │           ├── css/
  │           ├── js/
  │           │     ├── formWizard.js
  │           │     ├── chatWidget.js
  │           │     └── voiceRecorder.jsk
  │           
  │                
  └── dev‑ops/
        ├── k8s/                   ← MCP, Node, PG manifests
        └── monitoring/            ← Grafana dashboards
```
---
## 4 Functional Requirements & Agent Workflows
### 4.1 Generalist Coordinator Agent (G‑A)
| Step | Description | Key Files | Test Checklist |
|------|-------------|-----------|----------------|
|G1|Receive user input (text/STT) & initial context|`routes/chat.js`, `agents/generalist.js`|✔ POST `/chat` returns 200 & stream starts < 2 s|
|G2|Classify intent → pick specialist tool(s)|`agents/generalist.js`|✔ Logs show correct `tool` call (`broker`, `legal`, `finance`) for 5 sampled prompts|
|G3|Merge specialist outputs, maintain persona|`agents/generalist.js`|✔ Response contains single voice & consistent tone|
|G4|Persist conversation & state|`db/models.js (Memory)`|✔ DB row created; embeddings length > 0|
|G5|Detect low‑confidence → escalate human|`agents/generalist.js`|✔ `escalate=true` when `logprobs < threshold`|

### 4.2 Broker Specialist Agent (B‑A)
| Step | Description | Files | Checklist |
|------|-------------|-------|-----------|
|B1|Valuation calculation using comps|`agents/broker.js`, `vectorUtils.js`|✔ Output cites ≥3 comps; matches test fixture within ±10 %|
|B2|Negotiation advice|`agents/broker.js`|✔ Advice includes ≥1 tactic & risk note|

### 4.3 Legal Specialist Agent (L‑A)
| Step | Description | Files | Checklist |
|------|-------------|-------|-----------|
|L1|License & compliance lookup via MCP `/regulations` tool|`agents/legal.js`, `mcpClient.js`|✔ Returns regulation code & expiry date|
|L2|Draft contract clauses|`agents/legal.js`|✔ Output includes signatory block|

### 4.4 Finance Specialist Agent (F‑A)
| Step | Description | Files | Checklist |
|------|-------------|-------|-----------|
|F1|Valuation math (EBITDA × multiple)|`agents/finance.js`|✔ Matches fixture result (golden test)|
|F2|Tax scenario summary|`agents/finance.js`|✔ Lists at least 2 potential tax liabilities|

### 4.5 Voice Interface Pipeline
| Step | Description | Files | Checklist |
|------|-------------|-------|-----------|
|V1|STT (browser / Whisper)|`routes/voice.js`|✔ Transcript accuracy ≥95 % on test clip|


### 4.6 Smart Form Wizard
| Step | Action | Template / Script | Checklist |
|-------|-------|------------------|-----------|
|W1|Dynamic field branch|`views/partials/formWizard.ejs`, `public/js/formWizard.js`|✔ Alcohol question appears only if `businessType = Restaurant`|
|W2|Submit → context save|`public/js/formWizard.js` → `routes/chat.js`|✔ DB row `listingDraft` created|

---
## 5 Non‑Functional Requirements
* **Latency:** < 2 s first token for 90th percentile queries.  
* **Scalability:** 100 concurrent users, CPU ≤ 70 %.  
* **Reliability:** Auto‑restart containers; agent workflow resumes using `SessionState` table (idempotent functions).  
* **Security & Privacy:** GDPR compliant; sensitive PII encrypted at rest.

---
## 6 State‑Recovery & Resume Strategy
1. **SessionState Table**  
   `session_id UUID PK` • `stage ENUM` • `payload JSONB` • `updated_at TIMESTAMP`  
   *Every orchestrator function (G‑A, B‑A, etc.) writes its step + payload.*
2. **Idempotent Steps**  
   Each step checks `SessionState.stage`; if already completed → skip.
3. **Cron Monitor**  
   `monitor.js` scans for sessions where `updated_at` > 5 min + `stage != complete` → re‑queue.
4. **Process Queue (BullMQ)**  
   Background workers pick queued sessions and resume with stored payload.
5. **Disaster Recovery**  
   Nightly `pg_dump`; k8s PersistentVolume snapshots; test restore weekly.

---
## 7 API Contracts (excerpt)
| Endpoint | Method | Req Body | Resp | Purpose |
|----------|--------|---------|------|---------|
|`/chat`|POST|`{sessionId, msg}`|`stream`|User ↔ G‑A|
|`/stt`|POST|`{audio}`|`{text}`|Speech → text|

---
## 8 Testing Strategy & Acceptance Criteria
### 8.1 Unit Tests
* **agents/** – Jest + nock (mock OpenAI). Coverage ≥ 80 %.
* Valuation math edge cases: zero revenue, negative profit.

### 8.2 Integration Tests
* Spin up docker‑compose stack; run Cypress E2E: seller onboarding, valuation, legal doc draft, escalation.
* Voice round‑trip test: prerecorded wav → STT → G‑A → TTS audio returned.

### 8.3 User Acceptance Tests (UAT)
* Pilot with 3 broker users and 3 seller users. Collect CSAT; require ≥ 4/5.

---
## 9 Timeline (MVP)
| Milestone | Owner | Due |
|-----------|-------|-----|
|Setup repo + scaffolding|Dev Lead|05 May 25|
|Generalist & Broker agents|NLP Eng|20 May|
|Legal & Finance agents|NLP Eng|10 Jun|
|Voice pipeline|FE Dev|15 Jun|
|Smart form UX|FE Dev|25 Jun|
|Recovery logic + Monitoring|DevOps|30 Jun|
|Beta launch (internal)|PM|10 Jul|

---
## 10 Open Issues & Next Steps
* **TBD –** MCP regulations tool spec
* **TBD –** pricing API for comps data
* **TBD –** data anonymization strategy for AI logs

---
### EOF

