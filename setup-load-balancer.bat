@echo off
REM Windows batch version of load balancer setup

echo 🔧 Setting up Application Load Balancer for custom domain...

REM Create Network Endpoint Group
echo 📡 Creating Network Endpoint Group...
gcloud compute network-endpoint-groups create arzani-marketplace-neg --region=europe-west2 --network-endpoint-type=serverless --cloud-run-service=arzani-marketplace --project=cool-mile-437217-s2

REM Create backend service
echo 🔗 Creating backend service...
gcloud compute backend-services create arzani-marketplace-backend --global --project=cool-mile-437217-s2

REM Add NEG to backend service
echo ➕ Adding NEG to backend service...
gcloud compute backend-services add-backend arzani-marketplace-backend --global --network-endpoint-group=arzani-marketplace-neg --network-endpoint-group-region=europe-west2 --project=cool-mile-437217-s2

REM Create URL map
echo 🗺️ Creating URL map...
gcloud compute url-maps create arzani-marketplace-urlmap --default-service=arzani-marketplace-backend --global --project=cool-mile-437217-s2

REM Create managed SSL certificate
echo 🔒 Creating managed SSL certificate...
gcloud compute ssl-certificates create arzani-marketplace-ssl --domains=arzani.co.uk,www.arzani.co.uk --global --project=cool-mile-437217-s2

REM Create HTTPS load balancer
echo ⚖️ Creating HTTPS load balancer...
gcloud compute target-https-proxies create arzani-marketplace-https-proxy --url-map=arzani-marketplace-urlmap --ssl-certificates=arzani-marketplace-ssl --global --project=cool-mile-437217-s2

REM Create forwarding rule
echo 📨 Creating forwarding rule...
gcloud compute forwarding-rules create arzani-marketplace-https-rule --global --target-https-proxy=arzani-marketplace-https-proxy --address=arzani-marketplace-ip --ports=443 --project=cool-mile-437217-s2

REM Create HTTP to HTTPS redirect
echo 🔄 Creating HTTP to HTTPS redirect...
gcloud compute url-maps create arzani-marketplace-http-redirect --default-url-redirect-response-code=301 --default-url-redirect-https-redirect --global --project=cool-mile-437217-s2

gcloud compute target-http-proxies create arzani-marketplace-http-proxy --url-map=arzani-marketplace-http-redirect --global --project=cool-mile-437217-s2

gcloud compute forwarding-rules create arzani-marketplace-http-rule --global --target-http-proxy=arzani-marketplace-http-proxy --address=arzani-marketplace-ip --ports=80 --project=cool-mile-437217-s2

echo ✅ Load balancer setup complete!
echo.
echo 📋 Next steps:
echo 1. Update your DNS A record to point to: 34.120.202.47
echo 2. Wait 15-30 minutes for SSL certificate provisioning
echo 3. Your site will be available at https://arzani.co.uk
