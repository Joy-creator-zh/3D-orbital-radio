# Orbital Radio 🌍📻

**Orbital Radio** 是一款次世代的 3D 交互式全球广播调谐器。在这个令人惊叹的 WebGL 地球上探索数千个实时电台，由 AI 驱动内容导游，并通过社交元宇宙连接世界各地的听众。

![Banner](https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop)

## ✨ 核心功能 (Key Features)

*   **🌏 3D 地球可视化**: 基于 Three.js 打造的沉浸式地球，支持昼夜光照效果与流畅的交互体验。
*   **📡 全球电台接入**: 实时连接全球数万个广播电台（支持 MP3, AAC, HLS 流媒体）。
*   **🤖 AI 智能导游**: 集成 DeepSeek AI，为你提供当前电台的实时内容摘要、情绪分析和城市冷知识。
*   **🧠 情绪导航 (Mood Search)**: 输入 "雨天编程" 或 "东京深夜"，AI 自动为你匹配最合适的电台频率。
*   **💬 社交元宇宙**:
    *   **Live Listeners**: 实时看到地球上其他听众的位置（呼吸灯效果）。
    *   **Message Capsules**: 在世界任何角落留下你的“声音胶囊”，分享此刻的心情与故事。
*   **🎛️ 专业模式 (Pro Mode)**: 专为发烧友设计的短波接收机 UI，包含信号瀑布图、SNR 强度表和真实的调谐底噪模拟。
*   **🌐 双语支持**: 完美支持中文与英文界面一键切换。

## 🛠 技术栈 (Tech Stack)

*   **Core**: React 19, TypeScript, Vite
*   **3D & Graphics**: Three.js, React Three Fiber (R3F), Drei, Custom Shaders
*   **Styling**: Tailwind CSS, Lucide Icons
*   **State**: Zustand
*   **AI**: OpenAI SDK (DeepSeek API)
*   **Audio**: HLS.js, Web Audio API

## 🚀 快速开始 (Getting Started)

### 环境要求
*   Node.js (v16+)

### 安装步骤

1.  **克隆项目**
    ```bash
    git clone https://github.com/Joy-creator-zh/3D-orbital-radio.git
    cd 3D-orbital-radio
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置环境变量**
    在根目录创建 `.env` 文件，填入你的 DeepSeek API Key（用于 AI 功能）：
    ```env
    VITE_DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
    ```

4.  **启动开发服务器**
    ```bash
    npm run dev
    ```

5.  **访问应用**
    打开浏览器访问 `http://localhost:5173`

## 🎮 操作指南

*   **基本操作**: 拖拽旋转地球，滚轮缩放，点击绿点收听电台。
*   **AI 助手**: 播放电台时，侧边栏会自动展示 AI 生成的电台介绍。
*   **发布胶囊**: 按住 **`Shift` + 点击地球** 任意位置，可以留下一条永久的留言胶囊。
*   **专业模式**: 点击左上角的 `PRO MODE` 按钮，体验硬核短波收音机界面。

## 📄 许可证

MIT License

---
*Built with ❤️ by Orbital Team*
