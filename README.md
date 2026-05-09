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

## 🛠️ Tech Stack

### Frontend
*   **Next.js 14** (App Router)
*   **React** (State management & Hooks)
*   **Vanilla CSS + Tailwind CSS** (Premium glassmorphic design)
*   **Lucide React** (Modern iconography)
*   **Sonner** (Graceful toast notifications)

### Backend
*   **FastAPI** (High-performance Python backend)
*   **Firebase Admin SDK** (Cloud integration)
*   **Uvicorn** (Asynchronous server)

### Database & Storage
*   **Firebase Firestore**: Persistent metadata for shared shelves and user progress.
*   **Firebase Storage**: Secure, partitioned storage for PDFs and study notes.

---

## 📥 Getting Started

### 1. Prerequisites
*   **Node.js** (v18+)
*   **Python 3.10+**
*   **Firebase Project**: You need a `serviceAccountKey.json` from Firebase.

### 2. Backend Setup
```bash
cd "T7 Academy"
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Place your serviceAccountKey.json in the deeptutor/api/ directory
python -m deeptutor.api.run_server
```

### 3. Frontend Setup
```bash
# Terminal 1: Main Web App
cd "T7 Academy/web"
npm install
npm run dev

# Terminal 2: Student Dashboard
cd "T7skillup"
npm install
npm run dev
```

### 4. Extension Setup
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select the `T7-extension` folder.

---

## 🏗️ Architecture
The project is split into three main parts:
- **T7 Academy (Web)**: The primary student portal where libraries are managed and sharing happens.
- **T7skillup**: The interactive learning dashboard for quizzes and AI mode transformations.
- **T7-extension**: The bridge between the web and your personal study hub.

---

## 🏆 Hackathon Credits
Developed with ❤️ for the **T7 SkillUp Hackathon**. 

**Maintained by**: [BLITZz-bot](https://github.com/BLITZz-bot)
