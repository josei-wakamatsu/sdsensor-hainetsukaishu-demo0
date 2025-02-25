import React, { useState } from "react";
import axios from "axios";

const backendUrl = "https://sdsensor-hainetsukaishu-demo0-backend.onrender.com";

const App = () => {
  const [flow1, setFlow1] = useState(100);
  const [selectedCostType, setSelectedCostType] = useState("electricity");
  const [selectedCostValue, setSelectedCostValue] = useState(30);
  const [realTimeData, setRealTimeData] = useState(null);
  const [error, setError] = useState(null);

  const costOptions = {
    electricity: "電気代",
    propane: "プロパンガス",
    kerosene: "灯油代",
    heavy_oil: "重油代",
    gas_13A: "ガス(13A)代",
  };

  const fetchRealTimeData = async () => {
    try {
      const response = await axios.post(`${backendUrl}/api/realtime`, {
        flow: flow1,
        selectedCostType,
        selectedCostValue,
      });
      console.log("✅ サーバーからのレスポンス:", response.data);
      setRealTimeData(response.data);
      setError(null);
    } catch (error) {
      console.error("❌ エラー:", error);
      setRealTimeData(null);
      setError("データ取得に失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white p-6">
      <h1 className="text-2xl font-bold text-center mb-4">排熱回収システム</h1>

      <div className="flex flex-col items-center mb-6">
        <label>Flow1 の値を入力 (L/min):</label>
        <input
          type="number"
          value={flow1}
          onChange={(e) => setFlow1(Number(e.target.value))}
          className="border border-gray-400 p-2 rounded mb-4"
        />

        <label>コスト種別を選択:</label>
        <select
          value={selectedCostType}
          onChange={(e) => setSelectedCostType(e.target.value)}
          className="border border-gray-400 p-2 rounded mb-4"
        >
          {Object.entries(costOptions).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <label>コスト単価を入力 (円/kWh):</label>
        <input
          type="number"
          value={selectedCostValue}
          onChange={(e) => setSelectedCostValue(Number(e.target.value))}
          className="border border-gray-400 p-2 rounded mb-4"
        />

        <button onClick={fetchRealTimeData} className="bg-blue-500 text-white p-2 rounded">
          計算
        </button>
      </div>

      {realTimeData && (
        <>
          <h2 className="text-md font-semibold text-gray-700 text-center mb-2">エネルギーとコスト</h2>
          <p>エネルギー: {realTimeData.energy.current} kJ</p>
          <p>回収エネルギー: {realTimeData.energy.recovery} kJ</p>
          <p>コスト ({costOptions[realTimeData.selectedCostType]}): {realTimeData.cost.current} 円</p>
        </>
      )}
    </div>
  );
};

export default App;
