import express from "express";
import cors from "cors";
import databaseService from "./database-service.js";

const app = express();
const PORT = 3001;

// Enable CORS for all origins (restrict in production)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health check endpoint
 */
app.get("/health", async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    res.json({
      status: "ok",
      message: "Railway Database Server Running",
      database: dbHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      database: { connected: false },
    });
  }
});

/**
 * Fetch all railway data from database
 */
app.post("/api/railway/all", async (req, res) => {
  try {
    console.log("📊 Fetching all railway data from database...");
    const filters = req.body.filters || {};

    const result = await databaseService.fetchAllData(filters);

    if (result.success) {
      console.log(`✅ Success! Total records: ${result.totalRecords}`);
      res.json(result);
    } else {
      console.error("❌ Failed to fetch data:", result.error);
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Server error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      totalRecords: 0,
    });
  }
});

/**
 * Fetch ODR data only
 */
app.post("/api/railway/odr", async (req, res) => {
  try {
    console.log("📊 Fetching ODR data...");
    const filters = req.body.filters || {};

    const data = await databaseService.fetchODRData(filters);

    res.json({
      success: true,
      data: data,
      totalRecords: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching ODR data:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      totalRecords: 0,
    });
  }
});

/**
 * Fetch Matured Indents data only
 */
app.post("/api/railway/matured", async (req, res) => {
  try {
    console.log("📊 Fetching Matured Indents data...");
    const filters = req.body.filters || {};

    const data = await databaseService.fetchMaturedIndentsData(filters);

    res.json({
      success: true,
      data: data,
      totalRecords: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching Matured Indents data:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      totalRecords: 0,
    });
  }
});

/**
 * Get summary statistics
 */
app.get("/api/railway/stats", async (req, res) => {
  try {
    console.log("📊 Fetching summary statistics...");
    const stats = await databaseService.getSummaryStats();

    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get distinct zones
 */
app.get("/api/railway/zones", async (req, res) => {
  try {
    const zones = await databaseService.getDistinctZones();
    res.json({
      success: true,
      zones: zones,
    });
  } catch (error) {
    console.error("❌ Error fetching zones:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      zones: [],
    });
  }
});

/**
 * Get distinct commodities
 */
app.get("/api/railway/commodities", async (req, res) => {
  try {
    const commodities = await databaseService.getDistinctCommodities();
    res.json({
      success: true,
      commodities: commodities,
    });
  } catch (error) {
    console.error("❌ Error fetching commodities:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      commodities: [],
    });
  }
});

/**
 * Graceful shutdown
 */
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await databaseService.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down server...");
  await databaseService.disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Railway Database Server Running");
  console.log("=".repeat(60));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Data endpoint: http://localhost:${PORT}/api/railway/all`);
  console.log("=".repeat(60) + "\n");
});
