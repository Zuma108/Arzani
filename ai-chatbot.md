Product Requirement Document (PRD)
Project Name: AI Chatbot for Business Marketplace
Version: 1.1
Date: [Insert Date]
Author: [Your Name]

1. Overview
1.1 Introduction
This document outlines the requirements for an AI-powered chatbot embedded in a business marketplace platform. The primary goal of this chatbot is to enhance user engagement, facilitate efficient buyer-seller interactions, automate lead generation, and provide personalized business recommendations. It will be deployed as a pop-up or widget and will seamlessly integrate with existing website functionalities.

1.2 Objectives
Instant Assistance & Engagement
Provide immediate support to buyers and sellers, reducing response times and friction in the decision-making process.

Lead Qualification & Conversion
Automate the capture and qualification of leads, identifying high-intent users early to boost conversions.

Intelligent Recommendations
Use AI-driven insights to suggest relevant business listings, best practices, and next steps.

Streamlined Communication
Act as a unified communication channel, minimizing back-and-forth emails and accelerating negotiations.

Data-Driven Insights
Collect and analyze user interactions to improve marketplace strategies, pricing guidance, and marketing efforts.

1.3 Target Users
Business Buyers: Investors and entrepreneurs actively seeking to purchase businesses.
Business Sellers: Owners wanting to list or exit existing businesses.
Brokers: Professionals assisting in facilitating deals and providing advisory services.
General Visitors: Users exploring potential opportunities or researching market data.
2. Features & Functional Requirements
2.1 Chatbot Activation & UI
Pop-up/Widget Integration
A single click on the chat icon triggers a pop-up.
Smooth open/close animations to enhance user experience.
Conversation View
Persistent session history, even if the user toggles between different site pages.
Quick-reply buttons for frequently asked questions or prompts.
Multi-channel Support (Optional Extension)
Ability to expand chatbot functionality to other platforms (e.g., WhatsApp, Facebook Messenger) in future phases.
2.2 Core Chatbot Functions
2.2.1 Business Discovery & Search
Users can input criteria like industry, location, budget, and revenue range.
The chatbot provides a curated list of relevant business listings.
Advanced Filtering: Additional filters (EBITDA, years in operation, etc.) for detailed searches.
2.2.2 Seller & Buyer Assistance
Seller Guidance:
Walkthrough of listing creation (financial data, valuation, unique selling points).
AI-based initial valuation estimates using historical marketplace data.
Buyer Guidance:
Recommendations based on user’s budget, location, and industry preferences.
Automated lead creation once a buyer expresses serious interest.
2.2.3 Lead Generation & Follow-up
Contact Capture:
Chatbot prompts users for email/phone details when they show strong intent.
Automated Scheduling:
Option to schedule calls/meetings directly from the chat for high-intent leads.
Follow-up Reminders:
Automatic email or in-chat reminders sent to both buyers and sellers.
2.2.4 AI-Driven Recommendations
Personalized Listings:
Machine learning model suggests listings or content based on prior user interactions.
Lead Scoring:
System flags leads as “hot,” “warm,” or “cold” based on conversation patterns and user activity.
2.2.5 FAQ & Knowledge Base
On-Demand Responses:
Instant replies to common marketplace questions (payment methods, legal documentation).
Fallback to Human Support:
Complex or ambiguous queries seamlessly redirected to human agents.
2.2.6 Email & Document Integration
Document Delivery:
Ability to request or deliver business documentation (e.g., P&Ls, NDAs) via a secure link.
Cloud Integration:
Google Drive for shared or downloadable reports.
Potential integration with Dropbox or other services if needed.
2.2.7 Security & Compliance
GDPR & Data Privacy:
Informed consent prompts and opt-out options for data storage.
Encryption:
All in-transit and at-rest data encrypted using TLS/SSL and database encryption.
Access Control & Audit Trails:
Only authorized personnel can access detailed chat histories.
Comprehensive logging of user interactions and admin activities.
3. Technical Requirements
3.1 Frontend (UI & UX)
Technology Stack:
HTML, CSS, and JavaScript for the chat widget.
Responsive design ensuring cross-device compatibility.
Performance Optimization:
Lazy loading or dynamic loading of chatbot scripts to minimize impact on page speed.
Pre-cached AI responses for common FAQ queries.
3.2 Backend (Logic & Processing)
Language & Framework:
Node.js (Express or NestJS) for real-time event handling.
WebSocket or Socket.IO for continuous, stateful conversation.
Database:
PostgreSQL for structured data (user profiles, chat logs, leads).
Could incorporate Redis or other caching solutions for session management.
Scalability & Redundancy:
Horizontal scaling through containerization (Docker/Kubernetes).
Load balancing to manage high traffic periods.
3.3 AI & Natural Language Processing (NLP)
Model & Provider:
Integration with GPT-4 (or GPT-4o) for advanced language understanding.
Intent recognition to classify user queries and direct them to appropriate workflows.
Conversational Context & Memory:
Multi-turn conversations stored in session to maintain context.
Mechanism to handle context expiration or “reset” for security and privacy reasons.
3.4 API & Integrations
External Services:
Google Drive API: Document storage and retrieval.
Email Service (e.g., SendGrid, Postmark): Automated email notifications, lead follow-ups.
Marketplace Database/ERP: Real-time listing data retrieval.
Optional Integrations:
Stripe: Premium features or paywalls for advanced features.
CRM Platforms: Salesforce, HubSpot, or custom CRM for advanced lead tracking and segmentation.
3.5 Security & Authentication
OAuth 2.0 / JWT:
Secure third-party API calls and user authentication if accessing user-specific data.
Rate Limiting & Throttling:
Prevent misuse or denial-of-service attacks on the chatbot API.
4. User Journey
4.1 Buyer Journey
Chat Initiation
The buyer opens the chatbot to explore business opportunities.
Information Gathering
Chatbot asks for preferred industry, location, budget, etc.
Buyer provides specific criteria.
Recommendations & Sorting
Chatbot lists relevant businesses.
Buyer can refine filters (e.g., profitability, years in business).
Lead Capture
Once interest is shown, chatbot requests contact info.
Follow-up email or call scheduling is offered.
4.2 Seller Journey
Chat Initiation
The seller accesses chatbot for listing assistance.
Business Details
Chatbot collects data like revenue, profit margins, reason for sale.
Valuation Insights
AI provides an estimated valuation range and market insights.
Listing Creation
Seller finalizes listing details (images, documents).
Chatbot confirms listing publication.
Post-Listing Support
Offers promotional tips.
Schedules follow-ups for performance reviews or listing adjustments.
5. Performance Metrics & Success Criteria
5.1 Key Performance Indicators (KPIs)
Chatbot Engagement Rate
Percentage of site visitors who open the chatbot.
Lead Conversion Rate
Proportion of chatbot interactions converting into qualified leads or listings.
Average Response Time
Target <1 second for AI response generation.
User Satisfaction Score (CSAT)
Gather immediate feedback with star ratings or short surveys post-interaction.
Retention / Return Usage
Frequency of returning users who continue to engage with the chatbot.
5.2 Scalability & Optimization
Concurrent Users
Support hundreds or thousands of users simultaneously during peak times.
Model Updates
Regular AI model retraining based on aggregated user queries.
System Monitoring
Real-time dashboards for server load, error rates, and user analytics.
Automatic alerts for anomalies or downtime.
6. Deployment & Roadmap
6.1 Initial Deployment Plan
Phase 1 (MVP)
Basic chatbot UI/UX.
Core FAQ, listing search, and lead capture.
Minimal integrations (email only).
Phase 2 (AI Recommendations & Data Integration)
Advanced recommendation engine powered by GPT-4.
Full integration with marketplace listings and partial CRM.
Phase 3 (Automation & Scalability)
Integrations with Google Drive for documentation.
Automated email follow-ups and scheduling.
Enhanced security measures (OAuth, encryption, etc.).
Phase 4 (Refinements & Multi-language Support)
Fine-tune AI with user feedback.
Multilingual capabilities for global reach.
Additional third-party integrations (Stripe, CRM, etc.).
6.2 Maintenance & Updates
Regular Model Refinements
Continual improvement of NLP models using new user data.
Security Patches
Ongoing updates to maintain compliance and protect user data.
Performance Monitoring
Monthly or quarterly reviews to ensure chat latency, accuracy, and user satisfaction remain optimal.
7. Conclusion
The AI chatbot for the business marketplace is designed to provide a seamless and intelligent interface for both buyers and sellers. By leveraging real-time conversations, advanced AI recommendations, and robust security measures, it aims to streamline the buying and selling process, boost engagement, and facilitate faster deal closures. Continuous updates and scalable infrastructure will ensure the chatbot remains a valuable asset as the marketplace grows and evolves.

