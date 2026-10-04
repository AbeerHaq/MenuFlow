# 🍽️ MenuFlow & MenuFlow AI — Smart QR Restaurant SaaS & Culinary RAG Concierge

**MenuFlow** is a comprehensive, production-ready restaurant digital ordering SaaS platform and AI-powered culinary recommendation engine.

The platform provides:
1. **MenuFlow SaaS Web App**: Full-stack QR digital menu and 5-stage live kitchen order pipeline (React + Vite + Node.js/Express + MongoDB + Socket.io).
2. **MenuFlow AI Concierge**: Streamlit-based AI Chatbot powered by **RAG (Retrieval-Augmented Generation)**, **CrewAI Multi-Agents**, and **Google Gemini** that reads restaurant menus, inspects ingredients, analyzes flavor profiles, and recommends dishes to undecided customers.

---

## 🌟 AI Culinary Concierge (`app.py`)

### 🧠 How RAG & CrewAI Work Together:
- **Menu RAG Indexing**: The restaurant uploads its menu (PDF, TXT, JSON), or uses the pre-loaded Grand Bistro menu. Every dish is indexed with its exact ingredient breakdown, spice level, and flavor profile.
- **Customer Craving Analysis**: When a diner says:
  > *"I want to eat something spicy and it should have chicken."*
- **Agent 1 (Senior Culinary & Ingredient Analyst)**: Uses the `Menu RAG Retrieval Tool` to search for dishes containing chicken, chilies, peppers, or peri-peri marinade. If needed, uses the `DuckDuckGo Web Search Tool` for flavor pairing lookups.
- **Agent 2 (Restaurant Sommelier & Concierge)**: Crafts an appetizing personalized recommendation explaining why the ingredients match the craving, along with spice notes and pairing suggestions.

---

## 📁 Project Structure (Lecture Compliant)

```
restaurant-frontend/
├── app.py                         # Streamlit UI for the AI Concierge
├── research_agent.py              # CrewAI Multi-Agent orchestrator (Analyst + Sommelier)
├── tools.py                       # Menu RAG Retrieval Tool & DuckDuckGo Search Tool
├── requirements.txt               # Dependencies for Streamlit Community Cloud
├── MenuFlow_AI_Colab_Runner.ipynb # One-click Google Colab notebook runner
├── .env.example                   # Environment variable template
├── backend/                       # Node.js + Express + MongoDB + Socket.io API
│   ├── config/                    # Database (Mongo + in-memory fallback) & seeder
│   ├── middleware/                # JWT auth, role guards (owner vs admin)
│   ├── models/                    # Restaurant, Table, Category, MenuItem, Order, User
│   ├── routes/                    # Public QR menu, Owner CRUD, Admin analytics
│   ├── server.js                  # Socket.io live kitchen pipeline server
│   └── test-e2e.js                # 25-point automated test suite
├── src/                           # React 18 + Tailwind CSS Owner & Admin Frontend
├── public/                        # Sound alerts (`new-order.mp3`)
├── package.json                   # Frontend dependencies
└── README.md                      # Documentation & deployment guide
```

---

## 🚀 Running the Streamlit AI Concierge

### Local Run:
1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Run Streamlit**:
   ```bash
   streamlit run app.py
   ```
3. Enter your Google Gemini API Key in the sidebar (get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey)).

### Google Colab Run:
Open `MenuFlow_AI_Colab_Runner.ipynb` in Google Colab, click **Run All**, and open the generated LocalTunnel public URL!

### Streamlit Community Cloud (Deploy Online):
1. Push this repository to GitHub.
2. Go to [share.streamlit.io](https://share.streamlit.io).
3. Select your repository, set the main file path to `app.py`, and deploy!
4. (Optional) In **App Settings > Secrets**, add:
   ```toml
   GEMINI_API_KEY = "your_key_here"
   ```

---

## ⚡ Running the MenuFlow SaaS Full-Stack Platform

### 1. Start Backend Server (Port 5000)
```bash
cd backend
npm install
npm start
```

### 2. Start Frontend (Port 5173)
```bash
npm install
npm run dev
```

### Demo Accounts:
| Role | Email | Password | URL |
| :--- | :--- | :--- | :--- |
| **Restaurant Owner** | `owner@menuflow.com` | `password123` | `http://localhost:5173/dashboard/orders` |
| **Platform Admin** | `admin@menuflow.com` | `admin123` | `http://localhost:5173/admin/restaurants` |
| **Customer QR Menu** | *(Scan via table QR)* | *No login* | `http://localhost:5173/r/grand-bistro/t/<token>` |
