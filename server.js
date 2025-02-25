const express = require("express");
const { CosmosClient } = require("@azure/cosmos");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3091;
app.use(cors());
app.use(express.json());

const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;
const client = new CosmosClient({ endpoint, key });
const databaseId = process.env.DATABASE_ID;
const containerId = process.env.CONTAINER_ID;

const DEVICE_ID = "hainetsukaishu-demo0";

// 単価（円/kWh）
const unitCosts = {
  electricity: 30,
  gas: 20,
  kerosene: 15,
  heavy_oil: 10,
  gas_13A: 25, // 13A 追加
};

// 熱量計算関数
function calculateEnergy(tempDiff, flow) {
  const specificHeat = 4.186;
  const density = 1000;
  return tempDiff * flow * density * specificHeat; // kJ
}

// 料金計算関数
function calculateCost(energy_kJ) {
  const kWh = energy_kJ / 3600;
  return Object.fromEntries(
    Object.entries(unitCosts).map(([key, price]) => [key, (kWh * price).toFixed(2)])
  );
}

// `/api/realtime` のリクエストを POST に変更し、フロントエンドから Flow1 を受け取る
app.post("/api/realtime", async (req, res) => {
  try {
    const { flow } = req.body; // フロントエンドから Flow1 の値を取得
    if (!flow || isNaN(flow)) {
      return res.status(400).json({ error: "Flow1 の値が無効です" });
    }

    const database = client.database(databaseId);
    const container = database.container(containerId);
    const querySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.device = @deviceId ORDER BY c.time DESC`,
      parameters: [{ name: "@deviceId", value: DEVICE_ID }],
    };

    const { resources: items } = await container.items.query(querySpec).fetchAll();
    if (items.length === 0) {
      return res.status(404).json({ error: "データが見つかりません" });
    }

    const latestData = items[0];

    // 現在の熱量計算
    const tempDiffCurrent = latestData.tempC2 - latestData.tempC3;
    const energyCurrent = calculateEnergy(tempDiffCurrent, flow);

    // 排熱回収装置の熱量計算
    const tempDiffRecovery = latestData.tempC4 - latestData.tempC3;
    const energyRecovery = calculateEnergy(tempDiffRecovery, flow);

    // コスト計算
    const costCurrent = calculateCost(energyCurrent);
    const costRecovery = calculateCost(energyRecovery);

    // 年間コスト計算 (24時間365日運用)
    const yearlyCostCurrent = calculateCost(energyCurrent * 24 * 365);
    const yearlyCostRecovery = calculateCost(energyRecovery * 24 * 365);

    res.status(200).json({
      device: DEVICE_ID,
      time: latestData.time,
      temperature: {
        supply1: latestData.tempC1,
        supply2: latestData.tempC2,
        discharge1: latestData.tempC3,
        discharge2: latestData.tempC4,
      },
      flow: flow,
      energy: {
        current: energyCurrent.toFixed(2),
        recovery: energyRecovery.toFixed(2),
      },
      cost: {
        current: costCurrent,
        recovery: costRecovery,
        yearlyCurrent: yearlyCostCurrent,
        yearlyRecovery: yearlyCostRecovery,
      },
      unitCosts,
    });
  } catch (error) {
    console.error("Error fetching realtime data:", error);
    res.status(500).json({ error: "データ取得に失敗しました" });
  }
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Backend is running!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
