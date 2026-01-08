/**
 * Railway Database Service
 * Frontend service for fetching data from database backend
 * Replaces unreliable API calls with direct database queries
 */

const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
  timeout: 60000,
};

class RailwayDatabaseService {
  constructor() {
    this.cache = new Map();
    this.isFetching = false;
    this.abortController = null;
  }

  /**
   * Process raw database records into dashboard format
   */
  processData(records) {
    return records.map((row) => ({
      ...row,
      // Parse date for better sorting/filtering
      demandDateObj: row.dmnddate ? new Date(row.dmnddate) : null,
      // Extract month and year
      month: row.dmnddate ? new Date(row.dmnddate).getMonth() : null,
      year: row.dmnddate ? new Date(row.dmnddate).getFullYear() : null,
      // Convert units to numbers - handle both ODR and Matured data
      rakeUnits: parseInt(row.indtunit || 0, 10),
      rake8w: parseInt(row.indt8w || 0, 10),
      // Add zone field for compatibility (already aliased from Zone column)
      zone: row.zone || row.dvsn,
    }));
  }

  /**
   * Fetch all data from database
   */
  async fetchAllData(filters = {}, onProgress = null) {
    this.isFetching = true;
    this.abortController = new AbortController();

    try {
      if (onProgress) {
        onProgress({
          status: "connecting",
          message: "Connecting to database...",
          percentage: 0,
        });
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/api/railway/all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filters }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (onProgress) {
        onProgress({
          status: "processing",
          message: "Processing data...",
          percentage: 50,
        });
      }

      const result = await response.json();

      if (result.success) {
        const processedData = this.processData(result.data);

        if (onProgress) {
          onProgress({
            status: "complete",
            message: `Successfully loaded ${result.totalRecords} records`,
            percentage: 100,
            odrCount: result.odrCount,
            maturedCount: result.maturedCount,
          });
        }

        this.isFetching = false;
        return {
          success: true,
          data: processedData,
          totalRecords: result.totalRecords,
          odrCount: result.odrCount,
          maturedCount: result.maturedCount,
          timestamp: result.timestamp,
        };
      } else {
        throw new Error(result.error || "Failed to fetch data");
      }
    } catch (error) {
      this.isFetching = false;

      if (error.name === "AbortError") {
        console.log("Fetch cancelled by user");
        return {
          success: false,
          error: "Cancelled",
          data: [],
          totalRecords: 0,
        };
      }

      console.error("Error fetching data:", error);

      if (onProgress) {
        onProgress({
          status: "error",
          message: `Error: ${error.message}`,
          percentage: 0,
        });
      }

      return {
        success: false,
        error: error.message,
        data: [],
        totalRecords: 0,
      };
    }
  }

  /**
   * Fetch ODR data only
   */
  async fetchODRData(filters = {}) {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/railway/odr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: this.processData(result.data),
          totalRecords: result.totalRecords,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching ODR data:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        totalRecords: 0,
      };
    }
  }

  /**
   * Fetch Matured Indents data only
   */
  async fetchMaturedIndentsData(filters = {}) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/railway/matured`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filters }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          data: this.processData(result.data),
          totalRecords: result.totalRecords,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching Matured Indents data:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        totalRecords: 0,
      };
    }
  }

  /**
   * Get available zones
   */
  async getAvailableZones() {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/railway/zones`);
      const result = await response.json();
      return result.success ? result.zones : [];
    } catch (error) {
      console.error("Error fetching zones:", error);
      return [];
    }
  }

  /**
   * Get available commodities
   */
  async getAvailableCommodities() {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/railway/commodities`
      );
      const result = await response.json();
      return result.success ? result.commodities : [];
    } catch (error) {
      console.error("Error fetching commodities:", error);
      return [];
    }
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats() {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/railway/stats`);
      const result = await response.json();
      return result.success ? result.stats : [];
    } catch (error) {
      console.error("Error fetching stats:", error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      return {
        status: "error",
        message: "Cannot connect to database server",
        database: { connected: false },
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
}

// Create singleton instance
const railwayDatabaseService = new RailwayDatabaseService();

export default railwayDatabaseService;
export { API_CONFIG };
