# 🚀 T7 Learning Hub: Adaptive AI Academy

The **T7 Learning Hub** is an all-in-one, hackathon-ready study command center that transforms how students interact with learning materials. By leveraging advanced AI and a social "Shelf" sharing system, T7 turns passive reading into active, collaborative mastery.

![T7 Dashboard](https://raw.githubusercontent.com/BLITZz-bot/T7-Learning-Hub/main/docs/dashboard.png) *(Placeholder for your image)*

## 🌟 Key Features

### 1. 🧠 Adaptive AI Learning Engine
*   **Multimodal Processing**: Upload PDFs or paste YouTube links to instantly generate study materials.
*   **Personalized Modes**: Toggle between **Story**, **Funny**, **Simple**, or **Exam** modes to adapt the content to your learning style.
*   **Interactive Quizzes**: Auto-generated assessments to track your progress.

### 2. 📚 T7 Library (Private & Public Shelves)
*   **Social Sharing**: Generate unique **6-digit codes** (e.g., `T7-K49X`) to share your curated study shelves with friends.
*   **Collaborative Uploads**: Friends can join a public shelf and contribute their own notes in real-time.
*   **User Isolation**: Every user gets a unique, private ID. Your personal notes stay personal.

### 3. 🧩 T7 Chrome Extension
*   **Instant Sync**: Clip learning materials directly from your browser and sync them to your dashboard.
*   **One-Click Integration**: Connects seamlessly with the T7 Academy ecosystem.

---

## 🛠️ Comprehensive Tech Stack

### 🔹 Core AI & Backend
*   **Engine**: [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous High-Performance Framework)
*   **AI Orchestration**: [LlamaIndex](https://www.llamaindex.ai/) (RAG & Data Framework for LLMs)
*   **LLM Providers**: Multi-provider support including **OpenAI (GPT-4o)**, **Anthropic (Claude 3.5)**, **Google (Gemini 1.5 Pro)**, and **Groq**.
*   **Data Processing**: PyMuPDF & PyPDF for document extraction; `youtube_transcript_api` for video processing.
*   **Task Management**: `tenacity` for robust API retries and `pydantic` for strict data validation.

### 🔹 Frontend Ecosystem
*   **Main Application (T7 Academy)**: 
    *   [Next.js 16+](https://nextjs.org/) (App Router Architecture)
    *   [React 19](https://react.dev/) (Concurrent Rendering)
    *   **Styling**: Tailwind CSS with Framer Motion for premium glassmorphic animations.
    *   **Components**: Lucide Icons, Sonner (Toasts), Mermaid.js (Roadmaps), and Chart.js (Analytics).
*   **Student Dashboard (T7skillup)**: 
    *   [Vite](https://vitejs.dev/) + React 18 for ultra-fast development.
    *   Firebase Web SDK for real-time data sync.

### 🔹 Database & Cloud Infrastructure
*   **Persistence**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (NoSQL Scalable Database).
*   **Object Storage**: [Firebase Storage](https://firebase.google.com/docs/storage) (Secure storage for user uploads).
*   **CI/CD & DevOps**: 
    *   **Docker**: Multi-platform builds (linux/amd64, linux/arm64) using Docker Buildx.
    *   **GitHub Actions**: Automated testing and GHCR (GitHub Container Registry) releases.

---

## 🚀 Professional Execution Guide

Follow these steps to set up a production-grade development environment.

### 1️⃣ Environment Preparation
Ensure you have **Node.js v18+**, **Python 3.11+**, and **Git** installed.

### 2️⃣ Backend Configuration (FastAPI)
1.  Navigate to the academy directory:
    ```bash
    cd "T7 Academy"
    ```
2.  Create and activate a clean virtual environment:
    ```bash
    python -m venv .venv
    # Windows:
    .\.venv\Scripts\activate
    # macOS/Linux:
    source .venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -e ".[server]"
    ```
4.  Setup Environment Variables:
    Create a `.env` file and add your `OPENAI_API_KEY`, `GOOGLE_API_KEY`, and Firebase credentials.
5.  Launch the server:
    ```bash
    python -m deeptutor.api.run_server
    ```

### 3️⃣ Main Web App Setup (Next.js)
1.  Navigate to the web folder:
    ```bash
    cd "T7 Academy/web"
    ```
2.  Install packages:
    ```bash
    npm install --legacy-peer-deps
    ```
3.  Run in development mode:
    ```bash
    npm run dev
    ```

### 4️⃣ Student Dashboard Setup (Vite)
1.  Navigate to the skillup directory:
    ```bash
    cd "T7skillup"
    ```
2.  Install and launch:
    ```bash
    npm install
    npm run dev
    ```

---

## 🏗️ Architecture Overview
The project follows a **Micro-Frontend & Agentic API** pattern:
*   **/T7 Academy**: The core engine providing the RAG pipeline and administrative UI.
*   **/T7skillup**: A dedicated, lightweight student interface for high-performance learning.
*   **/T7-extension**: Bridging the gap between the web and the study hub for seamless content clipping.

---

## 🏆 Hackathon Credits
Developed with ❤️ for the **T7 SkillUp Hackathon**. 

**Lead Developer**: [BLITZz-bot](https://github.com/BLITZz-bot)
