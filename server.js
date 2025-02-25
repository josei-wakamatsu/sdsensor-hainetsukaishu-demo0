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

app.post("/api/realtime", async (req, res) => {
  try {
    console.log("✅ 受信データ: ", req.body);

    const { flow, costType, costUnit, operatingHours, operatingDays } = req.body;

    if (!flow || !costType || !costUnit || !operatingHours || !operatingDays) {
      console.error("❌ 必須データが不足");
      return res.status(400).json({ error: "すべてのパラメータが必要です" });
    }

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

    const tempC3 = latestData.tempC3;
    const tempC4 = latestData.tempC4;
    const tempC2 = latestData.tempC2;

    // ✅ 電気代は kWh, 他は kg で計算
    const isElectricity = costType === "電気代";
    const energyUnit = isElectricity ? 3600 : 1; // kJ → kWh 変換用
    const massFactor = isElectricity ? 1 : 0.85; // kg 換算用 (プロパンガスの場合)

    // ✅ それぞれの熱量計算
    const energyCurrent = calculateEnergy(tempC4 - tempC3, flow) / energyUnit * massFactor;
    const energyRecovery = calculateEnergy(tempC2 - tempC3, flow) / energyUnit * massFactor;

    // ✅ コスト計算
    const currentCost = energyCurrent * costUnit;
    const yearlyCost = currentCost * operatingHours * operatingDays;
    const recoveryBenefit = energyRecovery * costUnit;
    const yearlyRecoveryBenefit = recoveryBenefit * operatingHours * operatingDays;

    res.status(200).json({ currentCost, yearlyCost, recoveryBenefit, yearlyRecoveryBenefit });
  } catch (error) {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});




app.listen(PORT, () => {
  console.log(`✅ サーバー起動: http://localhost:${PORT}`);
});