End of Document



Line 200 chatbot full mapping 
<div data-layer="div.frame.ng-tns-c168265695-8.ng-trigger.ng-trigger-toggle.ng-star-inserted" class="DivFrameNgTnsC1682656958NgTriggerNgTriggerToggleNgStarInserted" style="width: 512px; height: 900px; position: relative; background: rgba(255, 255, 255, 0.01); box-shadow: -10px 0px 40px rgba(0, 0, 0, 0.06); border-radius: 8px; overflow: hidden">
  <div data-layer="div.copilot-header.d-flex.align-items-center.justify-content-between.px-3.ng-tns-c168265695-8" class="DivCopilotHeaderDFlexAlignItemsCenterJustifyContentBetweenPx3NgTnsC1682656958" style="width: 512px; height: 40px; left: 0px; top: 0px; position: absolute; background: #000AA4; justify-content: center; align-items: center; gap: 331.17px; display: inline-flex">
    <div data-layer="span.ng-tns-c168265695-8" class="SpanNgTnsC1682656958" style="width: 136.82px; height: 24px; justify-content: center; align-items: flex-end; gap: 3.58px; display: inline-flex">
      <div data-layer="AI Assistant" class="AiAssistant" style="position: relative; color: white; font-size: 16px; font-family: Inter; font-weight: 400; line-height: 24px; word-wrap: break-word">AI Assistant </div>
      <div data-layer="span.version-badge.ng-tns-c168265695-8.ng-star-inserted" class="SpanVersionBadgeNgTnsC1682656958NgStarInserted" style="width: 43.25px; height: 19.60px; border-radius: 3px; border: 0.80px #E8E8E8 solid; justify-content: center; align-items: center; display: inline-flex">
        <div data-layer="BETA" class="Beta" style="position: relative; color: white; font-size: 10px; font-family: Inter; font-weight: 600; line-height: 12.10px; word-wrap: break-word">BETA</div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-xmark.ng-tns-c168265695-8" class="IFaRegularFaXmarkNgTnsC1682656958" style="width: 12px; height: 16px; flex-direction: column; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 10px; height: 10px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 10px; height: 10px; position: relative; background: white"></div>
      </div>
    </div>
  </div>
  <div data-layer="div.chat-container.ng-tns-c3694970646-10" class="DivChatContainerNgTnsC369497064610" style="width: 512px; height: 860px; left: 0px; top: 40px; position: absolute; background: white">
    <div data-layer="button.clear-chat-button.mx-auto.ng-tns-c3694970646-10" class="ButtonClearChatButtonMxAutoNgTnsC369497064610" style="width: 97.99px; height: 28.80px; left: 207px; top: 670.20px; position: absolute; background: white; box-shadow: 0px 6px 16px rgba(217, 202, 255, 0.10); border-radius: 4px; border: 0.80px #E4E4E4 solid; justify-content: center; align-items: flex-start; display: inline-flex">
      <div data-layer="i.fa-regular.fa-trash-can-xmark.ng-tns-c3694970646-10" class="IFaRegularFaTrashCanXmarkNgTnsC369497064610" style="width: 10.50px; height: 12px; flex-direction: column; justify-content: center; align-items: center; display: inline-flex">
        <div data-layer="Frame" class="Frame" style="width: 10.50px; height: 12px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
          <div data-layer="Vector" class="Vector" style="width: 10.50px; height: 12px; position: relative; background: black"></div>
        </div>
      </div>
      <div data-layer="Clear chat" class="ClearChat" style="position: relative; color: black; font-size: 12px; font-family: Inter; font-weight: 500; word-wrap: break-word"> Clear chat</div>
    </div>
    <div data-layer="div.suggested-prompts.dmo-mx-16.dmo-pb-10.ng-tns-c3694970646-10.ng-trigger.ng-trigger-actionsSection.ng-star-inserted" class="DivSuggestedPromptsDmoMx16DmoPb10NgTnsC369497064610NgTriggerNgTriggerActionssectionNgStarInserted" style="width: 480px; height: 73.40px; left: 16px; top: 699px; position: absolute; justify-content: flex-start; align-items: center; display: inline-flex">
      <div data-layer="Suggested prompts:" class="SuggestedPrompts" style="position: relative; color: #3B3B3B; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 20px; word-wrap: break-word">Suggested prompts:</div>
    </div>
    <div data-layer="i.fa-regular.fa-paperclip.ng-tns-c663035203-11" class="IFaRegularFaPaperclipNgTnsC66303520311" style="width: 15.75px; height: 18px; left: 24px; top: 794.20px; position: absolute; flex-direction: column; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 15.29px; height: 17.54px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 15.29px; height: 17.54px; position: relative; background: #979DA5"></div>
      </div>
    </div>
    <div data-layer="div.dmo-flex.dmo-justify-center.dmo-items-center.dmo-mb-8.credits.dmo-mx-16.ng-tns-c3694970646-10.ng-star-inserted" class="DivDmoFlexDmoJustifyCenterDmoItemsCenterDmoMb8CreditsDmoMx16NgTnsC369497064610NgStarInserted" style="width: 480px; height: 20px; left: 16px; top: 832px; position: absolute; justify-content: center; align-items: center; gap: 6px; display: inline-flex">
      <div data-layer="i.fa-regular.fa-circle-star.ng-tns-c3694970646-10" class="IFaRegularFaCircleStarNgTnsC369497064610" style="width: 12px; height: 12px; justify-content: center; align-items: center; display: inline-flex">
        <div data-layer="Frame" class="Frame" style="width: 12px; height: 12px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
          <div data-layer="Vector" class="Vector" style="width: 12px; height: 12px; position: relative; background: #000AA4"></div>
        </div>
      </div>
      <div data-layer="p" class="P" style="width: 420.24px; height: 20px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Remaining:" class="Remaining" style="position: relative; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Remaining: </div>
        <div data-layer="29" style="position: relative; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">29</div>
        <div data-layer="of" class="Of" style="position: relative; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word"> of </div>
        <div data-layer="30" style="position: relative; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">30</div>
        <div data-layer="credits. Credits will reset in 7 days." class="CreditsCreditsWillResetIn7Days" style="position: relative; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word"> credits. Credits will reset in 7 days. </div>
        <div data-layer="Upgrade for more" class="UpgradeForMore" style="position: relative; color: #000AA4; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Upgrade for more</div>
      </div>
    </div>
  </div>
  <div data-layer="div.messages-scroll.dmo-px-16.ng-tns-c3694970646-10" class="DivMessagesScrollDmoPx16NgTnsC369497064610" style="width: 512px; height: 654.20px; left: 0px; top: 40px; position: absolute">
    <div data-layer="div.dmo-mt-16.ng-tns-c2665823664-22.ng-trigger.ng-trigger-messageContainerAppear.system-message" class="DivDmoMt16NgTnsC266582366422NgTriggerNgTriggerMessagecontainerappearSystemMessage" style="width: 475.20px; height: 576.01px; left: 16px; top: 415.79px; position: absolute; flex-direction: column; justify-content: flex-start; align-items: center; display: inline-flex">
      <div data-layer="ai-markdown.ng-tns-c2665823664-22" class="AiMarkdownNgTnsC266582366422" style="width: 419.20px; height: 528.01px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="I've created a scenario that includes the following modules to fulfill your request:" class="IVeCreatedAScenarioThatIncludesTheFollowingModulesToFulfillYourRequest" style="width: 419.20px; position: relative; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">I've created a scenario that includes the following modules to fulfill your request:</div>
        <div data-layer="ol" class="Ol" style="width: 419.20px; height: 260px; position: relative">
          <div data-layer="li" class="Li" style="width: 419.20px; height: 40px; left: 0px; top: 0px; position: absolute">
            <div data-layer="Search for Places" class="SearchForPlaces" style="left: 0px; top: -0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">Search for Places</div>
            <div data-layer=": Fetches business listings from Google Maps for the area of Ramsgate." class="FetchesBusinessListingsFromGoogleMapsForTheAreaOfRamsgate" style="width: 379.04px; left: 0px; top: 1.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">                               : Fetches business listings from Google Maps for the area of Ramsgate.</div>
          </div>
          <div data-layer="li" class="Li" style="width: 419.20px; height: 40px; left: 0px; top: 40px; position: absolute">
            <div data-layer="Basic Feeder" class="BasicFeeder" style="left: 0px; top: -0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">Basic Feeder</div>
            <div data-layer=": Feeds the fetched business listings into the next steps." class="FeedsTheFetchedBusinessListingsIntoTheNextSteps" style="width: 414.25px; left: 0px; top: 1.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">                       : Feeds the fetched business listings into the next steps.</div>
          </div>
          <div data-layer="li" class="Li" style="width: 419.20px; height: 40px; left: 0px; top: 80px; position: absolute">
            <div data-layer="Add Row" class="AddRow" style="left: 0px; top: -0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">Add Row</div>
            <div data-layer=": Adds the business listings to a Google Spreadsheet for tracking." class="AddsTheBusinessListingsToAGoogleSpreadsheetForTracking" style="width: 408.38px; left: 0px; top: 1.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">                : Adds the business listings to a Google Spreadsheet for tracking.</div>
          </div>
          <div data-layer="li" class="Li" style="width: 419.20px; height: 40px; left: 0px; top: 120px; position: absolute">
            <div data-layer="Send Email" class="SendEmail" style="left: 0px; top: -0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">Send Email</div>
            <div data-layer=": Sends cold emails to the businesses using a predefined email template, optimized to avoid spam filters." class="SendsColdEmailsToTheBusinessesUsingAPredefinedEmailTemplateOptimizedToAvoidSpamFilters" style="width: 387.04px; left: 0px; top: 1.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">                    : Sends cold emails to the businesses using a predefined email template, optimized to avoid spam filters.</div>
          </div>
          <div data-layer="li" class="Li" style="width: 419.20px; height: 60px; left: 0px; top: 175.21px; position: absolute">
            <div data-layer="Action Read Email Engagements" class="ActionReadEmailEngagements" style="left: 0px; top: -0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">Action Read Email Engagements</div>
            <div data-layer=": Tracks email engagement, updating the Google Spreadsheet with the status of whether the emails were opened, replied to, or never opened." class="TracksEmailEngagementUpdatingTheGoogleSpreadsheetWithTheStatusOfWhetherTheEmailsWereOpenedRepliedToOrNeverOpened" style="width: 402.38px; left: 0px; top: 1.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">                                                        : Tracks email engagement, updating the Google Spreadsheet with the status of whether the emails were opened, replied to, or never opened.</div>
          </div>
          <div data-layer="li" class="Li" style="width: 419.20px; height: 40px; left: 0px; top: 220px; position: absolute">
            <div data-layer="Update Row" class="UpdateRow" style="left: 0px; top: -0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">Update Row</div>
            <div data-layer=": Updates the Google Spreadsheet with the latest engagement status of the emails sent." class="UpdatesTheGoogleSpreadsheetWithTheLatestEngagementStatusOfTheEmailsSent" style="width: 405.86px; left: 0px; top: 1.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">                     : Updates the Google Spreadsheet with the latest engagement status of the emails sent.</div>
          </div>
        </div>
        <div data-layer="Next Steps" class="NextSteps" style="position: relative; color: #6D50B9; font-size: 15.40px; font-family: Inter; font-weight: 500; line-height: 18.48px; word-wrap: break-word">Next Steps</div>
        <div data-layer="Before running the scenario, please set up the necessary connections for Google Maps and your email service. Here’s how to do it:" class="BeforeRunningTheScenarioPleaseSetUpTheNecessaryConnectionsForGoogleMapsAndYourEmailServiceHereSHowToDoIt" style="width: 419.20px; position: relative; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Before running the scenario, please set up the necessary connections for Google Maps and your email service. Here’s how to do it:</div>
        <div data-layer="ol" class="Ol" style="width: 419.20px; height: 60px; flex-direction: column; justify-content: center; align-items: flex-start; display: inline-flex">
          <div data-layer="Click on the module." class="ClickOnTheModule" style="position: relative; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Click on the module.</div>
          <div data-layer="Click on "Create a connection."" class="ClickOnCreateAConnection" style="position: relative; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Click on "Create a connection."</div>
          <div data-layer="Log into the service." class="LogIntoTheService" style="position: relative; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Log into the service.</div>
        </div>
        <div data-layer="Once you've set up the connections, let me know if you need help mapping the modules or any further assistance!" class="OnceYouVeSetUpTheConnectionsLetMeKnowIfYouNeedHelpMappingTheModulesOrAnyFurtherAssistance" style="width: 419.20px; position: relative; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Once you've set up the connections, let me know if you need help mapping the modules or any further assistance!</div>
      </div>
    </div>
    <img data-layer="img.make-icon.ng-tns-c2665823664-22" class="ImgMakeIconNgTnsC266582366422" style="width: 13.84px; height: 16px; left: 25.08px; top: 423.79px; position: absolute" src="https://placehold.co/14x16" />
    <div data-layer="div.d-flex.justify-content-between.overflow-hidden.position-relative.ng-tns-c2665823664-22" class="DivDFlexJustifyContentBetweenOverflowHiddenPositionRelativeNgTnsC266582366422" style="width: 419.20px; height: 22px; left: 64px; top: 961.80px; position: absolute; justify-content: center; align-items: flex-start; gap: 253.38px; display: inline-flex">
      <div data-layer="span.ng-tns-c2665823664-22" class="SpanNgTnsC266582366422" style="width: 96.40px; height: 22px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="button.positive" class="ButtonPositive" style="width: 22px; height: 22px; border-radius: 4px; border: 0.80px #1B8800 solid; justify-content: center; align-items: center; display: inline-flex">
          <div data-layer="i.fa-light.fa-thumbs-up.ng-star-inserted" class="IFaLightFaThumbsUpNgStarInserted" style="width: 12px; height: 12px; justify-content: center; align-items: center; display: inline-flex">
            <div data-layer="Frame" class="Frame" style="width: 12px; height: 10.50px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
              <div data-layer="Vector" class="Vector" style="width: 12px; height: 10.50px; position: relative; background: #1B8800"></div>
            </div>
          </div>
        </div>
        <div data-layer="button.negative" class="ButtonNegative" style="width: 22px; height: 22px; border-radius: 4px; border: 0.80px #CE1839 solid; justify-content: center; align-items: center; display: inline-flex">
          <div data-layer="i.fa-light.fa-thumbs-down.ng-star-inserted" class="IFaLightFaThumbsDownNgStarInserted" style="width: 12px; height: 12px; justify-content: center; align-items: center; display: inline-flex">
            <div data-layer="Frame" class="Frame" style="width: 12px; height: 10.50px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
              <div data-layer="Vector" class="Vector" style="width: 12px; height: 10.50px; position: relative; background: #CE1839"></div>
            </div>
          </div>
        </div>
        <div data-layer="button.dmo-px-8" class="ButtonDmoPx8" style="width: 29.60px; height: 22px; border-radius: 4px; border: 0.80px #E4E4E4 solid; justify-content: center; align-items: center; display: inline-flex">
          <div data-layer="i.fa-light.fa-arrows-rotate.ng-star-inserted" class="IFaLightFaArrowsRotateNgStarInserted" style="width: 12px; height: 12px; justify-content: center; align-items: center; display: inline-flex">
            <div data-layer="Frame" class="Frame" style="width: 10.50px; height: 10.50px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
              <div data-layer="Vector" class="Vector" style="width: 10.50px; height: 10.50px; position: relative; background: black"></div>
            </div>
          </div>
        </div>
        <div data-layer="span.like-regenerate-divider.ng-tns-c2665823664-22.ng-star-inserted" class="SpanLikeRegenerateDividerNgTnsC266582366422NgStarInserted" style="width: 1px; height: 16px; position: relative"></div>
      </div>
      <div data-layer="button.dmo-px-8" class="ButtonDmoPx8" style="width: 69.43px; height: 22px; border-radius: 4px; border: 0.80px #E4E4E4 solid; justify-content: center; align-items: center; display: inline-flex">
        <div data-layer="i.fa-regular.fa-clock-rotate-left.ng-star-inserted" class="IFaRegularFaClockRotateLeftNgStarInserted" style="width: 12px; height: 12px; justify-content: center; align-items: center; display: inline-flex">
          <div data-layer="Frame" class="Frame" style="width: 12px; height: 12px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
            <div data-layer="Vector" class="Vector" style="width: 12px; height: 12px; position: relative; background: black"></div>
          </div>
        </div>
        <div data-layer="Revert" class="Revert" style="position: relative; color: black; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word"> Revert</div>
      </div>
    </div>
    <div data-layer="div.dmo-mt-16.ng-tns-c2665823664-14.ng-trigger.ng-trigger-messageContainerAppear.user-message" class="DivDmoMt16NgTnsC266582366414NgTriggerNgTriggerMessagecontainerappearUserMessage" style="width: 475.20px; height: 192px; left: 16px; top: 207.79px; position: absolute; justify-content: center; align-items: flex-start; gap: 8px; display: inline-flex">
      <div data-layer="div.message-content.ng-tns-c2665823664-14" class="DivMessageContentNgTnsC266582366414" style="width: 435.20px; height: 192px; background: #F8F8F8; justify-content: center; align-items: center; display: inline-flex">
        <div data-layer="hey can you create a scenario where there is a template which gets all the businesses from the area of Ramsgate on google maps and puts them on a google spread sheet so that we can reach out to them using a cold email template that will send out 300 email that would not go into spam and the google sheet will update whether the businesses open the email, reply or never open and the google sheet is updated accordingly" class="HeyCanYouCreateAScenarioWhereThereIsATemplateWhichGetsAllTheBusinessesFromTheAreaOfRamsgateOnGoogleMapsAndPutsThemOnAGoogleSpreadSheetSoThatWeCanReachOutToThemUsingAColdEmailTemplateThatWillSendOut300EmailThatWouldNotGoIntoSpamAndTheGoogleSheetWillUpdateWhetherTheBusinessesOpenTheEmailReplyOrNeverOpenAndTheGoogleSheetIsUpdatedAccordingly" style="width: 387.20px; position: relative; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">hey can you create a scenario where there is a template which gets all the businesses from the area of Ramsgate on google maps and puts them on a google spread sheet so that we can reach out to them using a cold email template that will send out 300 email that would not go into spam and the google sheet will update whether the businesses open the email, reply or never open and the google sheet is updated accordingly</div>
      </div>
      <div data-layer="span.profile-icon.user-icon.ng-tns-c2665823664-14.ng-star-inserted" class="SpanProfileIconUserIconNgTnsC266582366414NgStarInserted" style="width: 32px; height: 32px; background: #000AA4; border-radius: 6px; justify-content: center; align-items: center; display: inline-flex">
        <div data-layer="i.fa-solid.fa-circle-user.ng-tns-c2665823664-14" class="IFaSolidFaCircleUserNgTnsC266582366414" style="width: 16px; height: 16px; justify-content: center; align-items: center; display: inline-flex">
          <div data-layer="Frame" class="Frame" style="width: 16px; height: 16px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
            <div data-layer="Vector" class="Vector" style="width: 16px; height: 16px; position: relative; background: white"></div>
          </div>
        </div>
      </div>
    </div>
    <div data-layer="div.dmo-mt-16.ng-tns-c2665823664-13.ng-trigger.ng-trigger-messageContainerAppear.system-message" class="DivDmoMt16NgTnsC266582366413NgTriggerNgTriggerMessagecontainerappearSystemMessage" style="width: 475.20px; height: 110px; left: 16px; top: 81.79px; position: absolute">
      <div data-layer="Welcome Michael Adekoya! I'm here to help you create powerful scenarios and automate your workflows. Whether you need assistance generating a new scenario, crafting content, or exploring example scenarios to get started, I'm ready to assist. How can I help you today?" class="WelcomeMichaelAdekoyaIMHereToHelpYouCreatePowerfulScenariosAndAutomateYourWorkflowsWhetherYouNeedAssistanceGeneratingANewScenarioCraftingContentOrExploringExampleScenariosToGetStartedIMReadyToAssistHowCanIHelpYouToday" style="width: 419.20px; left: 48px; top: 3.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Welcome Michael Adekoya! I'm here to help you create powerful scenarios and automate your workflows. Whether you need assistance generating a new scenario, crafting content, or exploring example scenarios to get started, I'm ready to assist. How can I help you today?</div>
      <div data-layer="Group 52" class="Group52" style="width: 32px; height: 32px; left: 0px; top: -3.79px; position: absolute">
        <div data-layer="span.profile-icon.system-icon.ng-tns-c2665823664-7.ng-star-inserted" class="SpanProfileIconSystemIconNgTnsC26658236647NgStarInserted" style="width: 32px; height: 32px; left: 0px; top: 0px; position: absolute; background: linear-gradient(93deg, #4F8CFF 0%, #010545 100%); border-radius: 6px"></div>
        <img data-layer="A-logo-removebg-preview 3" class="ALogoRemovebgPreview3" style="width: 30px; height: 22.11px; left: 2px; top: 4px; position: absolute" src="https://placehold.co/30x22" />
      </div>
    </div>
    <div data-layer="div.dmo-mt-16.ng-tns-c2665823664-12.ng-trigger.ng-trigger-messageContainerAppear.system-message" class="DivDmoMt16NgTnsC266582366412NgTriggerNgTriggerMessagecontainerappearSystemMessage" style="width: 475.20px; height: 50px; left: 16px; top: 15.79px; position: absolute">
      <div data-layer="Welcome Michael Adekoya! I have noticed you have an error in your scenario. You can ask me to help you to solve." class="WelcomeMichaelAdekoyaIHaveNoticedYouHaveAnErrorInYourScenarioYouCanAskMeToHelpYouToSolve" style="width: 419.20px; left: 48px; top: 3.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Welcome Michael Adekoya! I have noticed you have an error in your scenario. You can ask me to help you to solve.</div>
      <div data-layer="Group 50" class="Group50" style="width: 32px; height: 32px; left: 0px; top: -3.79px; position: absolute">
        <div data-layer="span.profile-icon.system-icon.ng-tns-c2665823664-7.ng-star-inserted" class="SpanProfileIconSystemIconNgTnsC26658236647NgStarInserted" style="width: 32px; height: 32px; left: 0px; top: 0px; position: absolute; background: linear-gradient(93deg, #4F8CFF 0%, #010545 100%); border-radius: 6px"></div>
        <img data-layer="A-logo-removebg-preview 3" class="ALogoRemovebgPreview3" style="width: 30px; height: 22.11px; left: 2px; top: 4px; position: absolute" src="https://placehold.co/30x22" />
      </div>
      <div data-layer="Group 51" class="Group51" style="width: 32px; height: 32px; left: 0px; top: -3.79px; position: absolute">
        <div data-layer="span.profile-icon.system-icon.ng-tns-c2665823664-7.ng-star-inserted" class="SpanProfileIconSystemIconNgTnsC26658236647NgStarInserted" style="width: 32px; height: 32px; left: 0px; top: 0px; position: absolute; background: linear-gradient(93deg, #4F8CFF 0%, #010545 100%); border-radius: 6px"></div>
        <img data-layer="A-logo-removebg-preview 3" class="ALogoRemovebgPreview3" style="width: 30px; height: 22.11px; left: 2px; top: 4px; position: absolute" src="https://placehold.co/30x22" />
      </div>
    </div>
    <div data-layer="button.scroll-button.ng-tns-c3694970646-10.ng-trigger.ng-trigger-scrollButton.ng-star-inserted" class="ButtonScrollButtonNgTnsC369497064610NgTriggerNgTriggerScrollbuttonNgStarInserted" style="width: 28px; height: 28px; left: 469px; top: 618.20px; position: absolute; background: #000AA4; border-radius: 8px; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="i.fa-solid.fa-angles-down.ng-tns-c3694970646-10" class="IFaSolidFaAnglesDownNgTnsC369497064610" style="width: 14px; height: 16px; flex-direction: column; justify-content: center; align-items: center; display: inline-flex">
        <div data-layer="Frame" class="Frame" style="width: 12px; height: 13px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
          <div data-layer="Vector" class="Vector" style="width: 12px; height: 13px; position: relative; background: #EEEEEE"></div>
        </div>
      </div>
    </div>
  </div>
  <div data-layer="div.scroller.dmo-flex.dmo-flex-row.dmo-overflow-x-auto.ng-tns-c2709682700-15" class="DivScrollerDmoFlexDmoFlexRowDmoOverflowXAutoNgTnsC270968270015" style="width: 480px; height: 34.60px; left: 16px; top: 767px; position: absolute">
    <div data-layer="div.dmo-flex.dmo-flex-row.dmo-gap-8.ng-tns-c2709682700-15" class="DivDmoFlexDmoFlexRowDmoGap8NgTnsC270968270015" style="width: 1916.45px; height: 34.60px; left: 0px; top: 0px; position: absolute; justify-content: center; align-items: flex-start; gap: 8px; display: inline-flex">
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-16" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333016" style="width: 142.45px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Edit scenario" class="EditScenario" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Edit scenario</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-17" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333017" style="width: 162.24px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Create mapping" class="CreateMapping" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Create mapping</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-18" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333018" style="width: 134.79px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Create filter" class="CreateFilter" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Create filter</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-19" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333019" style="width: 142.34px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Create JSON" class="CreateJson" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Create JSON</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-20" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333020" style="width: 142.82px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Ask anything" class="AskAnything" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Ask anything</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-21" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333021" style="width: 150.79px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Write an Email" class="WriteAnEmail" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Write an Email</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-23" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333023" style="width: 192.80px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Map opened module" class="MapOpenedModule" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Map opened module</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-24" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333024" style="width: 145.49px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Explain result" class="ExplainResult" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Explain result</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-25" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333025" style="width: 202.09px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Describe the scenario" class="DescribeTheScenario" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Describe the scenario</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-26" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333026" style="width: 155.29px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Help with Error" class="HelpWithError" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Help with Error</div>
      </div>
      <div data-layer="button.dmo-flex.dmo-flex-row.ng-tns-c2321353330-27" class="ButtonDmoFlexDmoFlexRowNgTnsC232135333027" style="width: 265.36px; height: 34.60px; background: #FBFBFB; border-radius: 4px; border: 0.80px #ECECEC solid; justify-content: flex-start; align-items: center; display: inline-flex">
        <div data-layer="Generate HTTP based on CURL" class="GenerateHttpBasedOnCurl" style="position: relative; color: #333333; font-size: 14px; font-family: Inter; font-weight: 500; line-height: 21px; word-wrap: break-word">Generate HTTP based on CURL</div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-16" class="IFaRegularFaChevronDownNgTnsC232135333016" style="width: 14px; height: 14px; left: 111.65px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-17" class="IFaRegularFaChevronDownNgTnsC232135333017" style="width: 14px; height: 14px; left: 281.89px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-18" class="IFaRegularFaChevronDownNgTnsC232135333018" style="width: 14px; height: 14px; left: 424.68px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-19" class="IFaRegularFaChevronDownNgTnsC232135333019" style="width: 14px; height: 14px; left: 575.01px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-20" class="IFaRegularFaChevronDownNgTnsC232135333020" style="width: 14px; height: 14px; left: 725.84px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-21" class="IFaRegularFaChevronDownNgTnsC232135333021" style="width: 14px; height: 14px; left: 884.62px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-23" class="IFaRegularFaChevronDownNgTnsC232135333023" style="width: 14px; height: 14px; left: 1085.43px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-24" class="IFaRegularFaChevronDownNgTnsC232135333024" style="width: 14px; height: 14px; left: 1238.91px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-25" class="IFaRegularFaChevronDownNgTnsC232135333025" style="width: 14px; height: 14px; left: 1449px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-26" class="IFaRegularFaChevronDownNgTnsC232135333026" style="width: 14px; height: 14px; left: 1612.29px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-chevron-down.ng-tns-c2321353330-27" class="IFaRegularFaChevronDownNgTnsC232135333027" style="width: 14px; height: 14px; left: 1885.65px; top: 10px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="Frame" class="Frame" style="width: 11.81px; height: 6.56px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
        <div data-layer="Vector" class="Vector" style="width: 11.81px; height: 6.56px; position: relative; background: #333333"></div>
      </div>
    </div>
  </div>
  <div data-layer="i.fa-regular.fa-paper-plane-top.ng-tns-c663035203-11" class="IFaRegularFaPaperPlaneTopNgTnsC66303520311" style="width: 18px; height: 18px; left: 470px; top: 834.20px; position: absolute; justify-content: center; align-items: center; display: inline-flex">
    <div data-layer="Frame" class="Frame" style="width: 18px; height: 15.75px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
      <div data-layer="Vector" class="Vector" style="width: 18px; height: 15.75px; position: relative; background: #5D2AC6"></div>
    </div>
  </div>
  <div data-layer="span.form-control.searcher.input.ng-tns-c663035203-11.upload" class="SpanFormControlSearcherInputNgTnsC66303520311Upload" style="width: 480px; height: 41.60px; left: 16px; top: 822.40px; position: absolute; background: white; border-radius: 4px; overflow: hidden; border: 0.80px rgba(0, 0, 0, 0.15) solid; justify-content: flex-start; align-items: center; display: inline-flex">
    <div data-layer="Ask anything..." class="AskAnything" style="position: relative; color: #495057; font-size: 16px; font-family: Inter; font-weight: 400; line-height: 24px; word-wrap: break-word">Ask anything...</div>
  </div>
  <div data-layer="div.right-button.ng-tns-c2709682700-15.ng-trigger.ng-trigger-button.ng-star-inserted" class="DivRightButtonNgTnsC270968270015NgTriggerNgTriggerButtonNgStarInserted" style="width: 24px; height: 34.60px; left: 472px; top: 767px; position: absolute; background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, white 100%); flex-direction: column; justify-content: center; align-items: center; display: inline-flex">
    <div data-layer="button.ng-tns-c2709682700-15" class="ButtonNgTnsC270968270015" style="width: 20px; height: 20px; background: #000AA4; border-radius: 10px; justify-content: center; align-items: center; display: inline-flex">
      <div data-layer="i.fa-regular.fa-chevron-right.ng-tns-c2709682700-15" class="IFaRegularFaChevronRightNgTnsC270968270015" style="width: 6.25px; height: 10px; flex-direction: column; justify-content: center; align-items: center; display: inline-flex">
        <div data-layer="Frame" class="Frame" style="width: 4.69px; height: 8.44px; position: relative; flex-direction: column; justify-content: flex-start; align-items: flex-start; display: flex">
          <div data-layer="Vector" class="Vector" style="width: 4.69px; height: 8.44px; position: relative; background: white"></div>
        </div>
      </div>
    </div>
  </div>
</div>