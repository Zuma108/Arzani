**Product Requirement Document (PRD) for Marketplace Chatbot**

## **1. Overview**
The AI-powered chatbot will be integrated into the marketplace website to assist users in buying and selling businesses. It will offer a structured chat experience similar to the Make.com AI Assistant, including popups, clickable elements, and a token-based system for limiting interactions.

## **2. Objectives**
- Provide an interactive chatbot that guides users through the business buying/selling process.
- Offer structured prompts, clickable actions, and popups for enhanced usability.
- Integrate real-time database access for fetching relevant listings and user data.
- Implement a token-based system to limit interactions and encourage premium usage.

## **3. Core Features**
### **3.1 UI/UX Design**
- Chat interface replicating the Make.com AI Assistant layout.
- Clickable popups with action buttons (e.g., "Find Businesses," "List My Business," "Schedule Meeting").
- Clear message display, allowing structured conversations.
- Option to display chatbot messages in a collapsible window.
- Dark/light mode support for user accessibility.

### **3.2 Business Discovery & Listings**
- Users can ask about available businesses for sale.
- The chatbot will retrieve business listings based on criteria (location, price, industry, etc.).
- Clickable options to filter results (e.g., "Show only profitable businesses," "Show franchises").

### **3.3 Seller Assistance**
- Guide sellers through the business listing process.
- Allow sellers to input details (business type, asking price, description, financials) via structured chat prompts.
- Provide tips on increasing business valuation and visibility.

### **3.4 Automated Business Valuation**
- Integration with the Business Valuation Tool.
- Users can enter financial details, and the chatbot provides an estimated valuation.
- Clickable "Learn More" button for deeper insights.

### **3.5 Lead Collection & Interaction Management**
- Capture contact details of interested buyers and sellers.
- Automated follow-ups via email/SMS notifications.
- Schedule meetings between buyers and sellers within the chatbot interface.

### **3.6 Token-Based Usage System**
- Users are given a set number of free interactions per day.
- Paid users can purchase additional tokens to unlock more responses.
- Display remaining tokens in the chat interface (e.g., "You have 10 interactions left").
- API-based authentication to track token usage per user.

### **3.7 Integration with Database & Automations**
- Connect with the marketplace database to fetch real-time listings.
- Save user queries for personalized recommendations.
- Use automation (e.g., webhooks, API requests) to handle follow-ups, inquiries, and scheduled meetings.

### **3.8 Voice Integration (Optional)**
- Users can interact with the chatbot via voice commands.
- AI-powered voice processing for seamless interactions.
- Option to switch between text and voice mode.

## **4. Technology Stack**
- **Front-End:** React.js (or existing marketplace tech stack)
- **Back-End:** Node.js with PostgreSQL for database management
- **AI Model:** GPT-4 API for NLP
- **Integration:** Webhooks, API connections for Make.com workflows
- **Authentication:** Token-based system to limit chatbot usage

## **5. Deployment & Maintenance**
- **Phase 1:** Prototype chatbot with basic query handling and UI elements.
- **Phase 2:** Integrate business listing retrieval, valuation tool, and lead collection.
- **Phase 3:** Implement token-based system and automation workflows.
- **Ongoing Maintenance:** Regular updates, monitoring chatbot interactions, and improving response quality based on analytics.

## **6. Success Metrics**
- Increase in user engagement (measured by chatbot interactions per session).
- Reduction in manual support requests by automating FAQs.
- Higher conversion rates for business sales through chatbot-assisted lead collection.
- User adoption of token-based premium features.

## **7. Next Steps**
- Finalize UI/UX mockups.
- Develop API integrations for business listings and valuation tool.
- Set up token-tracking and payment system.
- Conduct user testing before full-scale deployment.

---
This PRD serves as a guideline for developing a chatbot with an interactive, structured experience, designed to help users navigate your marketplace efficiently.

