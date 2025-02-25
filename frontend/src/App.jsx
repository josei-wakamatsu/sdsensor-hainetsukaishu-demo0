import React, { useState, useEffect } from "react";
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

  // 温度データのラベル変換
  const temperatureLabels = {
    tempC1: "給水1",
    tempC2: "給水2",
    tempC3: "排水1",
    tempC4: "排水2",
  };

  // ✅ コスト単価の単位を選択したコストの名前の横に表示
  const costUnitLabel = costType === "電気代" ? "円/kWh" : "円/kg";

  // ✅ リアルタイムデータを定期取得（常に表示）
  useEffect(() => {
    const fetchRealTimeData = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/realtime`);
        console.log("サーバーからのレスポンス:", response.data);
        setRealTimeData(response.data);
      } catch (error) {
        console.error("エラー:", error);
        setRealTimeData(null);
      }
    };

    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 5000); // 5秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  // ✅ 計算リクエストを送信
  const fetchCalculation = async () => {
    try {
      const response = await axios.post(`${backendUrl}/api/calculate`, {
        flow: flow1,
        costType,
        costUnit,
        operatingHours,
        operatingDays,
      });
      console.log("計算結果:", response.data);
      setRealTimeData((prevData) => ({ ...prevData, ...response.data }));
    } catch (error) {
      console.error("計算エラー:", error);
      setError("計算に失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white p-6">
      <h1 className="text-2xl font-bold text-center mb-6">排熱回収システム</h1>

      {/* ✅ リアルタイム温度データ (常に表示) */}
      <div className="grid grid-cols-4 gap-6 w-full max-w-6xl mb-6">
        {realTimeData?.temperature ? (
          Object.entries(realTimeData.temperature).map(([key, value]) => (
            <div key={key} className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
              <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">{temperatureLabels[key]}</h2>
              <p className="text-xl font-bold">{value ? `${value.toFixed(2)} °C` : "データなし"}</p>
            </div>
          ))
        ) : (
          <p className="text-center w-full"></p>
        )}
      </div>

      {/* ✅ 入力フォーム (横1列に並べる) */}
      <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-wrap justify-center items-center w-full max-w-6xl mb-6 gap-4">
        <div className="flex flex-col items-center w-40">
          <label className="mb-2 font-semibold">Flow1 (L/min)</label>
          <input
            type="number"
            value={flow1}
            onChange={(e) => setFlow1(Number(e.target.value) || 0)}
            className="border border-gray-400 p-2 rounded w-full text-center"
          />
        </div>

        <div className="flex flex-col items-center w-40">
          <label className="mb-2 font-semibold">コスト種類</label>
          <select
            value={costType}
            onChange={(e) => setCostType(e.target.value)}
            className="border border-gray-400 p-2 rounded w-full text-center"
          >
            <option value="電気代">電気代</option>
            <option value="プロパンガス">プロパンガス</option>
            <option value="灯油代">灯油代</option>
            <option value="重油代">重油代</option>
            <option value="ガス(13A)代">ガス(13A)代</option>
          </select>
        </div>

        <div className="flex flex-col items-center w-40">
          <label className="mb-2 font-semibold">コスト単価 ({costUnitLabel})</label>
          <input
            type="number"
            value={costUnit}
            onChange={(e) => setCostUnit(Number(e.target.value) || 0)}
            className="border border-gray-400 p-2 rounded w-full text-center"
          />
        </div>

        <div className="flex flex-col items-center w-40">
          <label className="mb-2 font-semibold">稼働時間 (h/日)</label>
          <input
            type="number"
            value={operatingHours}
            onChange={(e) => setOperatingHours(Number(e.target.value) || 0)}
            className="border border-gray-400 p-2 rounded w-full text-center"
          />
        </div>

        <div className="flex flex-col items-center w-40">
          <label className="mb-2 font-semibold">稼働日数 (日/年)</label>
          <input
            type="number"
            value={operatingDays}
            onChange={(e) => setOperatingDays(Number(e.target.value) || 0)}
            className="border border-gray-400 p-2 rounded w-full text-center"
          />
        </div>

        <button onClick={fetchCalculation} className="bg-blue-500 text-white py-2 px-6 rounded-md shadow-md">
          計算
        </button>
      </div>

      {/* ✅ 計算結果の表示（4つ） */}
      {realTimeData?.currentCost !== undefined && (
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold">現状コスト</h2>
            <p className="text-xl font-bold">{realTimeData.currentCost} 円/h</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold">年間コスト</h2>
            <p className="text-xl font-bold">{realTimeData.yearlyCost} 円/年</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold">排熱回収メリット</h2>
            <p className="text-xl font-bold">{realTimeData.recoveryBenefit} 円/h</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-lg font-semibold">年間排熱回収メリット</h2>
            <p className="text-xl font-bold">{realTimeData.yearlyRecoveryBenefit} 円/年</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
