import React, { useState } from "react";
import axios from "axios";

const backendUrl = "https://sdsensor-hainetsukaishu-demo0-backend.onrender.com";

const App = () => {
  const [flow1, setFlow1] = useState(100);
  const [realTimeData, setRealTimeData] = useState(null);
  const [error, setError] = useState(null);

  const fetchRealTimeData = async () => {
    try {
      const response = await axios.post(`${backendUrl}/api/realtime`, { flow: flow1 });
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

      <div className="flex items-center mb-6">
        <label className="mr-2">Flow1 の値を入力 (L/min):</label>
        <input
          type="number"
          value={flow1}
          onChange={(e) => setFlow1(Number(e.target.value))}
          className="border border-gray-400 p-2 rounded"
        />
        <button onClick={fetchRealTimeData} className="ml-4 bg-blue-500 text-white p-2 rounded">
          計算
        </button>
      </div>

      {realTimeData && (
        <>
          <h2 className="text-md font-semibold text-gray-700 text-center mb-2">リアルタイム温度</h2>
          <div className="grid grid-cols-4 gap-4 text-center w-full">
            {Object.entries(realTimeData.temperature).map(([key, value]) => (
              <p key={key} className="bg-gray-100 p-3 rounded-md shadow-md">
                {key}: <span className="font-bold">{value.toFixed(2)} °C</span>
              </p>
            ))}
          </div>

          <h2 className="text-md font-semibold text-gray-700 text-center mt-6 mb-2">エネルギーとコスト</h2>
          <div className="grid grid-cols-2 gap-4 text-center w-full">
            <p>エネルギー: <span className="font-bold">{realTimeData.energy.current} kJ</span></p>
            <p>回収エネルギー: <span className="font-bold">{realTimeData.energy.recovery} kJ</span></p>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
