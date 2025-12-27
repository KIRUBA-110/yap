# 🔍 Code Visualizer

A **PythonTutor-like** code visualization tool for LeetCode-style algorithms. Watch your code execute step-by-step and see how variables change in real-time!

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🐍 **Python Support** | Execute Python code in-browser via Pyodide (WebAssembly) |
| ⚡ **C Support** | Run C/C++ code instantly using JSCPP interpreter |
| 📊 **Variable Tracking** | See all variables update at each step |
| 🔗 **Reference Detection** | Track which variables point to the same memory (Python) |
| 🎛️ **Timeline Controls** | Step forward, backward, or scrub through execution |
| 📦 **Array Visualization** | View arrays as indexed boxes |

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/leetcode_visualizer.git
cd leetcode_visualizer

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173** in your browser! 🎉

---

## 🎮 How to Use

1. **Select Language** – Click `🐍 Python` or `⚡ C` tab
2. **Write or Load Code** – Use sample buttons or paste your own
3. **Run & Trace** – Click the green button to execute
4. **Explore** – Use timeline controls to step through execution

---

## 📸 Demo

### Two Sum Algorithm (C)
```c
int nums[] = {2, 7, 11, 15};
int target = 9;

for (i = 0; i < n; i++) {
    for (j = i + 1; j < n; j++) {
        if (nums[i] + nums[j] == target) {
            // Found! [0, 1]
        }
    }
}
```

**Variables at Step 12:**
| Variable | Value | Type |
|----------|-------|------|
| `nums` | [2, 7, 11, 15] | array |
| `target` | 9 | int |
| `i` | 0 | int |
| `j` | 1 | int |

---

## 🏗️ Project Structure

```
src/
├── 📁 components/       # UI Components
│   ├── Header.tsx
│   ├── CodeEditor.tsx
│   ├── TimelineControls.tsx
│   ├── VariableCard.tsx
│   └── VisualizationPanel.tsx
├── 📁 constants/        # Sample code snippets
├── 📁 hooks/            # React hooks
│   ├── useCodeRunner.ts # Unified execution
│   ├── usePyodide.ts    # Python engine
│   └── useCpp.ts        # C engine
├── 📁 python/           # Python tracer script
├── 📁 styles/           # CSS files
├── 📁 types/            # TypeScript definitions
└── App.tsx              # Main application
```

---

## 🔧 Tech Stack

| Technology | Purpose |
|------------|---------|
| ⚛️ **React 19** | UI Framework |
| 📘 **TypeScript** | Type Safety |
| ⚡ **Vite** | Build Tool |
| 🐍 **Pyodide** | Python in WebAssembly |
| 🔧 **JSCPP** | C/C++ Interpreter |

---

## 🧠 How It Works

### Python Tracing
Uses `sys.settrace()` to hook into every line execution:
```python
def trace_function(frame, event, arg):
    # Capture locals(), line number, event type
    # Track object IDs for reference detection
```

### C Tracing
Uses JSCPP's debugger API:
```javascript
const debugger = JSCPP.run(code, '', { debug: true });
while (debugger.next()) {
    const line = debugger.nextLine();
    const vars = debugger.variable();
}
```

---

## 📋 Supported Algorithms

### Python Examples
- ✅ Two Sum
- ✅ Reference Tracking Demo

### C Examples
- ✅ Two Sum
- ✅ Binary Search

*More coming soon!*

---

## 🛣️ Roadmap

- [ ] 📝 Monaco Editor integration
- [ ] 🎨 Framer Motion animations
- [ ] ➡️ Pointer arrows for array indices
- [ ] 🌳 Tree/Graph visualization
- [ ] 📱 Mobile responsive design

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. 🍴 Fork the repo
2. 🌿 Create a feature branch
3. 💻 Make your changes
4. 📤 Submit a PR

---

## 📄 License

MIT License - feel free to use this for learning and teaching!

---

## 🙏 Acknowledgments

- [Pyodide](https://pyodide.org/) - Python in the browser
- [JSCPP](https://github.com/nickyc975/JSCPP) - C++ interpreter in JavaScript
- [PythonTutor](https://pythontutor.com/) - Inspiration for this project

---

<div align="center">

**Built with ❤️ for algorithm enthusiasts**

⭐ Star this repo if you find it helpful!

</div>
