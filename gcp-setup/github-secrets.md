# GitHub Secrets Configuration

Add these secrets to your GitHub repository:
Settings > Secrets and variables > Actions > New repository secret

## Required Secrets:

**GCP_PROJECT_ID:** `cool-mile-437217-s2`

**GCP_SERVICE_ACCOUNT_KEY:** [Contents of ./gcp-setup/service-account-key.json]

**DB_PASSWORD:** `Olumide123!`

**JWT_SECRET:** `your-secure-secret-key-here123321123`

**STRIPE_SECRET_KEY:** `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`

**OPENAI_API_KEY:** `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`

**GOOGLE_CLIENT_SECRET:** `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`

**MICROSOFT_CLIENT_SECRET:** `61a8f2d6-536a-4ab5-8696-c7615069e969`

**LINKEDIN_CLIENT_SECRET:** `WPL_AP1.lL2mX3HLmQUX613n.YAm+kA==`

**SENDINBLUE_API_KEY:** `xsmtpsib-3af4dca6e0bd90e0847af0d293a41e83daf8744ffa3f83177648d25186c86cfa-bRw2TBSH98ahd3QI`

**SENDGRID_API_KEY:** `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`

**PINECONE_API_KEY:** `pcsk_Mzkwr_GNak2mQVo7B3VzAYrjun3u1SAdVgj7jDuvU3S8A5X53P686hJiKs3eDNAyzcAoL`

**GOOGLE_MAPS_API_KEY:** `AIzaSyAiXB7IfXOuEAFfB4aTOAClFDntMYLKfZ4`

**GEMINI_API_KEY:** `AIzaSyDXaVCTbHG4APgV5_1PELDjgK8FnhzemBs`

**BRAVE_API_KEY:** `BSAORmdCbfF7eB7a4pgDH8UYZw-94jZ`

## Service Account Key:
Copy the entire contents of `./gcp-setup/service-account-key.json` into the GCP_SERVICE_ACCOUNT_KEY secret.

## Database Connection:
Your Cloud SQL PostgreSQL 17 instance connection string:
```
postgresql://marketplace_user:Olumide123!@localhost:5432/arzani_marketplace?host=/cloudsql/cool-mile-437217-s2:europe-west2:arzani-marketplace-db-v17
```

**Instance Details:**
- **Version**: PostgreSQL 17 (latest)
- **Machine Type**: db-custom-1-3840 (1 vCPU, 3.75 GB RAM)
- **Storage**: 20GB SSD with auto-increase up to 100GB
- **Region**: europe-west2
- **Public IP**: 35.246.120.109
- **Estimated Cost**: ~$12-15/month

## Next Steps:
1. Add all secrets to GitHub repository
2. Push code to trigger deployment  
3. Check Cloud Run console for deployment status
4. Configure custom domain if needed

## Useful Commands:
```bash
# View logs
gcloud run services logs read arzani-marketplace --region=europe-west2

# Update service
gcloud run services update arzani-marketplace --region=europe-west2

# Delete service
gcloud run services delete arzani-marketplace --region=europe-west2
```

## Useful Links:
- Cloud Run Console: https://console.cloud.google.com/run
- Cloud SQL Console: https://console.cloud.google.com/sql
- Artifact Registry: https://console.cloud.google.com/artifacts
