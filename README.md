# York County Assessor MCP Server

MCP server for querying York County, South Carolina property tax assessor database. Provides AI agents with structured access to owner names, property addresses, vehicle registrations, assessed values, and tax payment records.

## Features

- **Search by Name**: Find all properties and vehicles owned by a person
- **Search by Address**: Find properties at a specific address
- **Autocomplete**: Get suggestions for names and addresses
- **Detailed Records**: View full tax, assessment, and payment information
- **Caching**: Built-in caching with configurable rate limiting
- **Multiple Record Types**: Supports both real estate and vehicle records

## Installation

```bash
git clone https://github.com/YOUR_USER/mcp-york-county-assessor.git
cd mcp-york-county-assessor
npm install
npm run build
```

## For AI Agents: How to Configure This MCP

### GitHub Copilot CLI

Add this to your `~/.copilot/settings.json`:

```json
{
  "mcpServers": {
    "york-county-assessor": {
      "name": "York County Property & Vehicle Records",
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-york-county-assessor/dist/index.js"],
      "description": "Look up owner names, property addresses, vehicle registrations, assessed values, and tax payments from York County, SC public records",
      "tools": {
        "search_by_name": "Find all property and vehicle records for a person (e.g., 'John Smith')",
        "search_by_address": "Find property records at an address (e.g., '123 Main St')",
        "autocomplete": "Get name/address suggestions for partial queries",
        "get_records": "Get detailed records by exact name or address with pagination",
        "cache_stats": "View cache hit rates and memory usage",
        "clear_cache": "Clear cached results for fresh data"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "york-county-assessor": {
      "command": "node",
      "args": ["/path/to/mcp-york-county-assessor/dist/index.js"]
    }
  }
}
```

### VS Code / Copilot Chat

Use the same `command` + `args` configuration in your VS Code MCP settings.

## What AI Agents Can Do With This MCP

- **"Who owns 123 Main Street?"** → returns owner name, tax history, assessment
- **"What vehicles does [NAME] own?"** → returns make, model, year, tax status
- **"How much property tax did [NAME] pay last year?"** → returns amounts, due dates, payment status
- **"Find properties on Oak Ridge Lane"** → address search returns matching parcels
- **"Look up this VIN"** → vehicle records include VIN (masked) and tag numbers

## MCP Client Configuration

Add to your MCP client config (e.g., Claude Desktop, VS Code, or Copilot CLI):

```json
{
  "mcpServers": {
    "york-county-assessor": {
      "command": "node",
      "args": ["path/to/mcp-york-county-assessor/dist/index.js"]
    }
  }
}
```

## Usage

### As a standalone MCP server

```bash
npm start
```

### Programmatic usage

```typescript
import { YorkCountyAssessorClient } from './assessor-client';

const client = new YorkCountyAssessorClient();

// Search by name
const properties = await client.searchByName('John Smith');

// Search by address
const records = await client.searchByAddress('123 Main St');

// Get autocomplete suggestions
const suggestions = await client.autocomplete('Arav');
```

## API Tools

### search_by_name

Search for all property and vehicle records by owner name.

**Parameters:**
- `name` (string): Owner name to search for

**Returns:** Array of property records with owner, description, type, valuation, and tax information.

### search_by_address

Search for property records by address.

**Parameters:**
- `address` (string): Property address to search for

**Returns:** Array of property records at the specified address.

### autocomplete

Get autocomplete suggestions for names and addresses.

**Parameters:**
- `query` (string): Search query

**Returns:** Array of autocomplete results with type (Name/Address) and score.

### get_records

Get detailed records by search value (can be name or address).

**Parameters:**
- `search_value` (string): Name or address to search
- `skip` (number, optional): Number of records to skip for pagination (default: 0)

**Returns:** Array of detailed property records.

### cache_stats

Get cache statistics.

**Returns:** Object with keys, hits, ksize, and vsize.

### clear_cache

Clear all cached data.

**Returns:** Confirmation message.

## Record Types

The server returns data for multiple record types:

- **Vehicle**: Cars, trucks, motorcycles registered in York County
- **Property**: Real estate parcels with addresses, assessments, and tax information

### Property Record Fields

```typescript
{
  ownerName: string;
  description: string;
  recordType: "Vehicle" | "Property";
  year: number;
  district: string;
  
  // For vehicles
  make?: string;
  model?: string;
  modelYear?: number;
  vin?: string;
  tag?: string;
  
  // Valuations
  assessedValue?: number;
  appraised?: number;
  baseTax?: number;
  
  // Tax information
  countyTax?: number;
  mills?: number;
  
  // Payment
  paymentStatus: string;
  paymentDate?: string;
  paymentAmount?: number;
  dueDate?: string;
  billDate?: string;
  
  // IDs
  ids?: Record<string, {Name: string; Value: string; Private: boolean}>;
}
```

## Rate Limiting

The client includes built-in rate limiting to prevent overwhelming the server:

- **Default**: 20 requests per 60 seconds
- **Configurable**: Pass `RateLimitConfig` to constructor

```typescript
const client = new YorkCountyAssessorClient({
  maxRequests: 10,
  windowMs: 30000 // 10 requests per 30 seconds
});
```

## Caching

All search results are cached for 1 hour by default. Clear cache as needed:

```typescript
client.clearCache();
```

## Data Source

Data is sourced from: https://onlinetaxes.yorkcountygov.com/taxes#/WildfireSearch

## Legal Notice

This tool accesses publicly available tax assessor records. Ensure compliance with all applicable laws and regulations regarding access and use of this data.

## License

MIT
