/**
 * Railway API Service
 * Fetches data directly from FOIS Indian Railways API
 * Optimized for handling large datasets (20-30 lakh records)
 */

const API_CONFIG = {
  // Use proxy server to bypass CORS
  baseUrl: "http://localhost:3001/api/railway",
  headers: {
    "Content-Type": "application/json",
  },
  zones: [
    "CR",
    "DFCCR",
    "EC",
    "ECO",
    "ER",
    "KR",
    "NC",
    "NE",
    "NR",
    "NW",
    "SC",
    "SE",
    "SEC",
    "SR",
    "SW",
    "WC",
    "WR",
  ],
  queryTypes: ["MATURED_INDENTS", "ODR_RK_OTSG", "DEMAND_REGISTERED"],
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 2000,
};

class RailwayApiService {
  constructor() {
    this.cache = new Map();
    this.isFetching = false;
    this.abortController = null;
  }

  /**
   * Fetch data with retry logic
   */
  async fetchWithRetry(url, options, attempt = 1) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (attempt < API_CONFIG.retryAttempts) {
        console.warn(`Attempt ${attempt} failed, retrying...`, error.message);
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.retryDelay * attempt)
        );
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Fetch data for a single zone and query type
   */
  async fetchZoneData(zone, queryType, signal) {
    const cacheKey = `${zone}-${queryType}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const payload = {
      Optn: "ODROtsgDtls",
      Qry: queryType,
      Zone: zone,
    };

    const options = {
      method: "POST",
      headers: API_CONFIG.headers,
      body: JSON.stringify(payload),
      signal,
    };

    try {
      const response = await this.fetchWithRetry(API_CONFIG.baseUrl, options);

      const processedData = (response.data || [])
        .filter((row) => row.dvsn !== "TOTAL")
        .map((row) => ({
          ...row,
          qry: queryType,
          zone: zone,
          // Parse date for better sorting/filtering
          demandDateObj: row.dmnddate ? new Date(row.dmnddate) : null,
          // Extract month and year
          month: row.dmnddate ? new Date(row.dmnddate).getMonth() : null,
          year: row.dmnddate ? new Date(row.dmnddate).getFullYear() : null,
          // Convert units to numbers
          rakeUnits: parseInt(row.indtunit || row.ostgunit || 0, 10),
          rake8w: parseInt(row.indt8w || row.ostg8w || 0, 10),
        }));

      // Cache the result
      this.cache.set(cacheKey, processedData);

      return processedData;
    } catch (error) {
      console.error(
        `Error fetching data for Zone: ${zone}, Query: ${queryType}`,
        error
      );
      return [];
    }
  }

  /**
   * Fetch data for multiple zones in parallel (batch processing)
   */
  async fetchBatchData(zones, queryTypes, onProgress) {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const totalRequests = zones.length * queryTypes.length;
    let completedRequests = 0;
    let allData = [];

    // Process in batches to avoid overwhelming the server
    const batchSize = 3; // Process 3 requests at a time

    for (let i = 0; i < zones.length; i += batchSize) {
      const zoneBatch = zones.slice(i, i + batchSize);

      for (const queryType of queryTypes) {
        const batchPromises = zoneBatch.map(async (zone) => {
          try {
            const data = await this.fetchZoneData(zone, queryType, signal);
            completedRequests++;

            if (onProgress) {
              onProgress({
                completed: completedRequests,
                total: totalRequests,
                percentage: Math.round(
                  (completedRequests / totalRequests) * 100
                ),
                zone,
                queryType,
                recordsFetched: data.length,
              });
            }

            return data;
          } catch (error) {
            completedRequests++;
            if (onProgress) {
              onProgress({
                completed: completedRequests,
                total: totalRequests,
                percentage: Math.round(
                  (completedRequests / totalRequests) * 100
                ),
                zone,
                queryType,
                error: error.message,
              });
            }
            return [];
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allData = allData.concat(...batchResults);

        // Small delay between batches to be respectful to the server
        if (i + batchSize < zones.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    return allData;
  }

  /**
   * Fetch all data from all zones and query types
   */
  async fetchAllData(onProgress) {
    this.isFetching = true;

    try {
      const data = await this.fetchBatchData(
        API_CONFIG.zones,
        API_CONFIG.queryTypes,
        onProgress
      );

      this.isFetching = false;
      return {
        success: true,
        data: data,
        totalRecords: data.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.isFetching = false;
      console.error("Error fetching all data:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        totalRecords: 0,
      };
    }
  }

  /**
   * Fetch data for specific zones only
   */
  async fetchSelectedZones(zones, queryTypes, onProgress) {
    this.isFetching = true;

    try {
      const data = await this.fetchBatchData(zones, queryTypes, onProgress);

      this.isFetching = false;
      return {
        success: true,
        data: data,
        totalRecords: data.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.isFetching = false;
      console.error("Error fetching selected zones:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        totalRecords: 0,
      };
    }
  }

  /**
   * Cancel ongoing fetch operation
   */
  cancelFetch() {
    if (this.abortController) {
      this.abortController.abort();
      this.isFetching = false;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    let totalRecords = 0;
    this.cache.forEach((value) => {
      totalRecords += value.length;
    });
    return {
      entries: this.cache.size,
      records: totalRecords,
    };
  }
}

// Create singleton instance
const railwayApiService = new RailwayApiService();

export default railwayApiService;
export { API_CONFIG };
