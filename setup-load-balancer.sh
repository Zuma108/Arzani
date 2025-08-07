#!/bin/bash

# Application Load Balancer Setup for Custom Domain
# This creates a load balancer to handle custom domain mapping

PROJECT_ID="cool-mile-437217-s2"
REGION="europe-west2"
SERVICE_NAME="arzani-marketplace"
DOMAIN="arzani.co.uk"
STATIC_IP="34.120.202.47"

echo "🔧 Setting up Application Load Balancer for custom domain..."

# 1. Create a NEG (Network Endpoint Group) for the Cloud Run service
echo "📡 Creating Network Endpoint Group..."
gcloud compute network-endpoint-groups create arzani-marketplace-neg \
    --region=$REGION \
    --network-endpoint-type=serverless \
    --cloud-run-service=$SERVICE_NAME \
    --project=$PROJECT_ID

# 2. Create backend service
echo "🔗 Creating backend service..."
gcloud compute backend-services create arzani-marketplace-backend \
    --global \
    --project=$PROJECT_ID

# 3. Add the NEG to the backend service
echo "➕ Adding NEG to backend service..."
gcloud compute backend-services add-backend arzani-marketplace-backend \
    --global \
    --network-endpoint-group=arzani-marketplace-neg \
    --network-endpoint-group-region=$REGION \
    --project=$PROJECT_ID

# 4. Create URL map
echo "🗺️ Creating URL map..."
gcloud compute url-maps create arzani-marketplace-urlmap \
    --default-service=arzani-marketplace-backend \
    --global \
    --project=$PROJECT_ID

# 5. Create managed SSL certificate
echo "🔒 Creating managed SSL certificate..."
gcloud compute ssl-certificates create arzani-marketplace-ssl \
    --domains=$DOMAIN,www.$DOMAIN \
    --global \
    --project=$PROJECT_ID

# 6. Create HTTPS load balancer
echo "⚖️ Creating HTTPS load balancer..."
gcloud compute target-https-proxies create arzani-marketplace-https-proxy \
    --url-map=arzani-marketplace-urlmap \
    --ssl-certificates=arzani-marketplace-ssl \
    --global \
    --project=$PROJECT_ID

# 7. Create forwarding rule
echo "📨 Creating forwarding rule..."
gcloud compute forwarding-rules create arzani-marketplace-https-rule \
    --global \
    --target-https-proxy=arzani-marketplace-https-proxy \
    --address=arzani-marketplace-ip \
    --ports=443 \
    --project=$PROJECT_ID

# 8. Create HTTP to HTTPS redirect
echo "🔄 Creating HTTP to HTTPS redirect..."
gcloud compute url-maps create arzani-marketplace-http-redirect \
    --default-url-redirect-response-code=301 \
    --default-url-redirect-https-redirect \
    --global \
    --project=$PROJECT_ID

gcloud compute target-http-proxies create arzani-marketplace-http-proxy \
    --url-map=arzani-marketplace-http-redirect \
    --global \
    --project=$PROJECT_ID

gcloud compute forwarding-rules create arzani-marketplace-http-rule \
    --global \
    --target-http-proxy=arzani-marketplace-http-proxy \
    --address=arzani-marketplace-ip \
    --ports=80 \
    --project=$PROJECT_ID

echo "✅ Load balancer setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your DNS A record to point to: $STATIC_IP"
echo "2. Wait 15-30 minutes for SSL certificate provisioning"
echo "3. Your site will be available at https://$DOMAIN"
