"""
app.py
Streamlit User Interface for MenuFlow AI Culinary Concierge with RAG and CrewAI.
Ready for direct online deployment to Streamlit Community Cloud.
"""

import os
import streamlit as st
from dotenv import load_dotenv

# Load local environment variables if available
load_dotenv()

from tools import GLOBAL_RAG_ENGINE, DEFAULT_MENU
from research_agent import CulinaryResearchAgent

# ==========================================
# PAGE CONFIGURATION
# ==========================================
st.set_page_config(
    page_title="MenuFlow AI — Smart Culinary Concierge",
    page_icon="🍽️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Safe helper for Streamlit secrets
def get_secret(key: str, default: str = "") -> str:
    try:
        return st.secrets.get(key, os.getenv(key, default))
    except Exception:
        return os.getenv(key, default)

# Check if Gemini key is available in Streamlit Secrets
secret_gemini_key = get_secret("GEMINI_API_KEY", "")
secret_model = get_secret("GEMINI_MODEL", "gemini-1.5-flash")
has_secrets_key = bool(secret_gemini_key and not secret_gemini_key.startswith("your_"))

# Original MenuFlow Branding & Styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    /* Top Header Bar */
    .menuflow-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        padding: 24px;
        border-radius: 24px;
        color: white;
        margin-bottom: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
    }
    .brand-title {
        font-size: 2rem;
        font-weight: 900;
        letter-spacing: -0.03em;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .brand-highlight {
        color: #f97316;
    }
    .brand-subtitle {
        color: #94a3b8;
        font-size: 0.95rem;
        margin-top: 6px;
        font-weight: 500;
    }
    
    /* Recommendation Card Styling */
    .rec-card {
        background: #ffffff;
        border: 1px solid #f1f5f9;
        border-radius: 20px;
        padding: 20px;
        margin-top: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.04);
        border-left: 5px solid #f97316;
    }
    .rec-title {
        font-size: 1.25rem;
        font-weight: 800;
        color: #0f172a;
    }
    .rec-price {
        font-size: 1.25rem;
        font-weight: 900;
        color: #ea580c;
        float: right;
    }
    .tag-spice {
        background-color: #ffedd5;
        color: #c2410c;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
    }
    .tag-cat {
        background-color: #f1f5f9;
        color: #475569;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    /* Buttons in MenuFlow Brand Colors */
    div.stButton > button:first-child {
        border-radius: 14px;
        font-weight: 700;
        font-size: 0.85rem;
        transition: all 0.2s ease-in-out;
    }
    div.stButton > button:first-child:hover {
        border-color: #f97316;
        color: #f97316;
    }
</style>
""", unsafe_allow_html=True)


# ==========================================
# SESSION STATE INITIALIZATION
# ==========================================
if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                "👋 **Welcome to MenuFlow AI Concierge!**\n\n"
                "I am your digital culinary concierge. Tell me what type of food you are thinking of eating "
                "(for example: *'I want something spicy and it should have chicken'* or *'A rich vegetarian pasta with cheese & mushrooms'*), "
                "and I will scrutinize our restaurant's menu and ingredients to recommend the best match!"
            )
        }
    ]

if "menu_loaded" not in st.session_state:
    st.session_state.menu_loaded = "The Grand Bistro (Default Menu)"

if "agent" not in st.session_state:
    st.session_state.agent = CulinaryResearchAgent(
        api_key=secret_gemini_key,
        model_name=secret_model
    )


# ==========================================
# SIDEBAR CONTROLS
# ==========================================
with st.sidebar:
    st.image(
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop&q=80",
        use_container_width=True
    )
    st.markdown("### 🍽️ **MenuFlow AI**")
    st.caption("Multi-Tenant Restaurant Concierge • RAG & CrewAI")

    st.markdown("---")

    # 1. Gemini API Key Configuration
    st.subheader("🔑 LLM Configuration")
    
    if has_secrets_key:
        st.success("🟢 API Key loaded via Streamlit Secrets (`st.secrets`)")
        api_key = secret_gemini_key
    else:
        api_key = st.text_input(
            "Google Gemini API Key",
            value=st.session_state.agent.api_key or "",
            type="password",
            placeholder="AIzaSy...",
            help="When deployed on Streamlit Cloud, add GEMINI_API_KEY in App Settings > Secrets."
        )
        if api_key:
            st.session_state.agent.set_api_key(api_key)
            st.success("✅ Gemini API Key Active")
        else:
            st.info("💡 Tip: Add `GEMINI_API_KEY` to `.streamlit/secrets.toml` or Streamlit Cloud Secrets.")

    model_choice = st.selectbox(
        "Select Model",
        options=["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
        index=0,
        help="gemini-1.5-flash is fast, lightweight, and ideal for menu RAG."
    )
    st.session_state.agent.set_model(model_choice)

    st.markdown("---")

    # 2. Menu RAG Ingestion Section
    st.subheader("📜 Menu Knowledge Base (RAG)")
    
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("🍴 Load Demo Menu", use_container_width=True):
            count = GLOBAL_RAG_ENGINE.load_default_menu()
            st.session_state.menu_loaded = "The Grand Bistro (Default Menu)"
            st.success(f"Loaded {count} default dishes!")
    with col2:
        st.caption(f"Active: **{len(GLOBAL_RAG_ENGINE.menu_items)} dishes**")

    # Upload Custom Menu File
    uploaded_file = st.file_uploader(
        "Upload Restaurant Menu",
        type=["pdf", "txt", "json"],
        help="Upload your restaurant menu with dishes and ingredient breakdowns."
    )

    if uploaded_file is not None:
        try:
            if uploaded_file.name.endswith(".pdf"):
                bytes_data = uploaded_file.read()
                count = GLOBAL_RAG_ENGINE.load_from_pdf(bytes_data)
            elif uploaded_file.name.endswith(".json"):
                text_data = uploaded_file.read().decode("utf-8")
                count = GLOBAL_RAG_ENGINE.load_from_json(text_data)
            else:
                text_data = uploaded_file.read().decode("utf-8")
                count = GLOBAL_RAG_ENGINE.load_from_text(text_data)

            st.session_state.menu_loaded = uploaded_file.name
            st.success(f"✅ Ingested {count} dishes from {uploaded_file.name} into RAG Index!")
        except Exception as e:
            st.error(f"Error reading menu file: {e}")

    # Inspect Loaded Dishes
    with st.expander("🔍 View Active Menu Items & Ingredients"):
        for item in GLOBAL_RAG_ENGINE.menu_items:
            st.markdown(f"**{item.get('name')}** — `${item.get('price', 0):.2f}`")
            st.caption(f"*{item.get('category')}* • Spice: `{item.get('spice_level')}`")
            st.markdown(
                f"<span style='font-size: 0.8rem; color: #475569;'>Ingredients: {', '.join(item.get('ingredients', []))}</span>",
                unsafe_allow_html=True
            )
            st.markdown("---")

    st.markdown("---")
    st.caption("🚀 Built for Hackathon | CrewAI + Google Gemini + Streamlit")


# ==========================================
# MAIN INTERACTION AREA
# ==========================================

# Original MenuFlow Header
st.markdown("""
<div class="menuflow-header">
    <div class="brand-title">
        <span>🍽️ Menu<span class="brand-highlight">Flow</span> AI</span>
    </div>
    <div class="brand-subtitle">
        Intelligent Culinary Concierge powered by <b>RAG (Retrieval-Augmented Generation)</b>, <b>CrewAI Multi-Agents</b>, and <b>Google Gemini</b>.
        Tell the agent what flavors you are thinking of eating, and it will analyze the menu ingredients to recommend the perfect dish.
    </div>
</div>
""", unsafe_allow_html=True)

# Quick Suggestion Chips
st.markdown("**💡 Quick Suggestions:**")
chip_cols = st.columns(4)
suggestion_clicked = None

with chip_cols[0]:
    if st.button("🍗 Spicy with Chicken", use_container_width=True):
        suggestion_clicked = "I want to eat something spicy and it should have chicken. What do you recommend from the menu based on the ingredients?"

with chip_cols[1]:
    if st.button("🍝 Rich Vegetarian Pasta", use_container_width=True):
        suggestion_clicked = "I want a rich, creamy vegetarian pasta with mushrooms and cheese. What matches best?"

with chip_cols[2]:
    if st.button("🥩 Hearty Ribeye Beef", use_container_width=True):
        suggestion_clicked = "I am craving a hearty, tender meat dish with savory herb butter for dinner."

with chip_cols[3]:
    if st.button("☕ Sweet Coffee Dessert", use_container_width=True):
        suggestion_clicked = "I want a decadent sweet dessert with Italian espresso coffee and cocoa."

# Display Chat History
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if "tools_used" in msg:
            with st.expander("🛠️ Agent Execution & Tool Calls Log"):
                for tool_call in msg["tools_used"]:
                    st.markdown(f"- **Tool**: `{tool_call.get('tool')}`")
                    st.caption(f"Query: *{tool_call.get('query')}*")
                    if "status" in tool_call:
                        st.caption(f"Status: {tool_call.get('status')}")

# Chat Input Box
user_prompt = st.chat_input("Tell me what you feel like eating (e.g., 'I want something spicy with chicken')...")

# If suggestion chip clicked, use that as prompt
if suggestion_clicked:
    user_prompt = suggestion_clicked

if user_prompt:
    # 1. Append User Message
    st.session_state.messages.append({"role": "user", "content": user_prompt})
    with st.chat_message("user"):
        st.markdown(user_prompt)

    # 2. Check for API key
    active_key = st.session_state.agent.api_key or secret_gemini_key
    if not active_key:
        with st.chat_message("assistant"):
            error_msg = (
                "⚠️ **Gemini API Key Required**\n\n"
                "Please add `GEMINI_API_KEY` to your Streamlit secrets or enter it in the left sidebar. "
                "You can get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey)."
            )
            st.warning(error_msg)
            st.session_state.messages.append({"role": "assistant", "content": error_msg})
    else:
        st.session_state.agent.set_api_key(active_key)
        # 3. Generate Agent Response
        with st.chat_message("assistant"):
            with st.spinner("🤖 CrewAI Agents are analyzing menu ingredients and culinary flavor profiles..."):
                try:
                    result = st.session_state.agent.research_and_recommend(user_prompt)
                    response_text = result.get("output", "")
                    tool_calls = result.get("tool_calls", [])

                    st.markdown(response_text)

                    # Show Tool Calls Expander
                    if tool_calls:
                        with st.expander("🔍 View Multi-Agent Tool Calls & RAG Retrieval Steps"):
                            for t in tool_calls:
                                st.markdown(f"**Tool:** `{t.get('tool')}`")
                                st.markdown(f"**Query:** *{t.get('query')}*")
                                if "status" in t:
                                    st.caption(f"Outcome: {t.get('status')}")
                                st.markdown("---")

                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": response_text,
                        "tools_used": tool_calls
                    })

                except Exception as err:
                    err_msg = f"❌ **Error running culinary agent:** {str(err)}"
                    st.error(err_msg)
                    st.session_state.messages.append({"role": "assistant", "content": err_msg})
