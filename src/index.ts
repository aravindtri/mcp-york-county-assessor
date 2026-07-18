import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { YorkCountyAssessorClient, PropertyRecord } from "./assessor-client.js";
import { z } from "zod";

const assessor = new YorkCountyAssessorClient();

const server = new McpServer({
  name: "mcp-york-county-assessor",
  version: "1.0.0",
});

// ── 1. search_by_name ──
server.registerTool(
  "search_by_name",
  {
    description:
      "Search for property and vehicle records by owner name in York County, SC tax assessor database. Returns all properties, vehicles, and tax records for the given name.",
    inputSchema: {
      name: z.string().describe("Owner name to search for (e.g., 'John Smith')"),
    },
  },
  async ({ name }) => {
    const records = await assessor.searchByName(name);
    return { content: [{ type: "text", text: formatRecords(records) }] };
  }
);

// ── 2. search_by_address ──
server.registerTool(
  "search_by_address",
  {
    description:
      "Search for property records by address in York County, SC tax assessor database. Returns tax and assessment details for properties at the given address.",
    inputSchema: {
      address: z.string().describe("Property address to search for (e.g., '123 Main St' or 'Oak Ridge')"),
    },
  },
  async ({ address }) => {
    const records = await assessor.searchByAddress(address);
    return { content: [{ type: "text", text: formatRecords(records) }] };
  }
);

// ── 3. autocomplete ──
server.registerTool(
  "autocomplete",
  {
    description:
      "Get autocomplete suggestions for names and addresses from York County tax database. Useful for finding the correct spelling of an owner name or address before performing a detailed search.",
    inputSchema: {
      query: z.string().describe("Search query for autocomplete suggestions"),
    },
  },
  async ({ query }) => {
    const suggestions = await assessor.autocomplete(query);
    return {
      content: [{ type: "text", text: JSON.stringify(suggestions, null, 2) }],
    };
  }
);

// ── 4. get_records ──
server.registerTool(
  "get_records",
  {
    description:
      "Get detailed tax assessor records by exact search value (name or address). Supports pagination for large result sets. Returns full details including assessed value, tax amounts, payment status, and property characteristics.",
    inputSchema: {
      search_value: z.string().describe("Exact name or address value to search"),
      skip: z.number().optional().describe("Number of records to skip for pagination (default: 0)"),
    },
  },
  async ({ search_value, skip = 0 }) => {
    const records = await assessor.getRecords(search_value, skip);
    return { content: [{ type: "text", text: formatRecords(records) }] };
  }
);

// ── 5. cache_stats ──
server.registerTool(
  "cache_stats",
  {
    description: "Get cache statistics (keys, hits, memory usage) for the current session. Useful for understanding cache performance and data freshness.",
    inputSchema: {},
  },
  async () => {
    const stats = assessor.getCacheStats();
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
  }
);

// ── 6. clear_cache ──
server.registerTool(
  "clear_cache",
  {
    description: "Clear all cached search results. Use this to force fresh data from the York County API on the next query.",
    inputSchema: {},
  },
  async () => {
    assessor.clearCache();
    return { content: [{ type: "text", text: "Cache cleared successfully." }] };
  }
);

// ── Helpers ──
function formatRecords(records: PropertyRecord[]): string {
  if (!records || records.length === 0) {
    return "No records found.";
  }

  const formatted = records.map((r) => {
    const f = assessor.formatRecordForDisplay(r);
    return f;
  });

  return JSON.stringify(formatted, null, 2);
}

// ── Start ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("York County Assessor MCP server running on stdio");
}

main().catch(console.error);
