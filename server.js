const express = require("express");
const { CosmosClient } = require("@azure/cosmos");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3089;

const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;
const client = new CosmosClient({ endpoint, key });
const databaseId = process.env.DATABASE_ID;
const containerId = process.env.CONTAINER_ID;

app.use(cors());
app.use(express.json());

const DEVICE_ID = "hainetsukaishu-demo0";

// **熱量計算関数**
function calculateEnergy(tempDiff, flowRate) {
  const specificHeat = 4.186; // 水の比熱 (kJ/kg・℃)
  const density = 1000; // 水の密度 (kg/m³)
  return tempDiff * flowRate * density * specificHeat; // kJ
}

// **コスト計算関数**
function calculateCost(energy_kJ, costType, costUnit) {
  const energy_kWh = energy_kJ / 3600; // kJ → kWh 変換
  let cost = 0;

  const fuelEnergyDensity = {
    "プロパンガス": 50.3,
    "灯油": 36.4,
    "重油": 39.6,
    "ガス(13A)": 45.8,
  };

  if (costType === "電気") {
    cost = energy_kWh * costUnit;
  } else if (fuelEnergyDensity[costType]) {
    const fuelConsumption = energy_kJ / (fuelEnergyDensity[costType] * 1000);
    cost = fuelConsumption * costUnit;
  } else {
    console.error("無効なコストタイプ: ", costType);
    return { cost: 0 };
  }

  return { cost: cost.toFixed(2) };
}

// **リアルタイムデータ取得 (Flow1 を含める)**
app.get("/api/realtime", async (req, res) => {
  try {
    const database = client.database(databaseId);
    const container = database.container(containerId);
    const querySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.device = @deviceId ORDER BY c.time DESC`,
      parameters: [{ name: "@deviceId", value: DEVICE_ID }],
    };
    const { resources: items } = await container.items.query(querySpec).fetchAll();

    if (items.length === 0) {
      return res.status(500).json({ error: "Azure からデータを取得できませんでした" });
    }

    const latestData = items[0];

    res.status(200).json({
      temperature: {
        tempC1: latestData.tempC1,
        tempC2: latestData.tempC2,
        tempC3: latestData.tempC3,
        tempC4: latestData.tempC4,
      },
      flow: latestData.Flow1, // ✅ Flow1 をレスポンスに追加
    });
  } catch (error) {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// **計算エンドポイント (Flow1 を Azure から取得)**
app.post("/api/calculate", async (req, res) => {
  try {
    console.log("✅ 受信データ: ", req.body);

    const { costType, costUnit, operatingHours, operatingDays } = req.body;

    const database = client.database(databaseId);
    const container = database.container(containerId);
    const querySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.device = @deviceId ORDER BY c.time DESC`,
      parameters: [{ name: "@deviceId", value: DEVICE_ID }],
    };
    const { resources: items } = await container.items.query(querySpec).fetchAll();

    if (items.length === 0) {
      return res.status(500).json({ error: "Azure からデータを取得できませんでした" });
    }

    const latestData = items[0];
    const flow = latestData.Flow1; // ✅ Azure から Flow1 を取得

    const tempC1 = latestData.tempC1;
    const tempC2 = latestData.tempC2;
    const tempC3 = latestData.tempC3;
    const tempC4 = latestData.tempC4;

    const energyCurrent_kJ = calculateEnergy(tempC4 - tempC1, flow);
    const energyRecovery_kJ = calculateEnergy(tempC2 - tempC1, flow);

    res.status(200).json({ 
      energyCurrent_kJ, 
      energyRecovery_kJ, 
      flow // ✅ Flow1 もレスポンスに含める
    });
  } catch (error) {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ サーバー起動: http://localhost:${PORT}`);
});
