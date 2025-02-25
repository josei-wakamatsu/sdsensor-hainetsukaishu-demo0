const express = require("express");
const { CosmosClient } = require("@azure/cosmos");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3090;
app.use(cors());
app.use(express.json());

// Azure Cosmos DB 接続情報
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
  "13A": 25,
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
  return {
    electricity: (kWh * unitCosts.electricity).toFixed(2),
    gas: (kWh * unitCosts.gas).toFixed(2),
    kerosene: (kWh * unitCosts.kerosene).toFixed(2),
    heavy_oil: (kWh * unitCosts.heavy_oil).toFixed(2),
    "13A": (kWh * unitCosts["13A"]).toFixed(2),
  };
}

// **フロントエンドからの Flow1 を受け取り計算**
app.post("/api/realtime", async (req, res) => {
  try {
    const { flow } = req.body;
    console.log("受信した Flow1:", flow);

    if (!flow) {
      return res.status(400).json({ error: "Flow1 の値が必要です" });
    }

    // Azure から最新データ取得
    const database = client.database(databaseId);
    const container = database.container(containerId);

    const querySpec = {
      query: `SELECT TOP 1 * FROM c WHERE c.device = @deviceId ORDER BY c.time DESC`,
      parameters: [{ name: "@deviceId", value: DEVICE_ID }],
    };

    const { resources: items } = await container.items.query(querySpec).fetchAll();
    if (items.length === 0) {
      return res.status(404).json({ error: "Azure にデータがありません" });
    }

    const latestData = items[0];

    // 温度データを取得
    const tempC1 = latestData.tempC1;
    const tempC2 = latestData.tempC2;
    const tempC3 = latestData.tempC3;
    const tempC4 = latestData.tempC4;

    // 現在の熱量計算
    const tempDiffCurrent = tempC2 - tempC3;
    const energyCurrent = calculateEnergy(tempDiffCurrent, flow);

    // 排熱回収装置の熱量計算
    const tempDiffRecovery = tempC4 - tempC3;
    const energyRecovery = calculateEnergy(tempDiffRecovery, flow);

    // コスト計算
    const costCurrent = calculateCost(energyCurrent);
    const costRecovery = calculateCost(energyRecovery);

    res.status(200).json({
      temperature: { tempC1, tempC2, tempC3, tempC4 },
      flow,
      cost: { current: costCurrent, recovery: costRecovery },
    });
  } catch (error) {
    console.error("エラー:", error);
    res.status(500).json({ error: "サーバーエラー" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