## **8. Figma**
<div data-layer="div.frame.ng-tns-c168265695-8.ng-trigger.ng-trigger-toggle.ng-star-inserted.overlay" class="DivFrameNgTnsC1682656958NgTriggerNgTriggerToggleNgStarInsertedOverlay" style="width: 512px; height: 649.40px; position: relative; background: rgba(255, 255, 255, 0.01); box-shadow: -10px 0px 40px rgba(0, 0, 0, 0.06); overflow: hidden; border-radius: 8px">
  <div data-layer="div.copilot-header.d-flex.align-items-center.justify-content-between.px-3.ng-tns-c168265695-8" class="DivCopilotHeaderDFlexAlignItemsCenterJustifyContentBetweenPx3NgTnsC1682656958" style="width: 512px; height: 40px; left: 0px; top: 0px; position: absolute; background: #000AA4">
    <div data-layer="span.ng-tns-c168265695-8" class="SpanNgTnsC1682656958" style="width: 136.82px; height: 24px; left: 16px; top: 8px; position: absolute">
      <div data-layer="AI Assistant" class="AiAssistant" style="left: 0px; top: 0px; position: absolute; color: white; font-size: 16px; font-family: Inter; font-weight: 400; line-height: 24px; word-wrap: break-word">AI Assistant </div>
      <div data-layer="span.version-badge.ng-tns-c168265695-8.ng-star-inserted" class="SpanVersionBadgeNgTnsC1682656958NgStarInserted" style="width: 43.25px; height: 19.60px; left: 93.58px; top: 3.39px; position: absolute; border-radius: 3px; outline: 0.80px #E8E8E8 solid; outline-offset: -0.80px">
        <div data-layer="BETA" class="Beta" style="left: 8.80px; top: 3.75px; position: absolute; color: white; font-size: 10px; font-family: Inter; font-weight: 600; line-height: 12.10px; word-wrap: break-word">BETA</div>
      </div>
    </div>
    <div data-layer="i.fa-regular.fa-xmark.ng-tns-c168265695-8" class="IFaRegularFaXmarkNgTnsC1682656958" style="width: 12px; height: 16px; left: 484px; top: 12px; position: absolute">
      <div data-layer="Frame" class="Frame" style="width: 10px; height: 10px; left: 1px; top: 2.60px; position: absolute; overflow: hidden">
        <div data-layer="Vector" class="Vector" style="width: 10px; height: 10px; left: 0px; top: 0px; position: absolute; background: white"></div>
      </div>
    </div>
  </div>
  <div data-layer="div.chat-container.ng-tns-c3694970646-10" class="DivChatContainerNgTnsC369497064610" style="width: 512px; height: 609.40px; left: 0px; top: 40px; position: absolute; background: white; border-bottom-right-radius: 8px; border-bottom-left-radius: 8px">
    <div data-layer="button.clear-chat-button.mx-auto.ng-tns-c3694970646-10" class="ButtonClearChatButtonMxAutoNgTnsC369497064610" style="width: 97.99px; height: 28.80px; left: 207px; top: 493px; position: absolute; background: white; box-shadow: 0px 6px 16px rgba(217, 202, 255, 0.10); border-radius: 4px; outline: 0.80px #E4E4E4 solid; outline-offset: -0.80px">
      <div data-layer="i.fa-regular.fa-trash-can-xmark.ng-tns-c3694970646-10" class="IFaRegularFaTrashCanXmarkNgTnsC369497064610" style="width: 10.50px; height: 12px; left: 12.80px; top: 8.40px; position: absolute">
        <div data-layer="Frame" class="Frame" style="width: 10.50px; height: 12px; left: 0px; top: 0px; position: absolute; overflow: hidden">
          <div data-layer="Vector" class="Vector" style="width: 10.50px; height: 12px; left: 0px; top: 0px; position: absolute; background: black"></div>
        </div>
      </div>
      <div data-layer="Clear chat" class="ClearChat" style="left: 23.30px; top: 6.80px; position: absolute; color: black; font-size: 12px; font-family: Inter; font-weight: 500; word-wrap: break-word"> Clear chat</div>
    </div>
    <div data-layer="i.fa-regular.fa-paperclip.ng-tns-c663035203-11" class="IFaRegularFaPaperclipNgTnsC66303520311" style="width: 15.75px; height: 18px; left: 24px; top: 543.60px; position: absolute">
      <div data-layer="Frame" class="Frame" style="width: 15.29px; height: 17.54px; left: 0.28px; top: -0.37px; position: absolute; overflow: hidden">
        <div data-layer="Vector" class="Vector" style="width: 15.29px; height: 17.54px; left: 0px; top: 0px; position: absolute; background: #979DA5"></div>
      </div>
    </div>
    <div data-layer="div.dmo-flex.dmo-justify-center.dmo-items-center.dmo-mb-8.credits.dmo-mx-16.ng-tns-c3694970646-10.ng-star-inserted" class="DivDmoFlexDmoJustifyCenterDmoItemsCenterDmoMb8CreditsDmoMx16NgTnsC369497064610NgStarInserted" style="width: 480px; height: 20px; left: 16px; top: 581.40px; position: absolute">
      <div data-layer="i.fa-regular.fa-circle-star.ng-tns-c3694970646-10" class="IFaRegularFaCircleStarNgTnsC369497064610" style="width: 12px; height: 12px; left: 20.72px; top: 4px; position: absolute">
        <div data-layer="Frame" class="Frame" style="width: 12px; height: 12px; left: 0px; top: 0px; position: absolute; overflow: hidden">
          <div data-layer="Vector" class="Vector" style="width: 12px; height: 12px; left: 0px; top: 0px; position: absolute; background: #000AA4"></div>
        </div>
      </div>
      <div data-layer="p" class="P" style="width: 420.54px; height: 20px; left: 38.72px; top: 0px; position: absolute">
        <div data-layer="Remaining:" class="Remaining" style="left: 0px; top: 0px; position: absolute; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Remaining: </div>
        <div data-layer="30" style="left: 65.99px; top: 0px; position: absolute; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">30</div>
        <div data-layer="of" class="Of" style="left: 81.84px; top: 0px; position: absolute; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word"> of </div>
        <div data-layer="30" style="left: 100.22px; top: 0px; position: absolute; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 700; line-height: 20px; word-wrap: break-word">30</div>
        <div data-layer="credits. Credits reset every 7 days." class="CreditsCreditsResetEvery7Days" style="left: 116.08px; top: 0px; position: absolute; color: #3B3B3B; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word"> credits. Credits reset every 7 days. </div>
        <div data-layer="Upgrade for more" class="UpgradeForMore" style="left: 319.72px; top: 0px; position: absolute; color: #000AA4; font-size: 12px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Upgrade for more</div>
      </div>
    </div>
  </div>
  <div data-layer="div.messages-scroll.dmo-px-16.ng-tns-c3694970646-10" class="DivMessagesScrollDmoPx16NgTnsC369497064610" style="width: 512px; height: 477px; left: 0px; top: 40px; position: absolute; overflow: hidden">
    <div data-layer="div.dmo-mt-16.ng-tns-c2665823664-13.ng-trigger.ng-trigger-messageContainerAppear.system-message" class="DivDmoMt16NgTnsC266582366413NgTriggerNgTriggerMessagecontainerappearSystemMessage" style="width: 480px; height: 110px; left: 16px; top: 366px; position: absolute">
      <div data-layer="Welcome Michael Adekoya! I'm here to help you create powerful scenarios and automate your workflows. Whether you need assistance generating a new scenario, crafting content, or exploring example scenarios to get started, I'm ready to assist. How can I help you today?" class="WelcomeMichaelAdekoyaIMHereToHelpYouCreatePowerfulScenariosAndAutomateYourWorkflowsWhetherYouNeedAssistanceGeneratingANewScenarioCraftingContentOrExploringExampleScenariosToGetStartedIMReadyToAssistHowCanIHelpYouToday" style="width: 424px; left: 48px; top: 3.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Welcome Michael Adekoya! I'm here to help you create powerful scenarios and automate your workflows. Whether you need assistance generating a new scenario, crafting content, or exploring example scenarios to get started, I'm ready to assist. How can I help you today?</div>
      <div data-layer="span.profile-icon.system-icon.ng-tns-c2665823664-7.ng-star-inserted" class="SpanProfileIconSystemIconNgTnsC26658236647NgStarInserted" style="width: 32px; height: 32px; left: 0px; top: -6px; position: absolute; background: linear-gradient(93deg, #4F8CFF 0%, #010545 100%); border-radius: 6px"></div>
      <img data-layer="A-logo-removebg-preview 3" class="ALogoRemovebgPreview3" style="width: 30px; height: 22.11px; left: 2px; top: -2px; position: absolute" src="https://placehold.co/30x22" />
    </div>
    <div data-layer="div.dmo-mt-16.ng-tns-c2665823664-12.ng-trigger.ng-trigger-messageContainerAppear.system-message" class="DivDmoMt16NgTnsC266582366412NgTriggerNgTriggerMessagecontainerappearSystemMessage" style="width: 480px; height: 334px; left: 16px; top: 16px; position: absolute">
      <div data-layer="div.message-content.ng-tns-c2665823664-12" class="DivMessageContentNgTnsC266582366412" style="width: 440px; height: 334px; left: 40px; top: 0px; position: absolute">
        <div data-layer="Welcome Michael Adekoya! I have noticed you have an error in your scenario. You can ask me to help you to solve." class="WelcomeMichaelAdekoyaIHaveNoticedYouHaveAnErrorInYourScenarioYouCanAskMeToHelpYouToSolve" style="width: 424px; left: 8px; top: 3.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 20px; word-wrap: break-word">Welcome Michael Adekoya! I have noticed you have an error in your scenario. You can ask me to help you to solve.</div>
        <div data-layer="div.mt-3.d-flex.flex-wrap.dmo-gap-8.ng-tns-c2665823664-12.ng-star-inserted" class="DivMt3DFlexFlexWrapDmoGap8NgTnsC266582366412NgStarInserted" style="width: 424px; height: 268px; left: 8px; top: 58px; position: absolute">
          <div data-layer="button.action-tile" class="ButtonActionTile" style="width: 194px; height: 84px; left: 0px; top: 0px; position: absolute; background: #FBFBFB; border-radius: 4px; outline: 0.80px #ECECEC solid; outline-offset: -0.80px">
            <div data-layer="i.fa-regular.fa-share-nodes" class="IFaRegularFaShareNodes" style="width: 12.25px; height: 14px; left: 16.80px; top: 35px; position: absolute">
              <div data-layer="Frame" class="Frame" style="width: 12.25px; height: 12.25px; left: 0px; top: 0.68px; position: absolute; overflow: hidden">
                <div data-layer="Vector" class="Vector" style="width: 12.25px; height: 12.26px; left: 0px; top: 0px; position: absolute; background: black"></div>
              </div>
            </div>
          </div>
          <div data-layer="button.action-tile" class="ButtonActionTile" style="width: 194px; height: 84px; left: 202px; top: 0px; position: absolute; background: #FBFBFB; border-radius: 4px; outline: 0.80px #ECECEC solid; outline-offset: -0.80px">
            <div data-layer="i.fa-regular.fa-puzzle-piece" class="IFaRegularFaPuzzlePiece" style="width: 14px; height: 14px; left: 16.80px; top: 35px; position: absolute">
              <div data-layer="Frame" class="Frame" style="width: 14px; height: 14px; left: 0px; top: -0.20px; position: absolute; overflow: hidden">
                <div data-layer="Vector" class="Vector" style="width: 14px; height: 14px; left: 0px; top: 0px; position: absolute; background: black"></div>
              </div>
            </div>
          </div>
          <div data-layer="button.action-tile" class="ButtonActionTile" style="width: 194px; height: 84px; left: 0px; top: 92px; position: absolute; background: #FBFBFB; border-radius: 4px; outline: 0.80px #ECECEC solid; outline-offset: -0.80px">
            <div data-layer="i.fa-regular.fa-circle-question" class="IFaRegularFaCircleQuestion" style="width: 14px; height: 14px; left: 16.80px; top: 35px; position: absolute">
              <div data-layer="Frame" class="Frame" style="width: 14px; height: 14px; left: 0px; top: -0.20px; position: absolute; overflow: hidden">
                <div data-layer="Vector" class="Vector" style="width: 14px; height: 14px; left: 0px; top: 0px; position: absolute; background: black"></div>
              </div>
            </div>
          </div>
          <div data-layer="button.action-tile" class="ButtonActionTile" style="width: 194px; height: 84px; left: 202px; top: 92px; position: absolute; background: #FBFBFB; border-radius: 4px; outline: 0.80px #ECECEC solid; outline-offset: -0.80px">
            <div data-layer="i.fa-regular.fa-brackets-curly" class="IFaRegularFaBracketsCurly" style="width: 15.75px; height: 14px; left: 16.80px; top: 35px; position: absolute">
              <div data-layer="Frame" class="Frame" style="width: 15.75px; height: 12.25px; left: 0px; top: 0.68px; position: absolute; overflow: hidden">
                <div data-layer="Vector" class="Vector" style="width: 15.75px; height: 12.26px; left: 0px; top: 0px; position: absolute; background: black"></div>
              </div>
            </div>
          </div>
          <div data-layer="button.action-tile" class="ButtonActionTile" style="width: 194px; height: 84px; left: 0px; top: 184px; position: absolute; background: #FBFBFB; border-radius: 4px; outline: 0.80px #ECECEC solid; outline-offset: -0.80px">
            <div data-layer="i.fa-regular.fa-bug-slash" class="IFaRegularFaBugSlash" style="width: 17.50px; height: 14px; left: 16.80px; top: 35px; position: absolute">
              <div data-layer="Frame" class="Frame" style="width: 17.37px; height: 14.01px; left: 0.14px; top: -0.20px; position: absolute; overflow: hidden">
                <div data-layer="Vector" class="Vector" style="width: 17.50px; height: 14px; left: -0.14px; top: 0px; position: absolute; background: black"></div>
              </div>
            </div>
          </div>
          <div data-layer="button.action-tile" class="ButtonActionTile" style="width: 194px; height: 84px; left: 202px; top: 184px; position: absolute; background: #FBFBFB; border-radius: 4px; outline: 0.80px #ECECEC solid; outline-offset: -0.80px">
            <div data-layer="i.fa-regular.fa-share-nodes" class="IFaRegularFaShareNodes" style="width: 12.25px; height: 14px; left: 16.80px; top: 35px; position: absolute">
              <div data-layer="Frame" class="Frame" style="width: 12.25px; height: 12.25px; left: 0px; top: 0.68px; position: absolute; overflow: hidden">
                <div data-layer="Vector" class="Vector" style="width: 12.25px; height: 12.26px; left: 0px; top: 0px; position: absolute; background: black"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div data-layer="span.profile-icon.system-icon.ng-tns-c2665823664-7.ng-star-inserted" class="SpanProfileIconSystemIconNgTnsC26658236647NgStarInserted" style="width: 32px; height: 32px; left: 0px; top: -4px; position: absolute; background: linear-gradient(93deg, #4F8CFF 0%, #010545 100%); border-radius: 6px"></div>
      <img data-layer="A-logo-removebg-preview 3" class="ALogoRemovebgPreview3" style="width: 30px; height: 22.11px; left: 2px; top: 0px; position: absolute" src="https://placehold.co/30x22" />
      <div data-layer="span.profile-icon.system-icon.ng-tns-c2665823664-7.ng-star-inserted" class="SpanProfileIconSystemIconNgTnsC26658236647NgStarInserted" style="width: 32px; height: 32px; left: 0px; top: -4px; position: absolute; background: linear-gradient(93deg, #4F8CFF 0%, #010545 100%); border-radius: 6px"></div>
      <img data-layer="A-logo-removebg-preview 3" class="ALogoRemovebgPreview3" style="width: 30px; height: 22.11px; left: 2px; top: 0px; position: absolute" src="https://placehold.co/30x22" />
    </div>
    <div data-layer="div.dmo-text-left.dmo-overflow-hidden.dmo-pl-12" class="DivDmoTextLeftDmoOverflowHiddenDmoPl12" style="width: 148.15px; height: 60px; left: 93.05px; top: 86px; position: absolute; overflow: hidden">
      <div data-layer="Build scenario" class="BuildScenario" style="left: 12px; top: 0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 600; line-height: 20px; word-wrap: break-word">Build scenario</div>
      <div data-layer="p" class="P" style="width: 136.15px; height: 36px; left: 12px; top: 24px; position: absolute; overflow: hidden">
        <div data-layer="How do I fix this error?" class="HowDoIFixThisError" style="width: 136.15px; left: 0px; top: 0px; position: absolute; color: #999999; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 18px; word-wrap: break-word">How do I fix this error?</div>
      </div>
    </div>
    <div data-layer="div.dmo-text-left.dmo-overflow-hidden.dmo-pl-12" class="DivDmoTextLeftDmoOverflowHiddenDmoPl12" style="width: 146.40px; height: 60px; left: 296.80px; top: 86px; position: absolute; overflow: hidden">
      <div data-layer="Find templates" class="FindTemplates" style="left: 12px; top: 0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 600; line-height: 20px; word-wrap: break-word">Find templates</div>
      <div data-layer="p" class="P" style="width: 134.40px; height: 36px; left: 12px; top: 24px; position: absolute; overflow: hidden">
        <div data-layer="What templates are there with [[app]] and [[app]]" class="WhatTemplatesAreThereWithAppAndApp" style="width: 134.40px; left: 0px; top: 0px; position: absolute; color: #999999; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 18px; word-wrap: break-word">What templates are there with [[app]] and [[app]]</div>
      </div>
    </div>
    <div data-layer="div.dmo-text-left.dmo-overflow-hidden.dmo-pl-12" class="DivDmoTextLeftDmoOverflowHiddenDmoPl12" style="width: 130.99px; height: 42px; left: 94.80px; top: 187px; position: absolute; overflow: hidden">
      <div data-layer="Ask anything" class="AskAnything" style="left: 12px; top: 0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 600; line-height: 20px; word-wrap: break-word">Ask anything</div>
      <div data-layer="p" class="P" style="width: 118.99px; height: 18px; left: 12px; top: 24px; position: absolute; overflow: hidden">
        <div data-layer="What can you do?" class="WhatCanYouDo" style="left: 0px; top: -0.60px; position: absolute; color: #999999; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 18px; word-wrap: break-word">What can you do?</div>
      </div>
    </div>
    <div data-layer="div.dmo-text-left.dmo-overflow-hidden.dmo-pl-12" class="DivDmoTextLeftDmoOverflowHiddenDmoPl12" style="width: 144.65px; height: 60px; left: 298.55px; top: 178px; position: absolute; overflow: hidden">
      <div data-layer="Create JSON" class="CreateJson" style="left: 12px; top: 0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 600; line-height: 20px; word-wrap: break-word">Create JSON</div>
      <div data-layer="p" class="P" style="width: 132.65px; height: 36px; left: 12px; top: 24px; position: absolute; overflow: hidden">
        <div data-layer="Create a JSON with a list of 5 largest European countries, their population numbers, and capital cities." class="CreateAJsonWithAListOf5LargestEuropeanCountriesTheirPopulationNumbersAndCapitalCities" style="width: 132.65px; left: 0px; top: 0px; position: absolute; color: #999999; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 18px; word-wrap: break-word">Create a JSON with a list of 5 largest European countries, their population numbers, and capital cities.</div>
      </div>
    </div>
    <div data-layer="div.dmo-text-left.dmo-overflow-hidden.dmo-pl-12" class="DivDmoTextLeftDmoOverflowHiddenDmoPl12" style="width: 142.90px; height: 60px; left: 98.30px; top: 270px; position: absolute; overflow: hidden">
      <div data-layer="Help with Error" class="HelpWithError" style="left: 12px; top: 0px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 600; line-height: 20px; word-wrap: break-word">Help with Error</div>
      <div data-layer="p" class="P" style="width: 130.90px; height: 36px; left: 12px; top: 24px; position: absolute; overflow: hidden">
        <div data-layer="Why did I get this error?" class="WhyDidIGetThisError" style="width: 130.90px; left: 0px; top: 0px; position: absolute; color: #999999; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 18px; word-wrap: break-word">Why did I get this error?</div>
      </div>
    </div>
    <div data-layer="div.dmo-text-left.dmo-overflow-hidden.dmo-pl-12" class="DivDmoTextLeftDmoOverflowHiddenDmoPl12" style="width: 148.15px; height: 62px; left: 295.05px; top: 269px; position: absolute; overflow: hidden">
      <div data-layer="Generate HTTP based on CURL" class="GenerateHttpBasedOnCurl" style="width: 136.15px; left: 12px; top: 1.60px; position: absolute; color: black; font-size: 14px; font-family: Inter; font-weight: 600; line-height: 20px; word-wrap: break-word">Generate HTTP based on CURL</div>
      <div data-layer="p" class="P" style="width: 136.15px; height: 18px; left: 12px; top: 44px; position: absolute; overflow: hidden">
        <div data-layer="Create a custom HTTP request based on the specified CURL: curl -X POST https://jsonplaceholder.typicode.com/users -H "Content-Type: application/json" -d '{ "name": "John Doe", "username": "johndoe", "email": "johndoe@example.com" }'." class="CreateACustomHttpRequestBasedOnTheSpecifiedCurlCurlXPostHttpsJsonplaceholderTypicodeComUsersHContentTypeApplicationJsonDNameJohnDoeUsernameJohndoeEmailJohndoeExampleCom" style="width: 143.14px; height: 18px; left: 0px; top: 0px; position: absolute; color: #999999; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 18px; word-wrap: break-word">Create a custom HTTP request based on the specified CURL: curl -X POST https://jsonplaceholder.typicode.com/users -H "Content-Type: application/json" -d '{ "name": "John Doe", "username": "johndoe", "email": "johndoe@example.com" }'.</div>
      </div>
    </div>
  </div>
  <div data-layer="i.fa-regular.fa-paper-plane-top.ng-tns-c663035203-11" class="IFaRegularFaPaperPlaneTopNgTnsC66303520311" style="width: 18px; height: 18px; left: 470px; top: 583.60px; position: absolute">
    <div data-layer="Frame" class="Frame" style="width: 18px; height: 15.75px; left: 0px; top: 0.52px; position: absolute; overflow: hidden">
      <div data-layer="Vector" class="Vector" style="width: 18px; height: 15.75px; left: 0px; top: 0px; position: absolute; background: #5D2AC6"></div>
    </div>
  </div>
  <div data-layer="span.form-control.searcher.input.ng-tns-c663035203-11.upload" class="SpanFormControlSearcherInputNgTnsC66303520311Upload" style="width: 480px; height: 41.60px; left: 16px; top: 571.80px; position: absolute; background: white; border-radius: 4px; border: 0.80px rgba(0, 0, 0, 0.15) solid"></div>
