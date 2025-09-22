# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Azure Functions application** that synchronizes analytics data between Umami (PostgreSQL) and MongoDB. It runs on a 24-hour timer trigger and performs:

1. **Session ID Sync**: Extracts session IDs from Umami's PostgreSQL database and updates user records in MongoDB
2. **Analytics Data Sync**: Fetches detailed analytics from Umami's REST API and enriches user records with browser, device, location, and usage statistics

## Development Commands

```bash
# Development and Testing
npm run dev          # Hot reload development with Azure Functions runtime
npm start            # Start Azure Functions locally
npm test             # Run unit tests with Vitest
npm run test:integration  # Run integration tests
npm run test:manual sync   # Manual sync test without Functions runtime
npm run test:manual connections  # Test all database connections

# Build and Deployment
npm run build        # TypeScript compilation
npm run clean        # Clean build artifacts
```

## Architecture Overview

### Core Components

- **Azure Functions Handler** (`src/function/handlers/azure.handler.ts`): Timer-triggered entry point
- **Umami Service** (`src/core/services/umami/umami.service.ts`): Main business logic coordinator
- **Database Services**:
  - `UmamiDbService`: Direct PostgreSQL connection for session data
  - `UmamiApiService`: REST API client for analytics data
  - MongoDB models for User and SystemConfig
- **Configuration System**: Environment-based with Azure Key Vault integration

### Data Flow

```
Phase 1: Session ID Sync
PostgreSQL → UmamiDbService → Batch processing → User.bulkWrite() → SystemConfig

Phase 2: Analytics Data Sync
Umami API → UmamiApiService → Batch processing → User.bulkWrite() → SystemConfig
```

## Key Technical Patterns

### Cloud-Agnostic Design
- Business logic separated from Azure-specific code
- Interface-based secret management system
- Designed for future AWS Lambda support

### Two-Phase Sync Process
1. **Session Sync**: Query PostgreSQL, batch update MongoDB with session IDs
2. **Analytics Sync**: Authenticate with Umami API, fetch paginated data, enrich user records

### Batch Processing
- Configurable batch sizes (default: 100 records)
- MongoDB bulkWrite operations for performance
- Error isolation between batches

## Configuration Management

### Environment Variables Required
- **Database**: `MONGODB_URI`, `UMAMI_DB_*`, `PG*`
- **API**: `UMAMI_API_BASE_URL`, `UMAMI_API_USERNAME`, `UMAMI_API_PASSWORD`, `UMAMI_WEBSITE_IDS`
- **Sync**: `SESSION_SYNC_WINDOW_HOURS`, `ANALYTICS_SYNC_DAYS_BACK`
- **Azure**: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_CERTIFICATE_PATH`, `KEY_VAULT_NAME`

### Secret Management
- **Development**: Local `.env` files
- **Production**: Azure Key Vault with automatic fallback
- **Multi-environment support** with tagging system

## Database Schemas

### MongoDB User Model
```typescript
{
  email: string;           // Primary identifier
  session_id?: string;     // Umami session ID (Phase 1)
  umamiAnalytics?: {       // Analytics data (Phase 2)
    id, websiteId, browser, os, device, screen, language,
    country, region, city, firstAt, lastAt, visits, views, createdAt
  };
  organization: { _id, name };
  isDeleted: boolean;
  updatedAt: Date;
}
```

### SystemConfig Model
Tracks sync status, last sync times, and per-website error counts.

## Error Handling and Resilience

- **Connection testing** before sync operations
- **Error isolation** between websites and batches
- **Retry logic** for transient failures
- **Status tracking** for recovery points
- **Graceful degradation** on partial failures

## Security Considerations

- **TLS encryption** for all database connections
- **Azure Key Vault** for secret management
- **Environment-specific** configuration
- **Connection pooling** with security limits
- **Least privilege** database permissions

## Performance Optimizations

- **Connection pooling** for PostgreSQL and MongoDB
- **Batch processing** to reduce database roundtrips
- **Bulk write operations** for efficient updates
- **Pagination handling** for large datasets
- **Token reuse** across multiple API calls

## Common Development Patterns

### Adding New Sync Operations
1. Update the `UmamiService.syncAllData()` method
2. Add corresponding database models if needed
3. Implement proper error handling and logging
4. Add sync status tracking in SystemConfig

### Configuration Changes
1. Update environment variables in `.env.example`
2. Modify types in `src/core/types/` if needed
3. Update KeyVaultSecretEnum if adding new secrets
4. Test with both local and Key Vault configurations

### Testing Approach
- Use `npm run test:manual` for quick validation
- Run integration tests for database operations
- Test with Azure Functions runtime using `npm run dev`
- Validate error scenarios and edge cases

## Deployment Notes

- **Runtime**: Node.js 18 LTS on Azure Functions Consumption plan
- **Trigger**: Timer (24-hour schedule: `0 0 */24 * * *`)
- **Monitoring**: Azure Application Insights integration
- **CI/CD**: Ready for GitHub Actions or Azure DevOps pipelines