import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// import { Slider, Radio, Card, Typography, Space } from '@/components/ui/';

// カスタムフック: マウスホイールでの値の増減
const useMouseWheelAdjust = (setValue, min, max, step = 1) => {
  return useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
    setValue(prevValue => {
      const newValue = event.deltaY < 0
        ? Math.min(prevValue + step, max)
        : Math.max(prevValue - step, min);
      return newValue;
    });
  }, [setValue, min, max, step]);
};

const GeminiCachingCostGraph = () => {
  const [model, setModel] = useState('gemini15Pro');
  const [contextSizeInput, setContextSizeInput] = useState(200);
  const [contextSizeOutput, setContextSizeOutput] = useState(2);
  const [cacheRetentionMinutes, setCacheRetentionMinutes] = useState(60);
  const [maxQueries, setMaxQueries] = useState(5);
  const [data, setData] = useState([]);

  const handleContextSizeInputWheel = useMouseWheelAdjust(setContextSizeInput, 1, 1000, 10);
  const handleContextSizeOutputWheel = useMouseWheelAdjust(setContextSizeOutput, 1, 8);
  const handleCacheRetentionMinutesWheel = useMouseWheelAdjust(setCacheRetentionMinutes, 1, 180, 5);
  const handleMaxQueriesWheel = useMouseWheelAdjust(setMaxQueries, 1, 100);

  const calculateCosts = () => {
    const newData = [];
    const isLargeContext = contextSizeInput > 128;

    let normalInputCost, normalOutputCost, cacheInputCost, cacheStorageCost;

    const pricingTable = {
      gemini15Flash: {
        regular: {
          imageInput: [0.0001315, 0.000263],
          videoInput: [0.0001315, 0.000263],
          textInput: [0.000125, 0.00025],
          audioInput: [0.0000125, 0.000025],
          textOutput: [0.000375, 0.00075]
        },
        cachedInput: {
          imageInput: [0.000032875, 0.00006575],
          videoInput: [0.000032875, 0.00006575],
          textInput: [0.00003125, 0.0000625],
          audioInput: [0.000003125, 0.00000625]
        },
        contextCacheStorage: {
          imageInput: 0.000263,
          videoInput: 0.000263,
          textInput: 0.00025,
          audioInput: 0.000025
        }
      },
      gemini15Pro: {
        regular: {
          imageInput: [0.001315, 0.00263],
          videoInput: [0.001315, 0.00263],
          textInput: [0.00125, 0.0025],
          audioInput: [0.000125, 0.00025],
          textOutput: [0.00375, 0.0075]
        },
        cachedInput: {
          imageInput: [0.00032875, 0.0006575],
          videoInput: [0.00032875, 0.0006575],
          textInput: [0.0003125, 0.000625],
          audioInput: [0.00003125, 0.0000625]
        },
        contextCacheStorage: {
          imageInput: 0.0011835,
          videoInput: 0.0011835,
          textInput: 0.001125,
          audioInput: 0.0001125
        }
      },
      gemini10Pro: {
        regular: {
          imageInput: [0.0025],
          videoInput: [0.002],
          textInput: [0.000125],
          textOutput: [0.000375]
        }
      },
      groundingGoogleSearch: {
        regular: {
          groundingRequests: [35]
        }
      }
    };

    console.log(model);
    normalInputCost = pricingTable[model].regular.textInput[isLargeContext ? 1 : 0];
    normalOutputCost = pricingTable[model].regular.textOutput[isLargeContext ? 1 : 0];
    cacheInputCost = pricingTable[model].cachedInput.textInput[isLargeContext ? 1 : 0];
    cacheStorageCost = pricingTable[model].contextCacheStorage.textInput;

    const contextCharSizeInput = contextSizeInput * 4;
    const contextCharSizeOutput = contextSizeOutput * 4;
    for (let queries = 1; queries <= maxQueries; queries++) {
      const singleQueryCost = normalInputCost * contextCharSizeInput + normalOutputCost * contextCharSizeOutput;
      const normalCost = singleQueryCost * queries;

      const firstQueryCost = singleQueryCost;
      const subsequentQueriesCost = cacheInputCost * (queries - 1) * contextCharSizeInput + normalOutputCost * contextCharSizeOutput * queries;
      const storageCost = cacheStorageCost * (cacheRetentionMinutes / 60) * contextCharSizeInput;
      const cacheCost = firstQueryCost + subsequentQueriesCost + storageCost;

      newData.push({ queries, normalCost, cacheCost, });
    }
    setData(newData);
  };

  useEffect(() => {
    calculateCosts();
  }, [model, contextSizeInput, contextSizeOutput, cacheRetentionMinutes, maxQueries]);

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-green-50 shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Gemini キャッシュコスト比較
      </h2>

      <div className="space-y-6 mb-6">
        <div>
          <p className="font-semibold mb-2">モデル選択</p>
          <div className="flex space-x-4">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                className="form-radio"
                name="model"
                value="gemini15Flash"
                checked={model === 'gemini15Flash'}
                onChange={(e) => setModel(e.target.value)}
              />
              <span className="ml-2">Gemini 1.5 Flash</span>
            </label>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                className="form-radio"
                name="model"
                value="gemini15Pro"
                checked={model === 'gemini15Pro'}
                onChange={(e) => setModel(e.target.value)}
              />
              <span className="ml-2">Gemini 1.5 Pro</span>
            </label>
          </div>
        </div>

        <div>
          <label className="font-semibold mb-2 block">
            入力コンテキストサイズ (K): {contextSizeInput}
          </label>
          <input
            type="range"
            min="1"
            max="1000"
            value={contextSizeInput}
            onChange={(e) => setContextSizeInput(Number(e.target.value))}
            onWheel={handleContextSizeInputWheel}
            className="w-full"
          />
        </div>

        <div>
          <label className="font-semibold mb-2 block">
            出力コンテキストサイズ (K): {contextSizeOutput}
          </label>
          <input
            type="range"
            min="1"
            max="8"
            value={contextSizeOutput}
            onChange={(e) => setContextSizeOutput(Number(e.target.value))}
            onWheel={handleContextSizeOutputWheel}
            className="w-full"
          />
        </div>

        <div>
          <label className="font-semibold mb-2 block">
            キャッシュ保持時間 (分): {cacheRetentionMinutes}
          </label>
          <input
            type="range"
            min="1"
            max="180"
            value={cacheRetentionMinutes}
            onChange={(e) => setCacheRetentionMinutes(Number(e.target.value))}
            onWheel={handleCacheRetentionMinutesWheel}
            className="w-full"
          />
        </div>

        <div>
          <label className="font-semibold mb-2 block">
            最大クエリ数: {maxQueries}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={maxQueries}
            onChange={(e) => setMaxQueries(Number(e.target.value))}
            onWheel={handleMaxQueriesWheel}
            className="w-full"
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="queries"
            label={{ value: 'クエリ数', position: 'insideBottomRight', offset: -10 }}
          />
          <YAxis label={{ value: 'コスト ($)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="normalCost"
            stroke="#3B82F6"
            name="通常コスト"
            strokeWidth={3}
          />
          <Line
            type="monotone"
            dataKey="cacheCost"
            stroke="#10B981"
            name="キャッシュコスト"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-4 text-gray-600">
        このグラフは選択されたGeminiモデル（{model === 'flash' ? 'Gemini 1.5 Flash' : 'Gemini 1.5 Pro'}）の
        通常使用とキャッシュ使用のコストを比較しています。キャッシュコストには指定された
        キャッシュ保持時間のストレージコストが含まれています。
        入力コンテキストサイズ {contextSizeInput > 128 ? "> 128K" : "≤ 128K"} と
        出力コンテキストサイズ {contextSizeOutput > 128 ? "> 128K" : "≤ 128K"} では
        異なる価格設定が適用されています。
      </p>
    </div>
  );
};

export default GeminiCachingCostGraph;