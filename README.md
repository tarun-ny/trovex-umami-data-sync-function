# Umami Azure Function

A standalone Azure Function for synchronizing Umami analytics data with MongoDB user records.

## Features

- 🚀 **Serverless**: Runs on Azure Functions with 24-hour schedule
- 🔒 **Secure**: Azure Key Vault integration for credential management
- 📊 **Comprehensive**: Syncs both session IDs and analytics data
- 🎯 **Minimal**: Uses only required database models
- 🧪 **Testable**: Full local testing and integration test support
- ☁️ **Cloud-Agnostic**: Architecture designed for future AWS Lambda support

## Architecture

```
umami-azure-function/
├── src/
│   ├── function/handlers/      # Azure Function handler
│   ├── core/                   # Cloud-agnostic business logic
│   │   ├── services/umami/     # Complete Umami sync services
│   │   ├── models/             # Minimal database models
│   │   ├── config/keyVault/    # Azure Key Vault integration
│   │   └── utils/              # Utilities and logging
│   └── test/                   # Testing framework
├── function.json               # Azure Functions configuration
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- Azure Functions Core Tools
- MongoDB database
- Umami PostgreSQL database
- Azure Key Vault (for production)

### Installation

1. **Clone and setup**:
```bash
cd umami-azure-function
npm install
```

2. **Configure environment**:
```bash
# Copy the template file
cp local.settings.template.json local.settings.json

# Edit local.settings.json with your configuration
# See Configuration section below for details
```

3. **Local development**:
```bash
# Start Azure Functions runtime locally
npm start

# Or run manual test without Functions runtime
npm run test:manual sync

# Run with hot reload
npm run dev
```

## Configuration

### Local Settings (`local.settings.json`)

This project uses a **single configuration file** for both local and production environments.

**Default Behavior**: Uses **Azure Key Vault** for secrets (production-safe)

#### Mode 1: Azure Key Vault (Default - Production)

Provide only Azure credentials. Application secrets are fetched from Key Vault:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    
    "USE_LOCAL": "false",
    
    "AZURE_KEY_VAULT_URL": "https://your-vault.vault.azure.net/",
    "AZURE_TENANT_ID": "your-tenant-id",
    "AZURE_CLIENT_ID": "your-client-id",
    "AZURE_CLIENT_SECRET": "your-client-secret",
    "AZURE_KEY_VAULT_TAG": "production"
  }
}
```

All application secrets (MONGODB, UMAMI_DB_*, etc.) are automatically fetched from Azure Key Vault.

#### Mode 2: Local Development (Opt-in)

Set `USE_LOCAL=true` to use local secrets instead of Key Vault:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    
    "USE_LOCAL": "true",
    
    "MONGODB": "mongodb://localhost:27017/trovex",
    "UMAMI_DB_HOST": "localhost",
    "UMAMI_DB_PORT": "3306",
    "UMAMI_DB_NAME": "umami",
    "UMAMI_DB_USER": "umami",
    "UMAMI_DB_PASSWORD": "your-password",
    "UMAMI_DB_SSL": "false",
    "UMAMI_API_BASE_URL": "http://localhost:3000/api",
    "UMAMI_API_USERNAME": "admin",
    "UMAMI_API_PASSWORD": "password",
    "UMAMI_WEBSITE_IDS": "website-id-1,website-id-2",
    "INITIAL_SYNC_DAYS": "7",
    "SESSION_SYNC_WINDOW_HOURS": "24",
    "API_PAGE_SIZE": "100",
    "LOG_LEVEL": "info"
  }
}
```

### Azure Key Vault Setup

1. **Create secrets in Azure Key Vault**:
   - `MONGODB` - MongoDB connection string
   - `UMAMI_DB_HOST` - Umami MySQL/PostgreSQL host
   - `UMAMI_DB_PORT` - Database port (e.g., 3306 for MySQL)
   - `UMAMI_DB_NAME` - Umami database name
   - `UMAMI_DB_USER` - Database username
   - `UMAMI_DB_PASSWORD` - Database password
   - `UMAMI_DB_SSL` - SSL enabled (true/false)
   - `UMAMI_API_BASE_URL` - Umami API URL
   - `UMAMI_API_USERNAME` - Umami API username
   - `UMAMI_API_PASSWORD` - Umami API password
   - `UMAMI_WEBSITE_IDS` - Comma-separated website IDs
   - `INITIAL_SYNC_DAYS` - Days to sync on initial run
   - `SESSION_SYNC_WINDOW_HOURS` - Hours window for session sync
   - `API_PAGE_SIZE` - Page size for API requests
   - `LOG_LEVEL` - Logging level (info, debug, error)

2. **Configure Azure Function App Settings**:
   ```json
   {
     "USE_KEY_VAULT": "true",
     "AZURE_KEY_VAULT_URL": "https://your-vault.vault.azure.net/",
     "AZURE_TENANT_ID": "your-tenant-id",
     "AZURE_CLIENT_ID": "your-client-id",
     "AZURE_CLIENT_SECRET": "your-client-secret",
     "AZURE_KEY_VAULT_TAG": "production"
   }
   ```

## Testing

### Manual Testing
```bash
# Test full sync
npm run test:manual sync

