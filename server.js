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

// ✅ 燃料の発熱量 (kJ/kg)
const fuelEnergyDensity = {
  "プロパンガス": 50.3 * 1000, // kJ/kg
  "灯油": 36.4 * 1000, // kJ/kg
  "重油": 39.6 * 1000, // kJ/kg
  "ガス(13A)": 45.8 * 1000, // kJ/kg
};

// ✅ 熱量計算関数
function calculateEnergy(tempDiff, flow) {
  const specificHeat = 4.186; // 水の比熱 (kJ/kg・℃)
  const density = 1; // 水の密度 (kg/L)
  return tempDiff * flow * density * specificHeat; // kJ/min
}

// ✅ コスト計算関数
function calculateCost(energy_kJ, costType, costUnit) {
  const energy_kWh = energy_kJ / 3600; // kJ → kWh
  let cost = 0;

  if (costType === "電気") {
    cost = energy_kWh * costUnit;
  } else if (fuelEnergyDensity[costType]) {
    const fuelConsumption = energy_kJ / fuelEnergyDensity[costType]; // kg/min
    cost = fuelConsumption * costUnit;
  } else {
    console.error("無効なコストタイプ: ", costType);
    return { cost: 0 };
  }

  return { cost: cost.toFixed(2) };
}

// ✅ **リアルタイムデータ取得**
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
      flow: latestData.Flow1, // ✅ Flow1 を追加
    });
  } catch (error) {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ✅ **計算エンドポイント**
app.post("/api/calculate", async (req, res) => {
  try {
    console.log("✅ 受信データ: ", req.body);

    const { costType, costUnit, operatingHours, operatingDays } = req.body;

    // ✅ Azure から Flow1 を取得
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

    console.log("✅ 取得した Flow1: ", flow);

    // 温度データの取得
    const tempC1 = latestData.tempC1;
    const tempC2 = latestData.tempC2;
    const tempC3 = latestData.tempC3;
    const tempC4 = latestData.tempC4;

    console.log("✅ 取得した温度データ: ", { tempC1, tempC2, tempC3, tempC4 });

    // ✅ 熱量計算 (kJ/min)
    const energyCurrent_kJ = calculateEnergy(tempC4 - tempC1, flow);
    const energyRecovery_kJ = calculateEnergy(tempC2 - tempC1, flow);

    console.log("✅ 計算結果 (エネルギー kJ): ", { energyCurrent_kJ, energyRecovery_kJ });

    // ✅ コスト計算
    const currentCost = calculateCost(energyCurrent_kJ, costType, costUnit).cost;
    const yearlyCost = (currentCost * operatingHours * operatingDays).toFixed(2);
    const recoveryBenefit = calculateCost(energyRecovery_kJ, costType, costUnit).cost;
    const yearlyRecoveryBenefit = (recoveryBenefit * operatingHours * operatingDays).toFixed(2);

    console.log("✅ 計算結果 (コスト): ", { currentCost, yearlyCost, recoveryBenefit, yearlyRecoveryBenefit });

    res.status(200).json({
      currentCost,
      yearlyCost,
      recoveryBenefit,
      yearlyRecoveryBenefit,
    });
  } catch (error) {
    console.error("❌ 計算エラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ✅ サーバー起動
app.listen(PORT, () => {
  console.log(`✅ サーバー起動: http://localhost:${PORT}`);
});
