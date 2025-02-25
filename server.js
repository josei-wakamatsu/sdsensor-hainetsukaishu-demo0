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

// ✅ **5種類の単価（円/kWh）**
const unitCosts = {
  electricity: 30,
  propane: 20,
  kerosene: 15,
  heavy_oil: 10,
  gas_13A: 25, // ✅ 13Aを追加
};

// ✅ **熱量計算関数**
function calculateEnergy(tempDiff, flowRate) {
  const specificHeat = 4.186;
  const density = 1000;
  return tempDiff * flowRate * density * specificHeat;
}

// ✅ **コスト計算関数（選択したコストで計算）**
function calculateCost(energy_kJ, selectedCost) {
  const kWh = energy_kJ / 3600;
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

    const tempDiffCurrent = latestData.tempC2 - latestData.tempC3;
    const energyCurrent = calculateEnergy(tempDiffCurrent, flow);
    const costCurrent = calculateCost(energyCurrent, selectedCostValue);

    const tempDiffRecovery = latestData.tempC4 - latestData.tempC3;
    const energyRecovery = calculateEnergy(tempDiffRecovery, flow);
    const costRecovery = calculateCost(energyRecovery, selectedCostValue);

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
        recovery: costRecovery,
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
