import { useState } from 'react';
import { useCodeRunner, type Language } from './hooks/useCodeRunner';
import type { TraceResult } from './types/types';
import './App.css';

// Sample Python code - Two Sum
const PYTHON_TWO_SUM = `def twoSum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

result = twoSum([2, 7, 11, 15], 9)
`;

// Sample Python code - Reference test
const PYTHON_REFERENCE = `# Reference tracking demo
a = [1, 2, 3]
b = a           # b points to same list as a
b[0] = 999      # Modifying b also modifies a
c = [1, 2, 3]   # c is a NEW list (different ID)
`;

// Sample C code - Two Sum
const C_TWO_SUM = `#include <stdio.h>

int main() {
    int nums[] = {2, 7, 11, 15};
    int target = 9;
    int n = 4;
    int i, j;
    
    for (i = 0; i < n; i++) {
        for (j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                printf("Found: [%d, %d]\\n", i, j);
                return 0;
            }
        }
    }
    return -1;
}
`;

// Sample C code - Binary Search
const C_BINARY_SEARCH = `#include <stdio.h>

int main() {
    int arr[] = {1, 3, 5, 7, 9, 11, 13};
    int n = 7;
    int target = 7;
    int left = 0;
    int right = n - 1;
    int mid;
    
    while (left <= right) {
        mid = left + (right - left) / 2;
        if (arr[mid] == target) {
            printf("Found at index: %d\\n", mid);
            return mid;
        }
        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    printf("Not found\\n");
    return -1;
}
`;

const SAMPLE_CODES: Record<Language, { name: string; code: string }[]> = {
  python: [
    { name: 'Two Sum', code: PYTHON_TWO_SUM },
    { name: 'Reference Test', code: PYTHON_REFERENCE },
  ],
  c: [
    { name: 'Two Sum', code: C_TWO_SUM },
    { name: 'Binary Search', code: C_BINARY_SEARCH },
  ],
};

function App() {
  const { isLoading, engineStatus, runCode } = useCodeRunner();
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState(PYTHON_TWO_SUM);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(SAMPLE_CODES[newLanguage][0].code);
    setResult(null);
    setCurrentStep(0);
  };

  const handleRunCode = async () => {
    const traceResult = await runCode(code, language);
    setResult(traceResult);
    setCurrentStep(0);
    console.log('Trace Result:', traceResult);
  };

  const currentFrame = result?.frames[currentStep];
  const currentEngine = engineStatus[language];

  return (
    <div className="app">
      <header className="header">
        <h1>🔍 Code Visualizer</h1>

        {/* Language Tabs */}
        <div className="language-tabs">
          <button
            className={`tab ${language === 'python' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('python')}
          >
            🐍 Python
          </button>
          <button
            className={`tab ${language === 'c' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('c')}
          >
            ⚡ C
          </button>
        </div>

        <div className="status">
          {currentEngine.isLoading && <span className="loading">⏳ Loading...</span>}
          {currentEngine.isReady && !currentEngine.error && <span className="ready">✅ Ready</span>}
          {currentEngine.error && (!result || result.frames.length === 0) && (
            <span className="error">❌ {currentEngine.error}</span>
          )}
        </div>
      </header>

      <main className="main">
        {/* Left Panel: Code Editor */}
        <div className="panel editor-panel">
          <div className="panel-header">
            <h2>{language === 'python' ? 'Python' : 'C'} Code</h2>
            <div className="button-group">
              {SAMPLE_CODES[language].map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => setCode(sample.code)}
                  className="btn btn-secondary"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="code-editor"
            spellCheck={false}
          />
          <button
            onClick={handleRunCode}
            disabled={isLoading || (language === 'python' && !currentEngine.isReady)}
            className="btn btn-primary run-btn"
          >
            ▶ Run & Trace
          </button>
          {language === 'python' && !currentEngine.isReady && (
            <p className="engine-note">
              ⏳ Pyodide is loading (~5-10 seconds first time)...
            </p>
          )}
        </div>

        {/* Right Panel: Visualization */}
        <div className="panel viz-panel">
          <div className="panel-header">
            <h2>Execution Trace</h2>
            {result && (
              <span className="frame-count">
                {result.frames.length} frames captured
              </span>
            )}
          </div>

          {/* Timeline Controls */}
          {result && result.frames.length > 0 && (
            <div className="timeline-controls">
              <button
                onClick={() => setCurrentStep(0)}
                disabled={currentStep === 0}
                className="btn btn-sm"
              >
                ⏮ Start
              </button>
              <button
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                disabled={currentStep === 0}
                className="btn btn-sm"
              >
                ◀ Prev
              </button>
              <span className="step-indicator">
                Step {currentStep + 1} / {result.frames.length}
              </span>
              <button
                onClick={() =>
                  setCurrentStep((s) => Math.min(result.frames.length - 1, s + 1))
                }
                disabled={currentStep === result.frames.length - 1}
                className="btn btn-sm"
              >
                Next ▶
              </button>
              <button
                onClick={() => setCurrentStep(result.frames.length - 1)}
                disabled={currentStep === result.frames.length - 1}
                className="btn btn-sm"
              >
                End ⏭
              </button>
            </div>
          )}

          {/* Timeline Slider */}
          {result && result.frames.length > 0 && (
            <input
              type="range"
              min={0}
              max={result.frames.length - 1}
              value={currentStep}
              onChange={(e) => setCurrentStep(Number(e.target.value))}
              className="timeline-slider"
            />
          )}

          {/* Current Frame Details */}
          {currentFrame && (
            <div className="frame-details">
              <div className="frame-meta">
                <span className="meta-item">
                  <strong>Line:</strong> {currentFrame.line}
                </span>
                <span className="meta-item">
                  <strong>Event:</strong> {currentFrame.event}
                </span>
                <span className="meta-item">
                  <strong>Function:</strong> {currentFrame.function}
                </span>
              </div>

              <h3>Variables</h3>
              <div className="variables-grid">
                {Object.entries(currentFrame.variables).map(([name, data]) => (
                  <div key={name} className="variable-card">
                    <div className="var-name">{name}</div>
                    <div className="var-type">{data.type}</div>
                    <div className="var-value">
                      {data.type === 'list' || data.type === 'array' ? (
                        <div className="array-viz">
                          {(data.value as any[]).map((item, idx) => (
                            <div key={idx} className="array-cell">
                              <div className="cell-index">{idx}</div>
                              <div className="cell-value">
                                {typeof item.value === 'object'
                                  ? JSON.stringify(item.value)
                                  : String(item.value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span>{JSON.stringify(data.value)}</span>
                      )}
                    </div>
                    <div className="var-id">id: {data.id}</div>
                  </div>
                ))}
              </div>

              {currentFrame.return_value && (
                <div className="return-value">
                  <strong>Return Value:</strong>{' '}
                  {typeof currentFrame.return_value.value === 'string'
                    ? currentFrame.return_value.value
                    : JSON.stringify(currentFrame.return_value.value)}
                </div>
              )}
            </div>
          )}

          {/* Error Display - only show if we have no frames (real failure) */}
          {result && !result.success && result.frames.length === 0 && (
            <div className="error-box">
              <strong>Error:</strong> {result.error}
            </div>
          )}

          {/* Raw JSON Output (for debugging) */}
          {result && (
            <details className="raw-output">
              <summary>Raw JSON Output</summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
