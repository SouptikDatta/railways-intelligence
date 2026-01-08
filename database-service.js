/**
 * Database Service for FOIS Railway Data
 * Connects directly to Azure SQL Database
 * Replaces unreliable API calls with direct database queries
 */

import sql from "mssql";

const DB_CONFIG = {
  server: process.env.DB_SERVER || "tmilldb.database.windows.net",
  database: process.env.DB_NAME || "FOIS",
  user: process.env.DB_USER || "tmilfoisadmin",
  password: process.env.DB_PASSWORD || "fois$123*",
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectionTimeout: 60000,
    requestTimeout: 180000,
    connectRetryCount: 3,
    connectRetryInterval: 2000,
  },
  pool: {
    max: 5, // Reduced for VPN stability
    min: 1,
    idleTimeoutMillis: 30000,
  },
};

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection pool
   */
  async connect() {
    if (this.pool && this.isConnected) {
      return this.pool;
    }

    try {
      console.log("Connecting to Azure SQL Database...");
      this.pool = await sql.connect(DB_CONFIG);
      this.isConnected = true;
      console.log("✅ Successfully connected to Azure SQL Database");
      return this.pool;
    } catch (error) {
      console.error("❌ Database connection error:", error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.close();
      this.isConnected = false;
      console.log("Database connection closed");
    }
  }

  /**
   * Fetch ODR (Outstanding Orders) data
   */
  async fetchODRData(filters = {}) {
    try {
      await this.connect();
      const request = this.pool.request();

      let query = `
      SELECT TOP 250000
        Division as dvsn,
        Station_From as sttnfrom,
        Demand_No as dmndno,
        Demand_Date as dmnddate,
        NULL as dmndtime,
        Consignor as csnr,
        Consignee as cnsg,
        Commodity as cmdt,
        Traffic_Type as tt,
        PC as pc,
        PBF as pbf,
        VIA as via,
        Rake_Commodity as rakecmdt,
        Destination as dstn,
        Indented_Type as indttype,
        Indented_Units as indtunit,
        Indented_8W as indt8w,
        Outstanding_Units as ostgunit,
        Outstanding_8W as ostg8w,
        Supplied_Units as spldunit,
        Supplied_Time as spldtime,
        Zone as zone,
        'ODR_RK_OTSG' as qry
      FROM dbo.ODR_Indents
      WHERE Division != 'TOTAL'
    `;

      // Add filters if provided
      if (filters.zone) {
        query += ` AND Zone = @zone`;
        request.input("zone", sql.VarChar, filters.zone);
      }

      if (filters.startDate) {
        query += ` AND Demand_Date >= @startDate`;
        request.input("startDate", sql.Date, filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND Demand_Date <= @endDate`;
        request.input("endDate", sql.Date, filters.endDate);
      }

      if (filters.commodity) {
        query += ` AND (Commodity = @commodity OR Rake_Commodity = @commodity)`;
        request.input("commodity", sql.VarChar, filters.commodity);
      }

      query += ` ORDER BY Demand_Date DESC`;

      console.log("Executing ODR query...");
      const result = await request.query(query);
      console.log(`✅ Fetched ${result.recordset.length} ODR records`);

      return result.recordset;
    } catch (error) {
      console.error("Error fetching ODR data:", error);
      throw error;
    }
  }

  /**
   * Fetch Matured Indents data
   */
  async fetchMaturedIndentsData(filters = {}) {
    try {
      await this.connect();
      const request = this.pool.request();

      let query = `
      SELECT TOP 250000
        Division as dvsn,
        Station_From as sttnfrom,
        Demand_No as dmndno,
        Demand_Date as dmnddate,
        Demand_Time as dmndtime,
        Consignor as csnr,
        Consignee as cnsg,
        Commodity as cmdt,
        Traffic_Type as tt,
        PC as pc,
        PBF as pbf,
        VIA as via,
        Rake_Commodity as rakecmdt,
        Destination as dstn,
        Indented_Type as indttype,
        Indented_Units as indtunit,
        Indented_8W as indt8w,
        NULL as ostgunit,
        NULL as ostg8w,
        NULL as spldunit,
        MetwithDate as spldtime,
        Zone as zone,
        'MATURED_INDENTS' as qry
      FROM dbo.Matured_Indents
      WHERE Division != 'TOTAL'
    `;

      // Add filters
      if (filters.zone) {
        query += ` AND Zone = @zone`;
        request.input("zone", sql.VarChar, filters.zone);
      }

      if (filters.startDate) {
        query += ` AND Demand_Date >= @startDate`;
        request.input("startDate", sql.Date, filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND Demand_Date <= @endDate`;
        request.input("endDate", sql.Date, filters.endDate);
      }

      if (filters.commodity) {
        query += ` AND (Commodity = @commodity OR Rake_Commodity = @commodity)`;
        request.input("commodity", sql.VarChar, filters.commodity);
      }

      query += ` ORDER BY Demand_Date DESC, Demand_Time DESC`;

      console.log("Executing Matured Indents query...");
      const result = await request.query(query);
      console.log(
        `✅ Fetched ${result.recordset.length} Matured Indents records`
      );

      return result.recordset;
    } catch (error) {
      console.error("Error fetching Matured Indents data:", error);
      throw error;
    }
  }

  /**
   * Fetch all data (both ODR and Matured Indents)
   */
  async fetchAllData(filters = {}) {
    try {
      console.log("Fetching all railway data from database...");

      const [odrData, maturedData] = await Promise.all([
        this.fetchODRData(filters),
        this.fetchMaturedIndentsData(filters),
      ]);

      const allData = [...odrData, ...maturedData];

      console.log(`✅ Total records fetched: ${allData.length}`);
      console.log(`   - ODR records: ${odrData.length}`);
      console.log(`   - Matured Indents: ${maturedData.length}`);

      return {
        success: true,
        data: allData,
        totalRecords: allData.length,
        odrCount: odrData.length,
        maturedCount: maturedData.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
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
   * Get summary statistics directly from database
   */
  async getSummaryStats() {
    try {
      await this.connect();
      const request = this.pool.request();

      const query = `
      SELECT 
        'ODR' as source,
        COUNT(*) as totalOrders,
        SUM(CAST(Indented_Units as INT)) as totalUnits,
        COUNT(DISTINCT Consignor) as uniqueConsignors,
        COUNT(DISTINCT Consignee) as uniqueConsignees,
        COUNT(DISTINCT Destination) as uniqueDestinations,
        COUNT(DISTINCT COALESCE(Commodity, Rake_Commodity)) as uniqueCommodities,
        COUNT(DISTINCT Division) as uniqueDivisions
      FROM dbo.ODR_Indents
      WHERE Division != 'TOTAL'
      
      UNION ALL
      
      SELECT 
        'MATURED' as source,
        COUNT(*) as totalOrders,
        SUM(CAST(Indented_Units as INT)) as totalUnits,
        COUNT(DISTINCT Consignor) as uniqueConsignors,
        COUNT(DISTINCT Consignee) as uniqueConsignees,
        COUNT(DISTINCT Destination) as uniqueDestinations,
        COUNT(DISTINCT COALESCE(Commodity, Rake_Commodity)) as uniqueCommodities,
        COUNT(DISTINCT Division) as uniqueDivisions
      FROM dbo.Matured_Indents
      WHERE Division != 'TOTAL'
    `;

      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      console.error("Error fetching summary stats:", error);
      throw error;
    }
  }

  /**
   * Get distinct zones/divisions
   */
  async getDistinctZones() {
    try {
      await this.connect();
      const request = this.pool.request();

      const query = `
      SELECT DISTINCT Zone as zone
      FROM (
        SELECT Zone FROM dbo.ODR_Indents WHERE Division != 'TOTAL' AND Zone IS NOT NULL
        UNION
        SELECT Zone FROM dbo.Matured_Indents WHERE Division != 'TOTAL' AND Zone IS NOT NULL
      ) as zones
      ORDER BY zone
    `;

      const result = await request.query(query);
      return result.recordset.map((row) => row.zone);
    } catch (error) {
      console.error("Error fetching zones:", error);
      return [];
    }
  }

  /**
   * Get distinct commodities
   */
  async getDistinctCommodities() {
    try {
      await this.connect();
      const request = this.pool.request();

      const query = `
      SELECT DISTINCT commodity
      FROM (
        SELECT Commodity as commodity FROM dbo.ODR_Indents WHERE Commodity IS NOT NULL
        UNION
        SELECT Rake_Commodity as commodity FROM dbo.ODR_Indents WHERE Rake_Commodity IS NOT NULL
        UNION
        SELECT Commodity as commodity FROM dbo.Matured_Indents WHERE Commodity IS NOT NULL
        UNION
        SELECT Rake_Commodity as commodity FROM dbo.Matured_Indents WHERE Rake_Commodity IS NOT NULL
      ) as commodities
      WHERE commodity != ''
      ORDER BY commodity
    `;

      const result = await request.query(query);
      return result.recordset.map((row) => row.commodity);
    } catch (error) {
      console.error("Error fetching commodities:", error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.connect();
      const request = this.pool.request();
      await request.query("SELECT 1 as health");
      return { status: "healthy", connected: true };
    } catch (error) {
      return { status: "unhealthy", connected: false, error: error.message };
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;
