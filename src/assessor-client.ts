import axios, { AxiosInstance } from "axios";
import NodeCache from "node-cache";

const CLOUDFRONT_BASE =
  "https://d1ebsyxxbc7tep.cloudfront.net/data/cdb4f45e-00ca-4489-b1ef-977743800d05/Wildfire";
const WEBSITE_BASE = "https://onlinetaxes.yorkcountygov.com";

interface AutocompleteResult {
  Type: "Name" | "Address";
  Value: string;
  Score: number;
}

export interface PropertyRecord {
  // Owner Info
  OwnerName1: string;
  OwnerName2?: string;
  
  // Property/Vehicle Identification
  Description: string;
  Description2?: string;
  RecordType: string;
  District: string;
  
  // Vehicle-specific
  Make?: string;
  Model?: string;
  ModelYear?: number;
  BodyStyle?: string;
  VIN?: { Value: string };
  Tag?: { Value: string };
  
  // Valuation
  Values?: {
    Assessed?: number;
    Appraised?: number;
    LotAssessment?: number;
    BuildingAssessment?: number;
    BaseTax?: number;
    [key: string]: any;
  };
  
  // Tax Info
  CountyValues?: {
    GrossTax?: number;
    Mills?: number;
    [key: string]: any;
  };
  
  Payment?: {
    PaymentStatus: string;
    Date?: string;
    Amount?: number;
    DueDate?: string;
  };
  
  BillDate?: string;
  DueDate?: string;
  Year?: number;
  
  // IDs
  IDs?: {
    [key: string]: { Name: string; Value: string; Private: boolean };
  };
  
  [key: string]: any;
}

interface SearchResponse {
  SearchToken: string;
  TotalRecords: number;
  Records: PropertyRecord[];
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class YorkCountyAssessorClient {
  private client: AxiosInstance;
  private cache: NodeCache;
  private requestTimestamps: number[] = [];
  private rateLimitConfig: RateLimitConfig;
  private readonly CLIENT_ID = "cdb4f45e-00ca-4489-b1ef-977743800d05";

  constructor(
    rateLimitConfig: RateLimitConfig = { maxRequests: 20, windowMs: 60000 }
  ) {
    this.client = axios.create({
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: WEBSITE_BASE,
        Referer: WEBSITE_BASE + "/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      },
    });

    this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    this.rateLimitConfig = rateLimitConfig;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < this.rateLimitConfig.windowMs
    );

    if (this.requestTimestamps.length >= this.rateLimitConfig.maxRequests) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = this.rateLimitConfig.windowMs - (now - oldestRequest);
      throw new Error(
        `Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`
      );
    }

    this.requestTimestamps.push(now);
  }

  async autocomplete(query: string): Promise<AutocompleteResult[]> {
    const cacheKey = `autocomplete:${query.toLowerCase()}`;
    const cached = this.cache.get<AutocompleteResult[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      await this.checkRateLimit();
      const response = await this.client.get<AutocompleteResult[]>(
        `${CLOUDFRONT_BASE}/Autocomplete`,
        {
          params: { q: query },
        }
      );

      const results = Array.isArray(response.data)
        ? response.data
        : (response.data as any).value || [];
      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      throw new Error(
        `Autocomplete failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getRecords(
    searchValue: string,
    skip: number = 0
  ): Promise<PropertyRecord[]> {
    const cacheKey = `records:${searchValue.toLowerCase()}:${skip}`;
    const cached = this.cache.get<PropertyRecord[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      await this.checkRateLimit();
      const response = await this.client.post<SearchResponse>(
        `${CLOUDFRONT_BASE}/Records`,
        {
          value: searchValue,
          skip,
          direct: true,
        },
        {
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
          },
        }
      );

      const records = response.data.Records || [];
      this.cache.set(cacheKey, records);
      return records;
    } catch (error) {
      throw new Error(
        `Get records failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async searchByName(name: string): Promise<PropertyRecord[]> {
    const cacheKey = `search:name:${name.toLowerCase()}`;
    const cached = this.cache.get<PropertyRecord[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const records = await this.getRecords(name);
      this.cache.set(cacheKey, records);
      return records;
    } catch (error) {
      throw new Error(
        `Search by name failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async searchByAddress(address: string): Promise<PropertyRecord[]> {
    const cacheKey = `search:address:${address.toLowerCase()}`;
    const cached = this.cache.get<PropertyRecord[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const records = await this.getRecords(address);
      this.cache.set(cacheKey, records);
      return records;
    } catch (error) {
      throw new Error(
        `Search by address failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  formatRecordForDisplay(record: PropertyRecord): Record<string, any> {
    return {
      ownerName: record.OwnerName1 + (record.OwnerName2 ? ` ${record.OwnerName2}` : ""),
      description: record.Description,
      recordType: record.RecordType,
      year: record.Year,
      district: record.District,
      
      // Vehicle info
      make: record.Make?.trim(),
      model: record.Model?.trim(),
      modelYear: record.ModelYear,
      vin: record.VIN?.Value,
      tag: record.Tag?.Value,
      
      // Valuation
      assessedValue: record.Values?.Assessed,
      appraised: record.Values?.Appraised,
      baseTax: record.Values?.BaseTax,
      
      // Tax
      countyTax: record.CountyValues?.GrossTax,
      mills: record.CountyValues?.Mills,
      
      // Payment
      paymentStatus: record.Payment?.PaymentStatus,
      paymentDate: record.Payment?.Date,
      paymentAmount: record.Payment?.Amount,
      dueDate: record.DueDate,
      billDate: record.BillDate,
      
      // IDs
      ids: record.IDs,
    };
  }

  clearCache(): void {
    this.cache.flushAll();
  }

  getCacheStats(): { keys: number; hits: number; ksize: number; vsize: number } {
    return this.cache.getStats();
  }
}
