const express = require("express");
const { CosmosClient } = require("@azure/cosmos");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3095;

const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;
const client = new CosmosClient({ endpoint, key });
const databaseId = process.env.DATABASE_ID;
const containerId = process.env.CONTAINER_ID;

app.use(cors());
app.use(express.json());

const DEVICE_ID = "hainetsukaishu-demo0";

// ✅ **熱量計算関数**
function calculateEnergy(tempDiff, flowRate) {
  const specificHeat = 4.186; // 水の比熱 (kJ/kg・℃)
  const density = 1000; // 水の密度 (kg/m³)
  return tempDiff * flowRate * density * specificHeat; // kJ
}

// ✅ **コスト計算関数**
function calculateCost(energy_kJ, selectedCost) {
  const kWh = energy_kJ / 3600; // kJ → kWh 変換
  return selectedCost ? (kWh * selectedCost).toFixed(2) : "0.00";
}

// ✅ **リアルタイムデータ取得**
app.post("/api/realtime", async (req, res) => {
  try {
    console.log("✅ フロントエンドからのリクエスト:", req.body);

    const { flow, selectedCostType, selectedCostValue } = req.body;
    if (!flow || !selectedCostType || !selectedCostValue) {
      return res.status(400).json({ error: "Flow1, コスト種別, コスト単価が必要です" });
    }

    console.log("✅ 受信した Flow1:", flow);
    console.log("✅ 選択したコスト種別:", selectedCostType);
    console.log("✅ 選択したコスト単価:", selectedCostValue);

    const database = client.database(databaseId);
    const container = database.container(containerId);

    const querySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.device = @deviceId ORDER BY c.time DESC`,
      parameters: [{ name: "@deviceId", value: DEVICE_ID }],
    };

    const { resources: items } = await container.items.query(querySpec).fetchAll();
    if (items.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    const latestData = items[0];

    const temperatureData = {
      supply1: latestData.tempC1,
      supply2: latestData.tempC2,
      discharge1: latestData.tempC3,
      discharge2: latestData.tempC4,
    };

    // ✅ **現状の熱量計算（tempC4 - tempC3）**
    const tempDiffCurrent = latestData.tempC4 - latestData.tempC3;
    const energyCurrent = calculateEnergy(tempDiffCurrent, flow);
    const costCurrent = calculateCost(energyCurrent, selectedCostValue);
    const yearlyCostCurrent = (costCurrent * 8 * 365).toFixed(2); // 8時間 × 365日

    // ✅ **排熱回収装置の熱量計算（tempC2 - tempC3）**
    const tempDiffRecovery = latestData.tempC2 - latestData.tempC3;
    const energyRecovery = calculateEnergy(tempDiffRecovery, flow);
    const costRecovery = calculateCost(energyRecovery, selectedCostValue);
    const yearlyCostRecovery = (costRecovery * 8 * 365).toFixed(2); // 8時間 × 365日

    res.status(200).json({
      flowReceived: flow,
      selectedCostType,
      selectedCostValue,
      temperature: temperatureData,
      energy: {
        current: energyCurrent.toFixed(2),
        recovery: energyRecovery.toFixed(2),
      },
      cost: {
        current: costCurrent,
        yearlyCurrent: yearlyCostCurrent,
        recovery: costRecovery,
        yearlyRecovery: yearlyCostRecovery,
      },
    });
  } catch (error) {
    console.error("❌ サーバーエラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ サーバー起動: http://localhost:${PORT}`);
});
