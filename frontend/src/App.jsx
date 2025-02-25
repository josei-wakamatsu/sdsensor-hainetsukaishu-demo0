import React, { useState } from "react";
import axios from "axios";

const backendUrl = "https://sdsensor-hainetsukaishu-demo0-backend.onrender.com";

const App = () => {
  const [flow1, setFlow1] = useState("");
  const [costType, setCostType] = useState("プロパンガス");
  const [costUnit, setCostUnit] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [operatingDays, setOperatingDays] = useState("");
  const [realTimeData, setRealTimeData] = useState(null);
  const [error, setError] = useState(null);

  // ✅ 電気代なら "円/kWh", 他の燃料なら "円/kg"
  const costUnitLabel = costType === "電気代" ? "円/kWh" : "円/kg";

  const fetchRealTimeData = async () => {
    try {
      const response = await axios.post(`${backendUrl}/api/realtime`, {
        flow: parseFloat(flow1) || 0,
        costType,
        costUnit: parseFloat(costUnit) || 0,
        operatingHours: parseFloat(operatingHours) || 0,
        operatingDays: parseFloat(operatingDays) || 0,
      });
      console.log("サーバーからのレスポンス:", response.data);
      setRealTimeData(response.data);
      setError(null);
    } catch (error) {
      console.error("エラー:", error);
      setRealTimeData(null);
      setError("データ取得に失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white p-6">
      <h1 className="text-2xl font-bold text-center mb-6">排熱回収システム</h1>

      {/* 入力フォーム */}
      <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center w-full max-w-6xl mb-6">
        <div className="flex flex-wrap justify-center gap-4 w-full">
          <input
            type="number"
            value={flow1}
            onChange={(e) => setFlow1(e.target.value)}
            placeholder="Flow1 (L/min)"
            className="border border-gray-400 p-2 rounded w-48 text-center"
          />

          <select
            value={costType}
            onChange={(e) => setCostType(e.target.value)}
            className="border border-gray-400 p-2 rounded w-48 text-center"
          >
            <option value="電気代">電気代</option>
            <option value="プロパンガス">プロパンガス</option>
            <option value="灯油代">灯油代</option>
            <option value="重油代">重油代</option>
            <option value="ガス(13A)代">ガス(13A)代</option>
          </select>

          <input
            type="number"
            value={costUnit}
            onChange={(e) => setCostUnit(e.target.value)}
            placeholder={`コスト単価 (${costUnitLabel})`}
            className="border border-gray-400 p-2 rounded w-48 text-center"
          />

          <input
            type="number"
            value={operatingHours}
            onChange={(e) => setOperatingHours(e.target.value)}
            placeholder="稼働時間 (時間/日)"
            className="border border-gray-400 p-2 rounded w-48 text-center"
          />

          <input
            type="number"
            value={operatingDays}
            onChange={(e) => setOperatingDays(e.target.value)}
            placeholder="稼働日数 (日/年)"
            className="border border-gray-400 p-2 rounded w-48 text-center"
          />
        </div>

        <button onClick={fetchRealTimeData} className="mt-4 bg-blue-500 text-white py-2 px-6 rounded-md shadow-md">
          計算
        </button>
      </div>

      {/* ✅ リアルタイム温度データ */}
      <div className="grid grid-cols-4 gap-6 w-full max-w-6xl">
        {realTimeData?.temperature ? (
          Object.entries(realTimeData.temperature).map(([key, value]) => (
            <div key={key} className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
              <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">{key.toUpperCase()}</h2>
              <p className="text-xl font-bold">{value.toFixed(2)} °C</p>
            </div>
          ))
        ) : (
          <p className="text-center w-full">データなし</p>
        )}
      </div>

      {/* ✅ 計算結果の表示 */}
      {realTimeData && (
        <div className="grid grid-cols-2 gap-6 w-full max-w-6xl mt-6">
          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">現状コスト</h2>
            <p className="text-xl font-bold">{realTimeData.currentCost.toFixed(2)} 円/h</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">年間コスト</h2>
            <p className="text-xl font-bold">{realTimeData.yearlyCost.toFixed(2)} 円/年</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">排熱回収メリット</h2>
            <p className="text-xl font-bold">{realTimeData.recoveryBenefit.toFixed(2)} 円/h</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">年間排熱回収メリット</h2>
            <p className="text-xl font-bold">{realTimeData.yearlyRecoveryBenefit.toFixed(2)} 円/年</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
