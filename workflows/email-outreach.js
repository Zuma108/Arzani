{
  "name": "Automated Email Outreach with Gemini Personalization",
  "nodes": [
    {
      "parameters": {
        "operation": "read",
        "sheetName": "Business Contacts",
        "range": "A:G",
        "options": {
          "headerRow": true,
          "includeRowNumbers": true
        }
      },
      "name": "Google Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 3,
      "position": [
        400,
        300
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "google-sheets-credentials",
          "name": "Google Sheets Account"
        }
      }
    },
    {
      "parameters": {
        "batchSize": 10,
        "options": {
          "reset": true
        }
      },
      "name": "SplitInBatches",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 2,
      "position": [
        600,
        300
      ]
    },
    {
      "parameters": {
        "content": "=\n// Extract the data from Google Sheets\nconst business = $node[\"SplitInBatches\"].json;\n\n// Get the required fields\nconst businessName = business.Name || \"there\";\nconst location = business.Address || \"your area\";\nconst emailAddress = business.Email;\nconst website = business.Website || \"\";\n\n// Generate a personalized email subject\nconst subject = `Free Valuation for ${businessName}?`;\n\n// Prepare data for Gemini personalization\nreturn {\n  json: {\n    businessName,\n    location,\n    emailAddress,\n    website,\n    subject,\n    tracking: business.Tracking || \"Not sent\",\n    rowId: business.row_number || 1\n  }\n};\n",
        "jsCode": "return items;"
      },
      "name": "PrepareData",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [
        800,
        300
      ]
    },
    {
      "parameters": {
        "authentication": "apiKey",
        "resource": "completion",
        "prompt": "=You are tasked with personalizing an email outreach for a business marketplace. Based on the business details below, write a personalized first paragraph that mentions something specific about the business or location. Keep it professional, friendly, and under 3 sentences.\n\nBusiness Name: {{$json[\"businessName\"]}}\nLocation: {{$json[\"location\"]}}\nWebsite: {{$json[\"website\"]}}\n\nThe email will continue with standard text about Arzani marketplace services.",
        "model": "gemini-1.5-flash",
        "temperature": 0.7,
        "options": {
          "maxOutputTokens": 150
        }
      },
      "name": "Gemini",
      "type": "n8n-nodes-base.googleAi",
      "typeVersion": 1,
      "position": [
        1000,
        300
      ],
      "credentials": {
        "googleAiApi": {
          "id": "google-ai-credentials",
          "name": "Google AI Account"
        }
      }
    },
    {
      "parameters": {
        "content": "=\nconst personalizedIntro = $node[\"Gemini\"].json.text.trim();\nconst data = $json;\n\n// Construct the full email body\nconst emailBody = `Hi ${data.businessName},\n\n${personalizedIntro}\n\nI'm Michael, the founder of Arzani, a new UK-based marketplace where genuine buyers and sellers connect to make real business deals happen quickly.\n\nAt Arzani, we've already secured serious buyers who are eager to make offers, and now we're looking to partner with verified sellers like you. As an agile startup, our lean and dedicated team is fully committed to providing personalized, hands-on support, ensuring that you're never just another listing, but a valued partner in our journey.\n\nHere's what sets us apart:\n• Speed: Get your business listed in minutes.\n• Transparency: Avoid overpriced brokers, drawn-out negotiations, and endless fees.\n• Personalized Support: We work closely with you to turn opportunities into real deals.\n\nI'd love to offer you a free valuation to show what your business could be worth in today's market. Would you be available for a brief 10-minute call this week? Simply reply with a convenient time, and we can set it up.\n\nBest regards,\nMichael\nArzani Marketplace`;\n\nreturn {\n  json: {\n    ...data,\n    emailBody\n  }\n};\n",
        "jsCode": "return items;"
      },
      "name": "CreateFullEmail",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [
        1200,
        300
      ]
    },
    {
      "parameters": {
        "fromEmail": "michael@arzani.com",
        "fromName": "Michael Arzani",
        "toEmail": "={{ $json.emailAddress }}",
        "subject": "={{ $json.subject }}",
        "text": "={{ $json.emailBody }}",
        "options": {
          "trackOpens": true,
          "trackClicks": true
        }
      },
      "name": "Send Email",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 1,
      "position": [
        1400,
        300
      ],
      "credentials": {
        "smtp": {
          "id": "smtp-credentials",
          "name": "SMTP Account"
        }
      }
    },
    {
      "parameters": {
        "operation": "update",
        "sheetName": "Business Contacts",
        "range": "={{ \"G\" + ($json.rowId + 1) }}",
        "options": {},
        "valueInputMode": "RAW",
        "valueRenderMode": "FORMATTED_VALUE",
        "dataMode": "autoMapInputData",
        "values": {
          "Tracking": "Email sent on {{ $now.format(\"YYYY-MM-DD HH:mm\") }}"
        }
      },
      "name": "Update Tracking",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 3,
      "position": [
        1600,
        300
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "google-sheets-credentials",
          "name": "Google Sheets Account"
        }
      }
    },
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "hours",
              "minutesInterval": 5
            }
          ]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [
        200,
        300
      ]
    },
    {
      "parameters": {
        "amount": 100,
        "unit": "seconds"
      },
      "name": "Wait",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1,
      "position": [
        1000,
        500
      ],
      "webhookId": "wait-node"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.tracking }}",
              "operation": "contains",
              "value2": "Not sent"
            }
          ]
        }
      },
      "name": "IF",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [
        800,
        500
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "resource": "message",
        "operation": "getAll",
        "returnAll": false,
        "limit": 10,
        "filters": {
          "q": "={{ \"from:\" + $json.emailAddress + \" after:\" + $now.minus({days: 7}).format(\"YYYY/MM/DD\") }}"
        },
        "options": {
          "returnTotalCount": true
        }
      },
      "name": "Gmail",
      "type": "n8n-nodes-base.gmail",
      "typeVersion": 1,
      "position": [
        1800,
        300
      ],
      "credentials": {
        "gmailOAuth2Api": {
          "id": "gmail-oauth2-credentials",
          "name": "Gmail Account"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{ $node[\"Gmail\"].json.messageCount || 0 }}",
              "operation": "larger",
              "value2": 0
            }
          ]
        }
      },
      "name": "Has Reply?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [
        2000,
        300
      ]
    },
    {
      "parameters": {
        "operation": "update",
        "sheetName": "Business Contacts",
        "range": "={{ \"G\" + ($json.rowId + 1) }}",
        "options": {},
        "valueInputMode": "RAW",
        "valueRenderMode": "FORMATTED_VALUE",
        "dataMode": "autoMapInputData",
        "values": {
          "Tracking": "Replied on {{ $now.format(\"YYYY-MM-DD HH:mm\") }}"
        }
      },
      "name": "Mark as Replied",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 3,
      "position": [
        2200,
        200
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "google-sheets-credentials",
          "name": "Google Sheets Account"
        }
      }
    }
  ],
  "connections": {
    "Google Sheets": {
      "main": [
        [
          {
            "node": "SplitInBatches",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "SplitInBatches": {
      "main": [
        [
          {
            "node": "PrepareData",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "PrepareData": {
      "main": [
        [
          {
            "node": "IF",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Gemini": {
      "main": [
        [
          {
            "node": "CreateFullEmail",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "CreateFullEmail": {
      "main": [
        [
          {
            "node": "Send Email",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send Email": {
      "main": [
        [
          {
            "node": "Update Tracking",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Update Tracking": {
      "main": [
        [
          {
            "node": "Gmail",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Google Sheets",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Wait": {
      "main": [
        [
          {
            "node": "Gemini",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "IF": {
      "main": [
        [
          {
            "node": "Gemini",
            "type": "main",
            "index": 0
          }
        ],
        []
      ]
    },
    "Gmail": {
      "main": [
        [
          {
            "node": "Has Reply?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Has Reply?": {
      "main": [
        [
          {
            "node": "Mark as Replied",
            "type": "main",
            "index": 0
          }
        ],
        []
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "callerPolicy": "workflowsFromSameOwner",
    "errorWorkflow": "",
    "saveDataErrorExecution": "all",
    "saveDataSuccessExecution": "all",
    "saveExecutionProgress": true,
    "timezone": "Europe/London"
  },
  "id": "email-outreach-workflow",
  "tags": [
    {
      "name": "email",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    },
    {
      "name": "outreach",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z",
  "meta": {
    "instanceId": "instance-id-123"
  }
}
