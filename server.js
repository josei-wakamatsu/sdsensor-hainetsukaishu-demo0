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
function calculateCost(energy_kJ, flowRate, costType, costUnit) {
  const energy_kWh = energy_kJ / 3600; // kJ → kWh 変換
  let fuelConsumption = 0;
  let cost = 0;

  if (costType === "電気代") {
    cost = energy_kWh * costUnit;
  } else {
    // ✅ ガス・油の場合、燃料消費量を求める (kg/h)
    const fuelConversionFactor = {
      "プロパンガス": 0.74, // kg/m³
      "灯油代": 0.85,       // kg/L
      "重油代": 0.92,       // kg/L
      "ガス(13A)代": 0.75,  // kg/m³
    };
    fuelConsumption = flowRate * (fuelConversionFactor[costType] || 1); // kg/h
    cost = fuelConsumption * costUnit;
  }
  
  return { cost: cost.toFixed(2), fuelConsumption: fuelConsumption.toFixed(2) };
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

    // ✅ 各温度差を使用した熱量計算
    const energyCurrent_kJ = calculateEnergy(tempC4 - tempC3, flow);
    const energyRecovery_kJ = calculateEnergy(tempC2 - tempC3, flow);

    // ✅ コスト計算（kWh or kg/h ベース）
    const { cost: currentCost, fuelConsumption: fuelCurrent } = calculateCost(energyCurrent_kJ, flow, costType, costUnit);
    const { cost: recoveryBenefit, fuelConsumption: fuelRecovery } = calculateCost(energyRecovery_kJ, flow, costType, costUnit);

    // ✅ 年間コスト計算
    const yearlyCost = currentCost * operatingHours * operatingDays;
    const yearlyRecoveryBenefit = recoveryBenefit * operatingHours * operatingDays;

    res.status(200).json({
      currentCost,
      yearlyCost,
      recoveryBenefit,
      yearlyRecoveryBenefit,
      fuelConsumption: {
        current: fuelCurrent, // 現状の燃料消費量 (kg/h)
        recovery: fuelRecovery // 排熱回収後の燃料消費量 (kg/h)
      }
    });
  } catch (error) {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ サーバー起動: http://localhost:${PORT}`);
});
