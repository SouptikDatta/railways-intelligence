import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
const PORT = 3001;

// Enable CORS for all origins (restrict in production)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy endpoint
app.post("/api/railway", async (req, res) => {
  try {
    console.log("Proxying request:", req.body);

    // Make request to FOIS API
    const response = await axios({
      method: "POST",
      url: "https://www.fois.indianrail.gov.in/RailSAHAY/SHY_OdrRasJSON",
      data: new URLSearchParams(req.body).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: "https://www.fois.indianrail.gov.in",
        Referer: "https://www.fois.indianrail.gov.in/RailSAHAY/Home.jsp",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 30000,
    });

    console.log("Success! Records received:", response.data?.data?.length || 0);
    res.json(response.data);
  } catch (error) {
    console.error("Proxy error:", error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || "Failed to fetch from railway API",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Railway API Proxy Server Running" });
});

app.listen(PORT, () => {
  console.log(
    `\n🚀 Railway API Proxy Server running on http://localhost:${PORT}`
  );
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Proxy endpoint: http://localhost:${PORT}/api/railway\n`);
});
