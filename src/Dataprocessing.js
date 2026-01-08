/**
 * Data Processing Utilities
 * Optimized functions for processing large railway datasets
 */

/**
 * Aggregate data by month
 */
export const aggregateByMonth = (data) => {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthMap = new Map();

  data.forEach((record) => {
    if (record.month !== null) {
      const key = `${record.year}-${record.month}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: monthNames[record.month],
          year: record.year,
          monthNum: record.month,
          demands: 0,
          units: 0,
        });
      }
      const entry = monthMap.get(key);
      entry.demands++;
      entry.units += record.rakeUnits || 0;
    }
  });

  return Array.from(monthMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.monthNum - b.monthNum;
  });
};

/**
 * Aggregate data by commodity
 */
export const aggregateByCommodity = (data) => {
  const commodityMap = new Map();

  data.forEach((record) => {
    const commodity = record.cmdt || record.rakecmdt || "Unknown";
    if (!commodityMap.has(commodity)) {
      commodityMap.set(commodity, {
        name: commodity,
        value: 0,
        units: 0,
      });
    }
    const entry = commodityMap.get(commodity);
    entry.value++;
    entry.units += record.rakeUnits || 0;
  });

  return Array.from(commodityMap.values()).sort((a, b) => b.value - a.value);
};

/**
 * Get top consignors
 */
export const getTopConsignors = (data, limit = 10) => {
  const consignorMap = new Map();

  data.forEach((record) => {
    const consignor = record.csnr || "Unknown";
    if (!consignorMap.has(consignor)) {
      consignorMap.set(consignor, {
        name: consignor,
        orders: 0,
        units: 0,
      });
    }
    const entry = consignorMap.get(consignor);
    entry.orders++;
    entry.units += record.rakeUnits || 0;
  });

  return Array.from(consignorMap.values())
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
};

/**
 * Get top destinations
 */
export const getTopDestinations = (data, limit = 10) => {
  const destinationMap = new Map();

  data.forEach((record) => {
    const destination = record.dstn || "Unknown";
    if (!destinationMap.has(destination)) {
      destinationMap.set(destination, {
        name: destination,
        shipments: 0,
        units: 0,
      });
    }
    const entry = destinationMap.get(destination);
    entry.shipments++;
    entry.units += record.rakeUnits || 0;
  });

  return Array.from(destinationMap.values())
    .sort((a, b) => b.shipments - a.shipments)
    .slice(0, limit);
};

/**
 * Aggregate by zone
 */
export const aggregateByZone = (data) => {
  const zoneMap = new Map();

  data.forEach((record) => {
    const zone = record.zone || "Unknown";
    if (!zoneMap.has(zone)) {
      zoneMap.set(zone, {
        zone: zone,
        orders: 0,
        units: 0,
      });
    }
    const entry = zoneMap.get(zone);
    entry.orders++;
    entry.units += record.rakeUnits || 0;
  });

  return Array.from(zoneMap.values()).sort((a, b) => b.orders - a.orders);
};

/**
 * Aggregate by rake type
 */
export const aggregateByRakeType = (data, limit = 10) => {
  const rakeTypeMap = new Map();

  data.forEach((record) => {
    const rakeType = record.indttype || "Unknown";
    if (!rakeTypeMap.has(rakeType)) {
      rakeTypeMap.set(rakeType, {
        name: rakeType,
        units: 0,
        count: 0,
      });
    }
    const entry = rakeTypeMap.get(rakeType);
    entry.units += record.rakeUnits || 0;
    entry.count++;
  });

  return Array.from(rakeTypeMap.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);
};

/**
 * Aggregate by division
 */
export const aggregateByDivision = (data) => {
  const divisionMap = new Map();

  data.forEach((record) => {
    const division = record.dvsn || "Unknown";
    if (!divisionMap.has(division)) {
      divisionMap.set(division, {
        division: division,
        orders: 0,
        totalUnits: 0,
        avgUnits: 0,
      });
    }
    const entry = divisionMap.get(division);
    entry.orders++;
    entry.totalUnits += record.rakeUnits || 0;
  });

  const result = Array.from(divisionMap.values());
  result.forEach((entry) => {
    entry.avgUnits =
      entry.orders > 0 ? Math.round(entry.totalUnits / entry.orders) : 0;
  });

  return result.sort((a, b) => b.orders - a.orders);
};

/**
 * Get consignee analysis
 */
export const getConsigneeAnalysis = (data, limit = 10) => {
  const consigneeMap = new Map();

  data.forEach((record) => {
    const consignee = record.cnsg || "Unknown";
    if (!consigneeMap.has(consignee)) {
      consigneeMap.set(consignee, {
        name: consignee,
        orders: 0,
        units: 0,
      });
    }
    const entry = consigneeMap.get(consignee);
    entry.orders++;
    entry.units += record.rakeUnits || 0;
  });

  return Array.from(consigneeMap.values())
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
};

/**
 * Get query type distribution
 */
export const getQueryTypeDistribution = (data) => {
  const queryTypeMap = new Map();

  data.forEach((record) => {
    const queryType = record.qry || "Unknown";
    if (!queryTypeMap.has(queryType)) {
      queryTypeMap.set(queryType, {
        name: queryType,
        count: 0,
        units: 0,
      });
    }
    const entry = queryTypeMap.get(queryType);
    entry.count++;
    entry.units += record.rakeUnits || 0;
  });

  return Array.from(queryTypeMap.values()).sort((a, b) => b.count - a.count);
};

/**
 * Get time-based analysis (hourly distribution)
 */
export const getTimeDistribution = (data) => {
  const hourMap = new Map();

  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourMap.set(i, {
      hour: `${String(i).padStart(2, "0")}:00`,
      orders: 0,
    });
  }

  data.forEach((record) => {
    if (record.dmndtime || record.time) {
      const timeStr = record.dmndtime || record.time;
      const hour = parseInt(timeStr.split(":")[0], 10);
      if (hour >= 0 && hour < 24) {
        const entry = hourMap.get(hour);
        entry.orders++;
      }
    }
  });

  return Array.from(hourMap.values());
};

/**
 * Get PC (Priority Category) distribution
 */
export const getPriorityDistribution = (data) => {
  const pcMap = new Map();

  data.forEach((record) => {
    const pc = record.pc || "Unknown";
    if (!pcMap.has(pc)) {
      pcMap.set(pc, {
        name: pc,
        count: 0,
      });
    }
    pcMap.get(pc).count++;
  });

  return Array.from(pcMap.values()).sort((a, b) => b.count - a.count);
};

/**
 * Calculate summary statistics
 */
export const calculateSummaryStats = (data) => {
  const totalOrders = data.length;
  const totalUnits = data.reduce(
    (sum, record) => sum + (record.rakeUnits || 0),
    0
  );
  const avgUnitsPerOrder =
    totalOrders > 0 ? (totalUnits / totalOrders).toFixed(2) : 0;

  const uniqueConsignors = new Set(data.map((r) => r.csnr)).size;
  const uniqueConsignees = new Set(data.map((r) => r.cnsg)).size;
  const uniqueDestinations = new Set(data.map((r) => r.dstn)).size;
  const uniqueCommodities = new Set(data.map((r) => r.cmdt || r.rakecmdt)).size;
  const uniqueDivisions = new Set(data.map((r) => r.dvsn)).size;
  const uniqueZones = new Set(data.map((r) => r.zone)).size;

  return {
    totalOrders,
    totalUnits,
    avgUnitsPerOrder: parseFloat(avgUnitsPerOrder),
    uniqueConsignors,
    uniqueConsignees,
    uniqueDestinations,
    uniqueCommodities,
    uniqueDivisions,
    uniqueZones,
  };
};

/**
 * Filter data by date range
 */
export const filterByDateRange = (data, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  return data.filter((record) => {
    if (!record.demandDateObj) return false;
    const recordDate = record.demandDateObj;

    if (start && recordDate < start) return false;
    if (end && recordDate > end) return false;

    return true;
  });
};

/**
 * Get route analysis (origin to destination)
 */
export const getRouteAnalysis = (data, limit = 15) => {
  const routeMap = new Map();

  data.forEach((record) => {
    const origin = record.sttnfrom || "Unknown";
    const destination = record.dstn || "Unknown";
    const route = `${origin} → ${destination}`;

    if (!routeMap.has(route)) {
      routeMap.set(route, {
        route: route,
        origin: origin,
        destination: destination,
        shipments: 0,
        units: 0,
      });
    }
    const entry = routeMap.get(route);
    entry.shipments++;
    entry.units += record.rakeUnits || 0;
  });

  return Array.from(routeMap.values())
    .sort((a, b) => b.shipments - a.shipments)
    .slice(0, limit);
};

/**
 * Chunk large array for processing
 */
export const chunkArray = (array, chunkSize = 1000) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Process data in web worker compatible way
 */
export const processDataBatch = (data, processFn) => {
  return new Promise((resolve) => {
    // Use setTimeout to prevent blocking UI
    setTimeout(() => {
      const result = processFn(data);
      resolve(result);
    }, 0);
  });
};
