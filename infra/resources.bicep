@description('The location used for all deployed resources')
param location string = resourceGroup().location

@description('Tags that will be applied to all resources')
param tags object = {}


@secure()
param databasePassword string
param myMarketplaceProjectExists bool
@secure()
param myMarketplaceProjectDefinition object

@description('Id of the user or app to assign application roles')
param principalId string

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = uniqueString(subscription().id, resourceGroup().id, location)

// Monitor application with Azure Monitor
module monitoring 'br/public:avm/ptn/azd/monitoring:0.1.0' = {
  name: 'monitoring'
  params: {
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
    applicationInsightsDashboardName: '${abbrs.portalDashboards}${resourceToken}'
    location: location
    tags: tags
  }
}

// Container registry
module containerRegistry 'br/public:avm/res/container-registry/registry:0.1.1' = {
  name: 'registry'
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    acrAdminUserEnabled: true
    tags: tags
    publicNetworkAccess: 'Enabled'
    roleAssignments:[
      {
        principalId: myMarketplaceProjectIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
        roleDefinitionIdOrName: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
      }
    ]
  }
}

// Container apps environment
module containerAppsEnvironment 'br/public:avm/res/app/managed-environment:0.4.5' = {
  name: 'container-apps-environment'
  params: {
    logAnalyticsWorkspaceResourceId: monitoring.outputs.logAnalyticsWorkspaceResourceId
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    zoneRedundant: false
  }
}
module cosmos 'br/public:avm/res/document-db/database-account:0.8.1' = {
  name: 'cosmos'
  params: {
    name: '${abbrs.documentDBDatabaseAccounts}${resourceToken}'
    location: location
    tags: tags
    locations: [
      {
        failoverPriority: 0
        isZoneRedundant: false
        locationName: location
      }
    ]
    networkRestrictions: {
      ipRules: []
      virtualNetworkRules: []
      publicNetworkAccess: 'Enabled'
    }
    mongodbDatabases: [
      {
        name: 'no'
      }
    ]
    secretsExportConfiguration: {
      keyVaultResourceId: keyVault.outputs.resourceId
      primaryWriteConnectionStringSecretName: 'MONGODB-URL'
    }
    capabilitiesToAdd: [ 'EnableServerless' ]
  }
}
var databaseName = 'yes'
var databaseUser = 'psqladmin'
module postgreServer 'br/public:avm/res/db-for-postgre-sql/flexible-server:0.1.4' = {
  name: 'postgreServer'
  params: {
    // Required parameters
    name: '${abbrs.dBforPostgreSQLServers}${resourceToken}'
    skuName: 'Standard_B1ms'
    tier: 'Burstable'
    // Non-required parameters
    administratorLogin: databaseUser
    administratorLoginPassword: databasePassword
    geoRedundantBackup: 'Disabled'
    passwordAuth:'Enabled'
    firewallRules: [
      {
        name: 'AllowAllIps'
        startIpAddress: '0.0.0.0'
        endIpAddress: '255.255.255.255'
      }
    ]
    databases: [
      {
        name: databaseName
      }
    ]
    location: location
  }
}

module myMarketplaceProjectIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.2.1' = {
  name: 'myMarketplaceProjectidentity'
  params: {
    name: '${abbrs.managedIdentityUserAssignedIdentities}myMarketplaceProject-${resourceToken}'
    location: location
  }
}

module myMarketplaceProjectFetchLatestImage './modules/fetch-container-image.bicep' = {
  name: 'myMarketplaceProject-fetch-image'
  params: {
    exists: myMarketplaceProjectExists
    name: 'my-marketplace-project'
  }
}

var myMarketplaceProjectAppSettingsArray = filter(array(myMarketplaceProjectDefinition.settings), i => i.name != '')
var myMarketplaceProjectSecrets = map(filter(myMarketplaceProjectAppSettingsArray, i => i.?secret != null), i => {
  name: i.name
  value: i.value
  secretRef: i.?secretRef ?? take(replace(replace(toLower(i.name), '_', '-'), '.', '-'), 32)
})
var myMarketplaceProjectEnv = map(filter(myMarketplaceProjectAppSettingsArray, i => i.?secret == null), i => {
  name: i.name
  value: i.value
})

