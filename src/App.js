import React from 'react';
import './App.css';
import GeminiCachingCostGraph from './GeminiCachingCostGraph';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Gemini Caching Cost Calculator</h1>
      </header>
      <main>
        <GeminiCachingCostGraph />
      </main>
    </div>
  );
}

export default App;