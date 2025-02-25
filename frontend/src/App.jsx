import React, { useState, useEffect } from "react";
import axios from "axios";

const backendUrl = "https://sdsensor-hainetsukaishu-demo0-backend.onrender.com";

const App = () => {
  const [realTimeData, setRealTimeData] = useState(null);
  const [flowInput, setFlowInput] = useState("");
  const [error, setError] = useState(null);

  const fetchRealTimeData = async () => {
    try {
      const response = await axios.post(`${backendUrl}/api/realtime`, { flow: parseFloat(flowInput) });
      setRealTimeData(response.data);
      setError(null);
    } catch (error) {
      console.error("リアルタイムデータの取得に失敗しました:", error);
      setRealTimeData(null);
      setError("データの取得に失敗しました。");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!flowInput || isNaN(flowInput)) {
      alert("Flow1 の値を入力してください");
      return;
    }
    fetchRealTimeData();
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white p-6">
      <h1 className="text-2xl font-bold text-center mb-6">排熱回収システム</h1>

      {/* Flow1 の入力フォーム */}
      <form onSubmit={handleSubmit} className="mb-6">
        <label className="block text-lg font-semibold mb-2">Flow1 の値を入力 (L/min)</label>
        <input
          type="number"
          step="0.01"
          value={flowInput}
          onChange={(e) => setFlowInput(e.target.value)}
          className="border p-2 rounded-md shadow-md"
          placeholder="例: 50"
        />
        <button type="submit" className="ml-4 bg-blue-500 text-white p-2 rounded-md shadow-md">
          計算
        </button>
      </form>

      {realTimeData && (
        <div className="w-full max-w-6xl bg-gray-50 p-6 rounded-lg shadow-md mt-6 text-sm">
          <h2 className="text-md font-semibold text-gray-700 text-center mb-2">リアルタイム温度</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            {Object.entries(realTimeData.temperature || {}).map(([key, value]) => (
              <p key={key} className="bg-gray-100 p-3 rounded-md shadow-md">
                {key}: <span className="font-bold">{value ?? "null"} °C</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
