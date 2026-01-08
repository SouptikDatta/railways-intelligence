/**
 * Database Connection Test Script
 * Tests connection to Azure SQL Database and fetches sample data
 */

import databaseService from "./database-service.js";

async function testDatabaseConnection() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 Testing Database Connection");
  console.log("=".repeat(60) + "\n");

  try {
    // Test 1: Health Check
    console.log("Test 1: Health Check...");
    const health = await databaseService.healthCheck();
    console.log("✅ Database Status:", health.status);
    console.log("   Connected:", health.connected);

    if (!health.connected) {
      console.error("❌ Cannot connect to database");
      return;
    }

    // Test 2: Fetch ODR Data
    console.log("\nTest 2: Fetching ODR Data (first 5 records)...");
    const odrData = await databaseService.fetchODRData({});
    console.log(`✅ ODR Records Found: ${odrData.length}`);
    if (odrData.length > 0) {
      console.log("   Sample Record:", JSON.stringify(odrData[0], null, 2));
    }

    // Test 3: Fetch Matured Indents Data
    console.log("\nTest 3: Fetching Matured Indents Data (first 5 records)...");
    const maturedData = await databaseService.fetchMaturedIndentsData({});
    console.log(`✅ Matured Indents Records Found: ${maturedData.length}`);
    if (maturedData.length > 0) {
      console.log("   Sample Record:", JSON.stringify(maturedData[0], null, 2));
    }

    // Test 4: Fetch All Data
    console.log("\nTest 4: Fetching All Data...");
    const allData = await databaseService.fetchAllData({});
    console.log(`✅ Total Records: ${allData.totalRecords}`);
    console.log(`   - ODR: ${allData.odrCount}`);
    console.log(`   - Matured Indents: ${allData.maturedCount}`);

    // Test 5: Get Summary Stats
    console.log("\nTest 5: Fetching Summary Statistics...");
    const stats = await databaseService.getSummaryStats();
    console.log("✅ Summary Stats:", stats);

    // Test 6: Get Distinct Zones
    console.log("\nTest 6: Fetching Distinct Zones...");
    const zones = await databaseService.getDistinctZones();
    console.log(`✅ Found ${zones.length} zones:`, zones);

    // Test 7: Get Distinct Commodities
    console.log("\nTest 7: Fetching Distinct Commodities...");
    const commodities = await databaseService.getDistinctCommodities();
    console.log(
      `✅ Found ${commodities.length} commodities:`,
      commodities.slice(0, 10),
      "..."
    );

    // Test 8: Filtered Query
    console.log("\nTest 8: Testing Filtered Query (Zone: MAS)...");
    const filteredData = await databaseService.fetchAllData({ zone: "MAS" });
    console.log(`✅ Filtered Records: ${filteredData.totalRecords}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ All Tests Passed!");
    console.log("=".repeat(60) + "\n");

    // Close connection
    await databaseService.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test Failed:", error.message);
    console.error(error.stack);
    await databaseService.disconnect();
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
