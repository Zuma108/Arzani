# Product Requirement Document (PRD)

## Project: Automated Blog Post Creation and Updating using n8n

### Overview
This project aims to automate the creation and publication of blog posts on Azani.co.uk using n8n, a workflow automation tool. This solution ensures blog posts can be seamlessly drafted, reviewed, confirmed, and published in real-time without manual intervention, enhancing content freshness and SEO ranking.

---

## Objectives

- Automate blog publication processes to increase efficiency and content consistency.
- Support continuous content updates without disrupting the live website.
- Improve organic SEO traffic through consistent, keyword-rich blog content.
- Enable immediate publication of approved blogs on the live website.
- Align content strategy with insights from Daniel Priestley’s methodologies (targeted, high-intent content).

---

## Features & Functional Requirements

### 1. Content Input and Management
- **Data Source Options:** Google Sheets, Airtable, Markdown files, Email submissions.
- **Required Fields:**
  - Blog Title
  - Meta Description
  - Author
  - Content Body (Markdown or HTML supported)
  - Categories & Tags
  - Slug/Permalink
  - Publish Date
  - Status (Draft, Review, Approved, Published)

### 2. n8n Workflow Automation

**Trigger Conditions:**
- Status change to "Approved" triggers automated workflow.

**Workflow Steps:**
1. **Data Retrieval:** Fetch approved content from the data source.
2. **Content Processing:**
   - HTML sanitization
   - Markdown conversion (if necessary)
   - SEO metadata addition (structured data, tags)
3. **CMS Integration:** Automatically publish content via API integration (WordPress, Sanity, Strapi, custom CMS).
4. **Live Refresh:** Trigger website cache refresh or webhook for real-time content updates.
5. **Notification:** Email or Slack notifications upon successful publishing.

### 3. Website Blog Integration
- Dynamic loading of published blog posts from CMS/API.
- Blog structure to include:
  - Hero image
  - Clearly structured headings (H1, H2, H3)
  - Internal links (to other blogs or marketplace listings)
  - SEO-optimized metadata (title tags, descriptions)
  - Prominent Call-To-Action (CTAs) aligned with buyer/seller journeys

### 4. Admin Dashboard (Optional)
- Centralized interface to:
  - Preview drafted content
  - Approve content for publishing
  - Track publishing status and content analytics (page views, engagement)

---

## Technical Specifications

- **Backend:** Node.js with robust API integration
- **Frontend:** Responsive HTML/CSS/JavaScript (Tailwind preferred)
- **Automation Tool:** n8n
- **Content Delivery:** APIs or headless CMS integration
- **Hosting:** AWS, Vercel, or similar (with CDN optimization)
- **Security:** Content validation, sanitization, and secure API transactions
- **Performance Requirements:** Page loading under 2 seconds, immediate content update visibility

---

## Example Workflow

1. Content creator drafts a blog post titled “Maximizing Business Value Before Sale” in Airtable.
2. The status is changed from "Draft" to "Approved."
3. n8n detects the status change and fetches the content.
4. n8n processes and pushes the formatted content to the CMS.
5. Blog post appears live at: `azani.co.uk/blog/maximizing-business-value-before-sale` immediately.
6. Admin receives a notification confirming successful publication.

---

## Future Enhancements

- Real-time blog analytics dashboard.
- Automated content sharing on LinkedIn and Twitter upon publishing.

---

## Success Metrics
- Increased blog publishing frequency and consistency.
- Improved organic search rankings and site traffic.
- Reduction in manual content management workload.

