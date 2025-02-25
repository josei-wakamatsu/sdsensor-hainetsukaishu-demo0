import React, { useState } from "react";
import axios from "axios";

const backendUrl = "https://sdsensor-hainetsukaishu-demo0-backend.onrender.com";

const App = () => {
  const [flow1, setFlow1] = useState(10);
  const [costType, setCostType] = useState("プロパンガス");
  const [costUnit, setCostUnit] = useState(30);
  const [operatingHours, setOperatingHours] = useState(8);
  const [operatingDays, setOperatingDays] = useState(365);
  const [realTimeData, setRealTimeData] = useState(null);
  const [error, setError] = useState(null);

  // ✅ 電気代なら "円/kWh", 他の燃料なら "円/kg"
  const costUnitLabel = costType === "電気代" ? "円/kWh" : "円/kg";

  const fetchRealTimeData = async () => {
    try {
      const response = await axios.post(`${backendUrl}/api/realtime`, {
        flow: flow1,
        costType,
        costUnit,
        operatingHours,
        operatingDays,
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
      <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center w-full max-w-lg mb-6">
        <label className="mb-2 font-semibold">Flow1 の値を入力 (L/min):</label>
        <input
          type="number"
          value={flow1}
          onChange={(e) => setFlow1(Number(e.target.value))}
          className="border border-gray-400 p-2 rounded w-full text-center mb-4"
        />

        <label className="mb-2 font-semibold">コスト種類を選択:</label>
        <select
          value={costType}
          onChange={(e) => setCostType(e.target.value)}
          className="border border-gray-400 p-2 rounded w-full text-center mb-4"
        >
          <option value="電気代">電気代</option>
          <option value="プロパンガス">プロパンガス</option>
          <option value="灯油代">灯油代</option>
          <option value="重油代">重油代</option>
          <option value="ガス(13A)代">ガス(13A)代</option>
        </select>

        <label className="mb-2 font-semibold">コスト単価を入力 ({costUnitLabel}):</label>
        <input
          type="number"
          value={costUnit}
          onChange={(e) => setCostUnit(Number(e.target.value))}
          className="border border-gray-400 p-2 rounded w-full text-center mb-4"
        />

        <label className="mb-2 font-semibold">稼働時間 (時間/日):</label>
        <input
          type="number"
          value={operatingHours}
          onChange={(e) => setOperatingHours(Number(e.target.value))}
          className="border border-gray-400 p-2 rounded w-full text-center mb-4"
        />

        <label className="mb-2 font-semibold">稼働日数 (日/年):</label>
        <input
          type="number"
          value={operatingDays}
          onChange={(e) => setOperatingDays(Number(e.target.value))}
          className="border border-gray-400 p-2 rounded w-full text-center mb-4"
        />

        <button onClick={fetchRealTimeData} className="bg-blue-500 text-white py-2 px-6 rounded-md shadow-md">
          計算
        </button>
      </div>

      {/* 計算結果の表示 */}
      {realTimeData ? (
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">現状コスト</h2>
            <p className="text-xl font-bold">{realTimeData.currentCost} 円/h</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">年間コスト</h2>
            <p className="text-xl font-bold">{realTimeData.yearlyCost} 円/年</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">排熱回収メリット</h2>
            <p className="text-xl font-bold">{realTimeData.recoveryBenefit} 円/h</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">年間排熱回収メリット</h2>
            <p className="text-xl font-bold">{realTimeData.yearlyRecoveryBenefit} 円/年</p>
          </div>

          {/* ✅ 燃料消費量の表示 */}
          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">燃料消費量 (kg/h)</h2>
            <p className="text-xl font-bold">{realTimeData.fuelConsumption.current} kg/h</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">排熱回収後の燃料消費量 (kg/h)</h2>
            <p className="text-xl font-bold">{realTimeData.fuelConsumption.recovery} kg/h</p>
          </div>
        </div>
      ) : (
        <p className="text-center text-red-500 mt-4">{error || "データなし (null)"}</p>
      )}
    </div>
  );
};

export default App;