# Test connections
npm run test:manual connections

# Check sync status
npm run test:manual status
```

### Unit Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run integration tests (requires real databases)
npm run test:integration
```

### Local Azure Functions Testing
```bash
# Start Functions runtime
npm start

# Test with Functions runtime
curl http://localhost:7071/api/UmamiSync
```

## Deployment

### Azure Portal Deployment

1. **Create Function App**:
   - Runtime stack: Node.js
   - Version: 18 LTS
   - Operating System: Linux
   - Plan: Consumption (serverless)

2. **Configure Application Settings**:
   ```json
   {
     "AZURE_KEY_VAULT_URL": "https://your-vault.vault.azure.net/",
     "AZURE_TENANT_ID": "your-tenant-id",
     "AZURE_CLIENT_ID": "your-client-id",
     "AZURE_CLIENT_SECRET": "your-client-secret",
     "AZURE_KEY_VAULT_TAG": "production"
   }
   ```
   
   **Note**: 
   - Key Vault is used **by default** (no need to set `USE_LOCAL=false`)
   - All application secrets (MONGODB, UMAMI_DB_*, etc.) will be automatically loaded from Azure Key Vault

3. **Deploy Function**:
   ```bash
   # Login to Azure
   az login

   # Deploy to Azure
   npm run build
   func azure functionapp publish your-function-app-name
   ```

### CI/CD Deployment

Example GitHub Actions workflow:

```yaml
name: Deploy to Azure Functions

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Deploy to Azure
      uses: Azure/functions-action@v1
      with:
        app-name: 'your-function-app-name'
        package: '.'
        publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

## Monitoring

### Azure Application Insights

The function integrates with Azure Application Insights for monitoring:

- **Function execution logs**
- **Performance metrics**
- **Error tracking**
- **Custom telemetry**

### Custom Metrics

The function tracks:
- Sync duration
- Records processed
- Error counts
- Database connection times

## Database Schema

### User Model (Minimal)

```typescript
interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  session_id?: string;
  umamiAnalytics?: {
    id: string;
    websiteId: string;
    browser: string;
    os: string;
    device: string;
    // ... other analytics fields
  };
  organization: {
    _id: mongoose.Types.ObjectId;
    name: string;
  };
  isDeleted: boolean;
  updatedAt: Date;
}
```

### SystemConfig Model

```typescript
interface ISystemConfig {
  _id: string;
  umamiSync?: {
    lastSessionSync?: Date;
    lastAnalyticsSync?: Date;
    websiteSyncStatus?: {
      [websiteId: string]: {
        lastSync?: Date;
        lastDaySynced?: string;
        sessionsProcessed?: number;
        errorCount?: number;
      };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Security

### Key Vault Integration

- **Secret Management**: All credentials stored in Azure Key Vault
- **Environment Tagging**: Support for environment-specific secrets
- **Secure Access**: Managed identity or service principal authentication
- **Audit Logging**: Key Vault access monitoring

### Database Security

- **Connection Encryption**: TLS encrypted connections
- **Authentication**: Username/password or certificate-based
- **Least Privilege**: Minimal required database permissions
- **Connection Pooling**: Secure connection management

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   ```bash
   # Test MongoDB connection
   npm run test:manual connections
   ```

2. **Environment Variable Issues**:
   ```bash
   # Verify environment loading
   node -e "console.log(process.env.MONGODB)"
   ```

3. **Azure Functions Runtime Issues**:
   ```bash
   # Clean and reinstall
   npm run clean
   npm install
   ```

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Log Files

- **Azure Functions**: Portal logs or local console
- **Application Insights**: Azure Portal
- **Local Development**: Console output

## Future Enhancements

### AWS Lambda Support

The architecture is designed to support AWS Lambda:

1. **Handler Implementation**: Add `aws.handler.ts`
2. **Secrets Manager**: Replace Key Vault with AWS Secrets Manager
3. **Deployment**: Use SAM CLI instead of Azure Functions Core Tools
4. **Monitoring**: CloudWatch instead of Application Insights

### Additional Features

- **Parallel Processing**: Sync multiple websites concurrently
- **Retry Logic**: Exponential backoff for failed operations
- **Notification**: Email or webhook alerts for sync failures
- **Dashboard**: Web-based sync status monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue in the repository
- Check Azure Functions documentation
- Review Umami API documentation