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

    const { flow, costType, costUnit } = req.body;

    // 必須データがあるかチェック
    if (!flow || !costType || !costUnit) {
      console.error("❌ 必須データが不足: flow, costType, costUnit");
      return res.status(400).json({ error: "flow, costType, costUnit の値が必要です" });
    }

    // Azure から最新の温度データを取得
    const database = client.database(databaseId);
    const container = database.container(containerId);
    const querySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.device = @deviceId ORDER BY c.time DESC`,
      parameters: [{ name: "@deviceId", value: DEVICE_ID }],
    };
    const { resources: items } = await container.items.query(querySpec).fetchAll();

    if (items.length === 0) {
      console.error("❌ Azure からのデータ取得失敗");
      return res.status(500).json({ error: "Azure からデータを取得できませんでした" });
    }

    const latestData = items[0];

    // 温度データ
    const tempC1 = latestData.tempC1;
    const tempC2 = latestData.tempC2;
    const tempC3 = latestData.tempC3;
    const tempC4 = latestData.tempC4;

    console.log(`🌡 取得した温度データ: tempC1=${tempC1}, tempC2=${tempC2}, tempC3=${tempC3}, tempC4=${tempC4}`);

    // 熱量計算
    const specificHeat = 4.186; // 水の比熱 (kJ/kg・℃)
    const density = 1000; // 水の密度 (kg/m³)
    const flowRate = flow / 60; // L/min → m³/s

    // 現状の熱量
    const energyCurrent = (tempC4 - tempC3) * flowRate * density * specificHeat; // kJ/s

    // 排熱回収メリット
    const energyRecovery = (tempC2 - tempC3) * flowRate * density * specificHeat; // kJ/s

    console.log(`🔥 計算した熱量: 現状=${energyCurrent.toFixed(2)} kJ/s, 排熱回収=${energyRecovery.toFixed(2)} kJ/s`);

    // 料金計算
    const kWhCurrent = energyCurrent / 3600; // kJ/s → kWh
    const kWhRecovery = energyRecovery / 3600; // kJ/s → kWh

    const currentCost = kWhCurrent * costUnit;
    const yearlyCost = currentCost * 8 * 365; // 8時間運用で年間コスト

    const recoveryBenefit = kWhRecovery * costUnit;
    const yearlyRecoveryBenefit = recoveryBenefit * 8 * 365;

    console.log(`💰 計算結果: 現状=${currentCost.toFixed(2)} 円/h, 年間=${yearlyCost.toFixed(2)} 円/年, 回収メリット=${recoveryBenefit.toFixed(2)} 円/h, 年間メリット=${yearlyRecoveryBenefit.toFixed(2)} 円/年`);

    // レスポンスを返す
    res.status(200).json({
      currentCost: currentCost.toFixed(2),
      yearlyCost: yearlyCost.toFixed(2),
      recoveryBenefit: recoveryBenefit.toFixed(2),
      yearlyRecoveryBenefit: yearlyRecoveryBenefit.toFixed(2),
    });

  } catch (error) {
    console.error("❌ エラー発生: ", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});


app.listen(PORT, () => {
  console.log(`✅ サーバー起動: http://localhost:${PORT}`);
});
