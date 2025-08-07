# pgAdmin Connection Setup for Google Cloud SQL

## 📋 **Connection Details for pgAdmin**

### **Method 1: Direct Public IP Connection (Recommended)**

Use these exact details in pgAdmin:

#### **General Tab:**
- **Name**: `Arzani Marketplace DB`
- **Server Group**: `Google Cloud SQL`

#### **Connection Tab:**
- **Host name/address**: `35.246.120.109`
- **Port**: `5432`
- **Maintenance database**: `arzani_marketplace`
- **Username**: `marketplace_user`
- **Password**: `Olumide123!`

#### **Advanced Tab:**
- **DB restriction**: `arzani_marketplace` (optional)

#### **SSL Tab:**
- **SSL Mode**: `Prefer` or `Disable`

---

## 🔐 **Security Configuration Required**

### **Step 1: Add Your IP to Authorized Networks**

Your current IP address is: **147.148.184.43**

Before connecting, you need to whitelist your IP address:

```powershell
# Add your IP to Cloud SQL authorized networks
gcloud sql instances patch arzani-marketplace-db-v17 --authorized-networks=147.148.184.43 --project=cool-mile-437217-s2
```

### **Step 2: Alternative - Use Cloud SQL Proxy (More Secure)**

#### **Install Cloud SQL Proxy:**
```bash
# Download Cloud SQL Proxy
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud_sql_proxy
```

#### **Run Cloud SQL Proxy:**
```bash
./cloud_sql_proxy -instances=cool-mile-437217-s2:europe-west2:arzani-marketplace-db-v17=tcp:5433
```

#### **pgAdmin Connection (via Proxy):**
- **Host name/address**: `localhost`
- **Port**: `5433`
- **Maintenance database**: `arzani_marketplace`
- **Username**: `marketplace_user`
- **Password**: `Olumide123!`

---

## 📊 **Database Information**

### **Available Databases:**
- `arzani_marketplace` (your main database)
- `postgres` (system database)

### **Users:**
- `marketplace_user` (your application user)
- `postgres` (admin user)

### **Instance Details:**
- **Instance Name**: `arzani-marketplace-db-v17`
- **Version**: PostgreSQL 17
- **Region**: europe-west2-c
- **Connection Name**: `cool-mile-437217-s2:europe-west2:arzani-marketplace-db-v17`

---

## 🚨 **Security Notes**

1. **IP Whitelisting**: You must add your IP to authorized networks
2. **Password**: Contains special character `!` - ensure proper escaping in some tools
3. **SSL**: Can be disabled for simplicity or enabled for security
4. **Firewall**: Your local firewall must allow outbound connections on port 5432

---

## 🔧 **Quick Connection Test**

### **Test with psql (if installed):**
```bash
psql "host=35.246.120.109 port=5432 dbname=arzani_marketplace user=marketplace_user password=Olumide123!"
```

### **Test Connection Script:**
```bash
# Simple connection test
telnet 35.246.120.109 5432
```

---

## ✅ **Summary for pgAdmin**

**Use these exact values:**

| Field | Value |
|-------|-------|
| **Host** | `35.246.120.109` |
| **Port** | `5432` |
| **Database** | `arzani_marketplace` |
| **Username** | `marketplace_user` |
| **Password** | `Olumide123!` |

**Remember**: Add your IP to authorized networks first!