</div>


<div data-layer="div.ai-button-container.ng-tns-c168265695-8.no-overlay.ng-star-inserted" class="DivAiButtonContainerNgTnsC1682656958NoOverlayNgStarInserted" style="width: 174.16px; height: 40px; position: relative">
  <div data-layer="div#cu-76862-76862.candu-document.candu-div" class="DivCu7686276862CanduDocumentCanduDiv" style="width: 48px; height: 40px; left: 0px; top: 0px; position: absolute; overflow: hidden; border-radius: 2px">
    <div data-layer="div#cu-76862-LPGeeV3Op.variant-base.candu-card.variant-qhtyyu" class="DivCu76862Lpgeev3opVariantBaseCanduCardVariantQhtyyu" style="width: 40px; height: 40px; left: 0px; top: 0px; position: absolute; background: #000AA4; box-shadow: 0px 0px 0px #F6F6F6; overflow: hidden; border-radius: 46px">
      <img data-layer="img#cu-76862-GCz85BN1fS.candu-img.candu-img-button" class="ImgCu76862Gcz85bn1fsCanduImgCanduImgButton" style="width: 20px; height: 20px; left: 10px; top: 10px; position: absolute" src="https://placehold.co/20x20" />
    </div>
  </div>
  <div data-layer="button.ng-tns-c168265695-8.no-overlay.active" class="ButtonNgTnsC1682656958NoOverlayActive" style="width: 126.16px; height: 40px; left: 48px; top: 0px; position: absolute; background: #000AA4; border-radius: 28px; outline: 1.60px #949AFE solid; outline-offset: -1.60px">
    <div data-layer="AI" class="Ai" style="left: 17.60px; top: 10.23px; position: absolute; color: white; font-size: 16px; font-family: Inter; font-weight: 500; line-height: 19.36px; word-wrap: break-word">AI</div>
    <div data-layer="i.fa-regular.fa-sparkles.ng-tns-c168265695-8" class="IFaRegularFaSparklesNgTnsC1682656958" style="width: 16px; height: 16px; left: 41.31px; top: 12px; position: absolute">
      <div data-layer="Frame" class="Frame" style="width: 16px; height: 16px; left: 0px; top: -0.40px; position: absolute; overflow: hidden">
        <div data-layer="Vector" class="Vector" style="width: 16px; height: 16px; left: 0px; top: 0px; position: absolute; background: white"></div>
      </div>
    </div>
    <div data-layer="span.ml-2.version-badge.ng-tns-c168265695-8.ng-star-inserted" class="SpanMl2VersionBadgeNgTnsC1682656958NgStarInserted" style="width: 43.25px; height: 19.70px; left: 65.31px; top: 10.15px; position: absolute; border-radius: 3px; outline: 0.80px #E8E8E8 solid; outline-offset: -0.80px">
      <div data-layer="BETA" class="Beta" style="left: 8.80px; top: 3.75px; position: absolute; color: white; font-size: 10px; font-family: Inter; font-weight: 600; line-height: 12.10px; word-wrap: break-word">BETA</div>
    </div>
  </div>
</div>