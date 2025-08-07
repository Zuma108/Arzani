# URGENT: DNS Fix Required for www.arzani.co.uk

## The Problem
- **arzani.co.uk** works perfectly ✅
- **www.arzani.co.uk** shows 404 error ❌
- **Root cause**: www CNAME record pointing to old Cloud Run instead of load balancer

## DNS Changes Required in GoDaddy

### Current DNS Settings (WRONG):
```
Type: A     Name: @     Value: 34.120.202.47     ✅ CORRECT
Type: CNAME Name: www   Value: my-marketplace-project-1039909939855.europe-west2.run.app   ❌ WRONG
```

### Required DNS Settings (CORRECT):
```
Type: A     Name: @     Value: 34.120.202.47     ✅ Keep this
Type: CNAME Name: www   Value: arzani.co.uk       🔄 CHANGE THIS
```

## Steps to Fix:

### 1. Log into GoDaddy DNS Management
1. Go to GoDaddy DNS management for arzani.co.uk
2. Find the CNAME record for "www"

### 2. Update the CNAME Record
**Change FROM**: `my-marketplace-project-1039909939855.europe-west2.run.app`
**Change TO**: `arzani.co.uk`

### 3. Save Changes
DNS propagation will take 5-30 minutes

## Alternative Solution (Simpler)
Instead of CNAME, you could use an A record:
```
Type: A     Name: www   Value: 34.120.202.47
```
This points www directly to the same load balancer IP.

## After DNS Update
Once you make this change:
- **www.arzani.co.uk** will work properly
- SSL certificate will provision for www automatically
- Both URLs will work: arzani.co.uk and www.arzani.co.uk

## Current Status
- ✅ **arzani.co.uk** - Working perfectly with HTTPS
- ❌ **www.arzani.co.uk** - 404 error due to DNS pointing to wrong location
- 🔧 **Fix**: Update DNS CNAME record in GoDaddy