module myMarketplaceProject 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'myMarketplaceProject'
  params: {
    name: 'my-marketplace-project'
    ingressTargetPort: 80
    scaleMinReplicas: 1
    scaleMaxReplicas: 10
    secrets: {
      secureList:  union([
        {
          name: 'mongodb-url'
          identity:myMarketplaceProjectIdentity.outputs.resourceId
          keyVaultUrl: cosmos.outputs.exportedSecrets['MONGODB-URL'].secretUri
        }
        {
          name: 'db-pass'
          value: databasePassword
        }
        {
          name: 'db-url'
          value: 'postgresql://${databaseUser}:${databasePassword}@${postgreServer.outputs.fqdn}:5432/${databaseName}'
        }
      ],
      map(myMarketplaceProjectSecrets, secret => {
        name: secret.secretRef
        value: secret.value
      }))
    }
    containers: [
      {
        image: myMarketplaceProjectFetchLatestImage.outputs.?containers[?0].?image ?? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
        name: 'main'
        resources: {
          cpu: json('0.5')
          memory: '1.0Gi'
        }
        env: union([
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: monitoring.outputs.applicationInsightsConnectionString
          }
          {
            name: 'AZURE_CLIENT_ID'
            value: myMarketplaceProjectIdentity.outputs.clientId
          }
          {
            name: 'MONGODB_URL'
            secretRef: 'mongodb-url'
          }
          {
            name: 'POSTGRES_HOST'
            value: postgreServer.outputs.fqdn
          }
          {
            name: 'POSTGRES_USERNAME'
            value: databaseUser
          }
          {
            name: 'POSTGRES_DATABASE'
            value: databaseName
          }
          {
            name: 'POSTGRES_PASSWORD'
            secretRef: 'db-pass'
          }
          {
            name: 'POSTGRES_URL'
            secretRef: 'db-url'
          }
          {
            name: 'POSTGRES_PORT'
            value: '5432'
          }
          {
            name: 'PORT'
            value: '80'
          }
        ],
        myMarketplaceProjectEnv,
        map(myMarketplaceProjectSecrets, secret => {
            name: secret.name
            secretRef: secret.secretRef
        }))
      }
    ]
    managedIdentities:{
      systemAssigned: false
      userAssignedResourceIds: [myMarketplaceProjectIdentity.outputs.resourceId]
    }
    registries:[
      {
        server: containerRegistry.outputs.loginServer
        identity: myMarketplaceProjectIdentity.outputs.resourceId
      }
    ]
    environmentResourceId: containerAppsEnvironment.outputs.resourceId
    location: location
    tags: union(tags, { 'azd-service-name': 'my-marketplace-project' })
  }
}
// Create a keyvault to store secrets
module keyVault 'br/public:avm/res/key-vault/vault:0.6.1' = {
  name: 'keyvault'
  params: {
    name: '${abbrs.keyVaultVaults}${resourceToken}'
    location: location
    tags: tags
    enableRbacAuthorization: false
    accessPolicies: [
      {
        objectId: principalId
        permissions: {
          secrets: [ 'get', 'list' ]
        }
      }
      {
        objectId: myMarketplaceProjectIdentity.outputs.principalId
        permissions: {
          secrets: [ 'get', 'list' ]
        }
      }
    ]
    secrets: [
      {
        name: 'db-pass'
        value: databasePassword
      }
    ]
  }
}
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_KEY_VAULT_ENDPOINT string = keyVault.outputs.uri
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name
output AZURE_RESOURCE_MY_MARKETPLACE_PROJECT_ID string = myMarketplaceProject.outputs.resourceId
output AZURE_RESOURCE_YES_ID string = '${postgreServer.outputs.resourceId}/databases/yes'
