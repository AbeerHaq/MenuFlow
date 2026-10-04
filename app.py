"""
app.py
MenuFlow — Multi-Tenant Restaurant Platform & AI Culinary Concierge.
Features:
1. Customer Portal:
   - Identifies dining restaurant and table
   - Customer profile (Name & Phone Number for restaurant contact)
   - AI Culinary Concierge (Groq openai/gpt-oss-120b + RAG on ingredients)
   - Interactive Menu Display with ingredients, wait times & 1-click cart/order
   - Live Order Tracking with estimated wait times
2. Restaurant Admin Dashboard:
   - Live incoming orders stream with customer phone, items, and status progression
   - Menu Management: edit dishes, toggle availability (In Stock / Sold Out), add new dishes
   - Restaurant Settings: name, phone, table count, prep times
3. Pre-loaded with Hackathon Demo Restaurant: 'The Grand Bistro'
"""

import os
import time
from datetime import datetime
import streamlit as st
from dotenv import load_dotenv

# Load local environment variables if present
load_dotenv()

from tools import GLOBAL_RAG_ENGINE, DEFAULT_MENU
from research_agent import CulinaryResearchAgent

# ==========================================
# PAGE CONFIGURATION
# ==========================================
st.set_page_config(
    page_title="MenuFlow — Restaurant Platform & AI Concierge",
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

secret_groq_key = get_secret("GROQ_API_KEY", "")
secret_model = get_secret("GROQ_MODEL", "openai/gpt-oss-120b")
has_secrets_key = bool(secret_groq_key and not secret_groq_key.startswith("your_"))

# ==========================================
# STYLING (Original MenuFlow Brand Design)
# ==========================================
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    /* Top Header Bar */
    .menuflow-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        padding: 22px 28px;
        border-radius: 20px;
        color: white;
        margin-bottom: 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
    }
    .brand-title {
        font-size: 1.85rem;
        font-weight: 900;
        letter-spacing: -0.03em;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .brand-highlight {
        color: #f97316;
    }
    .brand-subtitle {
        color: #94a3b8;
        font-size: 0.95rem;
        margin-top: 4px;
        font-weight: 500;
    }

    /* Restaurant Info Badge */
    .restaurant-badge {
        background: #fff7ed;
        border: 1px solid #fdba74;
        border-radius: 12px;
        padding: 10px 16px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    /* Dish Card Styling */
    .dish-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        transition: transform 0.2s ease;
    }
    .dish-title {
        font-size: 1.15rem;
        font-weight: 800;
        color: #0f172a;
    }
    .dish-price {
        font-size: 1.2rem;
        font-weight: 900;
        color: #ea580c;
        float: right;
    }
    .badge-spice {
        background-color: #ffedd5;
        color: #c2410c;
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 0.72rem;
        font-weight: 700;
    }
    .badge-wait {
        background-color: #f1f5f9;
        color: #475569;
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 0.72rem;
        font-weight: 700;
    }
    
    /* Order Status Pill */
    .status-pending { background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; }
    .status-accepted { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; }
    .status-preparing { background: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; }
    .status-ready { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; }
    .status-completed { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; }

    /* Button Colors */
    div.stButton > button:first-child {
        border-radius: 12px;
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
# INITIALIZE SHARED HACKATHON DEMO STATE
# ==========================================

# 1. Restaurant Profile
if "restaurant" not in st.session_state:
    st.session_state.restaurant = {
        "name": "The Grand Bistro",
        "tagline": "Modern French & Continental Cuisine",
        "location": "Downtown Plaza, 5th Avenue",
        "phone": "+1 (555) 987-6543",
        "table": "Table #4",
        "avg_wait_time": "15-20 mins"
    }

# 2. Customer Info (Name and Phone so restaurant can contact them)
if "customer_name" not in st.session_state:
    st.session_state.customer_name = "Alex Morgan"
if "customer_phone" not in st.session_state:
    st.session_state.customer_phone = "+1 (555) 019-8834"

# 3. Menu Dishes State
if "menu_items" not in st.session_state:
    # Add wait_time and availability to default dishes
    dishes = []
    for d in DEFAULT_MENU:
        item = dict(d)
        item["is_available"] = True
        item["wait_time"] = "15-20 mins"
        if "Pasta" in item.get("category", ""):
            item["wait_time"] = "12-15 mins"
        elif "Steak" in item.get("category", ""):
            item["wait_time"] = "20-25 mins"
        elif "Dessert" in item.get("category", "") or "Drinks" in item.get("category", ""):
            item["wait_time"] = "8-10 mins"
        dishes.append(item)
    st.session_state.menu_items = dishes
    # Sync with RAG engine
    GLOBAL_RAG_ENGINE.menu_items = list(dishes)

# 4. Shopping Cart State
if "cart" not in st.session_state:
    st.session_state.cart = []

# 5. Live Orders State (Shared for Restaurant Admin)
if "orders" not in st.session_state:
    st.session_state.orders = [
        {
            "id": "ORD-101",
            "order_number": "#1041",
            "table": "Table #2",
            "customer_name": "Sarah Connor",
            "customer_phone": "+1 (555) 432-1100",
            "items": [{"name": "Fire-Grilled Peri-Peri Chicken", "quantity": 1, "price": 22.50}],
            "total": 22.50,
            "wait_time": "15 mins",
            "status": "preparing",
            "created_at": "10 mins ago",
            "notes": "Extra peri-peri sauce on the side."
        },
        {
            "id": "ORD-102",
            "order_number": "#1042",
            "table": "Table #5",
            "customer_name": "David Miller",
            "customer_phone": "+1 (555) 789-9922",
            "items": [{"name": "Wild Forest Truffle Fettuccine", "quantity": 2, "price": 21.00}],
            "total": 42.00,
            "wait_time": "12 mins",
            "status": "ready",
            "created_at": "25 mins ago",
            "notes": "No parmesan on one pasta."
        }
    ]

# 6. Customer's Active Placed Order (if placed in current session)
if "current_customer_order_id" not in st.session_state:
    st.session_state.current_customer_order_id = None

# 7. AI Chat Messages
if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                "👋 **Welcome to The Grand Bistro!**\n\n"
                "I am your AI Culinary Concierge powered by Groq and RAG. "
                "Tell me what you feel like eating (e.g., *'I want something spicy with chicken'* or *'A rich vegetarian pasta'*), "
                "and I will check our kitchen's ingredients to recommend the best match!"
            )
        }
    ]

# 8. Agent Instance
if "agent" not in st.session_state:
    st.session_state.agent = CulinaryResearchAgent(
        api_key=secret_groq_key,
        model_name=secret_model
    )


# ==========================================
# SIDEBAR CONTROLS & ROLE SWITCHER
# ==========================================
with st.sidebar:
    st.markdown("### 🧭 **Portal Selector**")
    active_role = st.radio(
        "Choose Your View / Login:",
        options=["🍴 Customer Portal (Dining)", "👨‍🍳 Restaurant Admin Dashboard"],
        index=0,
        help="Switch between customer ordering experience and restaurant management."
    )

    st.markdown("---")
    st.subheader("⚡ Groq Engine Configuration")

    if has_secrets_key:
        st.success("🟢 Groq API Key active (`st.secrets['GROQ_API_KEY']`)")
        st.session_state.agent.set_api_key(secret_groq_key)
    else:
        api_key = st.text_input(
            "Groq API Key",
            value=st.session_state.agent.api_key or "",
            type="password",
            placeholder="gsk_...",
            help="Enter your Groq key from console.groq.com/keys. In Streamlit Cloud, add GROQ_API_KEY in Secrets."
        )
        if api_key:
            st.session_state.agent.set_api_key(api_key)
            st.success("✅ Groq Key Active")
        else:
            st.warning("⚠️ Enter your Groq Key (`gsk_...`) or add `GROQ_API_KEY` to Streamlit Secrets.")

    model_options = [
        "openai/gpt-oss-120b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "Custom Model..."
    ]
    if secret_model and secret_model not in model_options:
        model_options.insert(0, secret_model)

    default_idx = model_options.index(secret_model) if secret_model in model_options else 0
    selected_model = st.selectbox("Select Groq Model", options=model_options, index=default_idx)
    if selected_model == "Custom Model...":
        custom_val = st.text_input("Model Identifier", value="openai/gpt-oss-120b")
        st.session_state.agent.set_model(custom_val.strip() or "openai/gpt-oss-120b")
    else:
        st.session_state.agent.set_model(selected_model)

    st.markdown("---")
    # Quick reset / clear conversation
    if st.button("🗑️ Clear Chat Conversation", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

    st.caption("⚡ MenuFlow AI • **Groq Pure (openai/gpt-oss-120b)**")


# ==========================================
# 1. CUSTOMER PORTAL
# ==========================================
if active_role == "🍴 Customer Portal (Dining)":

    # Restaurant & Table Header Banner
    rest = st.session_state.restaurant
    st.markdown(f"""
    <div class="menuflow-header">
        <div class="brand-title">
            <span>🍽️ Menu<span class="brand-highlight">Flow</span></span>
        </div>
        <div class="brand-subtitle">
            Welcome to <b>{rest['name']}</b> ({rest['location']}) &nbsp;•&nbsp; 
            You are seated at: <span style="color:#fdba74; font-weight:800;">{rest['table']}</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Customer Profile Contact Info Box
    with st.expander("👤 **Customer Contact Details** (Required so restaurant can reach you)", expanded=False):
        c_col1, c_col2 = st.columns([1, 1])
        with c_col1:
            st.session_state.customer_name = st.text_input("Your Full Name", value=st.session_state.customer_name)
        with c_col2:
            st.session_state.customer_phone = st.text_input("Phone Number (SMS / Call for updates)", value=st.session_state.customer_phone)
        st.caption("📱 The restaurant will notify you via phone when your order status updates.")

    # Live Order Tracker if user has placed an order
    if st.session_state.current_customer_order_id:
        active_order = next((o for o in st.session_state.orders if o["id"] == st.session_state.current_customer_order_id), None)
        if active_order:
            st.markdown("### ⏱️ **Your Active Order Status**")
            st_col1, st_col2, st_col3 = st.columns([2, 1, 1])
            with st_col1:
                st.info(f"**Order #{active_order['order_number']}** • Estimated Wait Time: **{active_order['wait_time']}**")
            with st_col2:
                st.metric("Total Amount", f"${active_order['total']:.2f}")
            with st_col3:
                status_color = {
                    "pending": "🟡 Pending Approval",
                    "accepted": "🔵 Accepted by Kitchen",
                    "preparing": "🟠 Now Cooking",
                    "ready": "🟢 Ready for Table!",
                    "completed": "✅ Completed"
                }.get(active_order["status"], active_order["status"])
                st.markdown(f"**Status:** `{status_color}`")
            st.markdown("---")

    # Main Tabs: AI Concierge vs Menu Catalog
    tab_ai, tab_menu, tab_cart = st.tabs([
        "🤖 AI Culinary Concierge (RAG)", 
        "📜 Browse Full Menu", 
        f"🛒 Your Cart ({len(st.session_state.cart)} items)"
    ])

    # ---------------------------------------------
    # TAB 1: AI CULINARY CONCIERGE (RAG + Groq)
    # ---------------------------------------------
    with tab_ai:
        st.markdown("#### **Ask our AI Concierge for Ingredient-Based Recommendations**")
        st.caption("Tell the AI what you want to eat (e.g. *spicy with chicken*, *creamy vegetarian*, *light seafood*). It analyzes actual kitchen ingredients to find your match.")

        # Suggestion Quick Chips
        st.markdown("**💡 Quick Suggestions:**")
        q_cols = st.columns(4)
        quick_query = None
        with q_cols[0]:
            if st.button("🍗 Spicy Chicken", use_container_width=True):
                quick_query = "I want to eat something spicy and it should have chicken. What dishes match based on ingredients?"
        with q_cols[1]:
            if st.button("🍝 Vegetarian Pasta", use_container_width=True):
                quick_query = "I want a rich, creamy vegetarian pasta with cheese and mushrooms."
        with q_cols[2]:
            if st.button("🥩 Tender Beef Steak", use_container_width=True):
                quick_query = "What tender, flavorful beef steak do you have?"
        with q_cols[3]:
            if st.button("☕ Sweet Dessert", use_container_width=True):
                quick_query = "Recommend an authentic sweet Italian dessert with espresso and cocoa."

        # Render conversation history
        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])
                if "tools_used" in msg:
                    with st.expander("🔍 Multi-Agent Tool & RAG Retrieval Log"):
                        for t in msg["tools_used"]:
                            st.markdown(f"- **Tool**: `{t.get('tool')}`")
                            st.caption(f"Query: *{t.get('query')}*")
                            if "status" in t:
                                st.caption(f"Status: {t.get('status')}")

        # Chat Input Box
        user_input = st.chat_input("Tell me what flavors, ingredients, or spice level you crave...")
        if quick_query:
            user_input = quick_query

        if user_input:
            st.session_state.messages.append({"role": "user", "content": user_input})
            with st.chat_message("user"):
                st.markdown(user_input)

            # Check Groq key
            active_key = st.session_state.agent.api_key or secret_groq_key
            if not active_key:
                with st.chat_message("assistant"):
                    err = (
                        "⚠️ **Groq API Key Required**\n\n"
                        "Please add `GROQ_API_KEY` to your Streamlit secrets or enter it in the left sidebar. "
                        "Get a free key instantly at [Groq Console](https://console.groq.com/keys)."
                    )
                    st.warning(err)
                    st.session_state.messages.append({"role": "assistant", "content": err})
            else:
                st.session_state.agent.set_api_key(active_key)
                with st.chat_message("assistant"):
                    with st.spinner("🤖 Groq AI & RAG analyzing kitchen ingredients..."):
                        try:
                            # Run RAG + Groq analysis
                            result = st.session_state.agent.research_and_recommend(user_input)
                            resp_text = result.get("output", "")
                            tool_calls = result.get("tool_calls", [])
                            matching_items = result.get("matching_items", [])

                            st.markdown(resp_text)

                            # Quick 1-Click Order Buttons for matching items
                            if matching_items:
                                st.markdown("##### 🍴 **Direct 1-Click Order Matches:**")
                                match_cols = st.columns(min(3, len(matching_items)))
                                for idx, m_item in enumerate(matching_items[:3]):
                                    with match_cols[idx]:
                                        st.markdown(f"**{m_item.get('name')}**")
                                        st.caption(f"${m_item.get('price', 0):.2f} • ⏱️ {m_item.get('wait_time', '15 mins')}")
                                        if st.button(f"➕ Add to Cart", key=f"ai_add_{m_item.get('name')}_{idx}"):
                                            st.session_state.cart.append(dict(m_item))
                                            st.success(f"Added {m_item.get('name')} to cart!")
                                            st.rerun()

                            st.session_state.messages.append({
                                "role": "assistant",
                                "content": resp_text,
                                "tools_used": tool_calls
                            })
                        except Exception as e:
                            err_msg = f"❌ **Error running culinary agent:** {str(e)}"
                            st.error(err_msg)
                            st.session_state.messages.append({"role": "assistant", "content": err_msg})

    # ---------------------------------------------
    # TAB 2: BROWSE FULL RESTAURANT MENU
    # ---------------------------------------------
    with tab_menu:
        st.markdown("#### **The Grand Bistro — Full Menu**")
        categories = list(set([d.get("category", "Mains") for d in st.session_state.menu_items]))
        selected_category = st.selectbox("Filter by Category", options=["All Categories"] + sorted(categories))

        filtered_dishes = [
            d for d in st.session_state.menu_items
            if selected_category == "All Categories" or d.get("category") == selected_category
        ]

        for dish in filtered_dishes:
            is_avail = dish.get("is_available", True)
            with st.container():
                d_col1, d_col2 = st.columns([3, 1])
                with d_col1:
                    st.markdown(f"### {dish.get('name')}")
                    st.caption(f"*{dish.get('category')}* &nbsp;•&nbsp; ⏱️ Est. Wait: **{dish.get('wait_time', '15 mins')}**")
                    st.markdown(f"**Description:** {dish.get('description', '')}")
                    # Ingredients highlight
                    ing_str = ", ".join(dish.get("ingredients", []))
                    st.markdown(f"<span style='font-size:0.85rem; color:#475569;'><b>Ingredients:</b> {ing_str}</span>", unsafe_allow_html=True)
                    st.markdown(f"<span class='badge-spice'>🌶️ {dish.get('spice_level', 'Mild')}</span> &nbsp; <span class='badge-wait'>⏱️ {dish.get('wait_time', '15 mins')}</span>", unsafe_allow_html=True)

                with d_col2:
                    st.markdown(f"<div style='font-size:1.5rem; font-weight:900; color:#ea580c; text-align:right;'>${dish.get('price', 0):.2f}</div>", unsafe_allow_html=True)
                    if is_avail:
                        if st.button("➕ Add to Cart", key=f"menu_add_{dish.get('id', dish.get('name'))}", use_container_width=True):
                            st.session_state.cart.append(dict(dish))
                            st.success(f"Added {dish.get('name')} to cart!")
                            st.rerun()
                    else:
                        st.button("🚫 Sold Out", disabled=True, key=f"sold_{dish.get('name')}", use_container_width=True)

                st.markdown("---")

    # ---------------------------------------------
    # TAB 3: CART & CHECKOUT
    # ---------------------------------------------
    with tab_cart:
        st.markdown("#### **Your Dining Cart & Checkout**")
        if not st.session_state.cart:
            st.info("Your cart is currently empty. Browse the menu or ask our AI Concierge for recommendations!")
        else:
            cart_total = sum(item.get("price", 0) for item in st.session_state.cart)
            
            # List items in cart
            for i, c_item in enumerate(st.session_state.cart):
                c1, c2, c3 = st.columns([3, 1, 1])
                with c1:
                    st.markdown(f"**{c_item.get('name')}**")
                    st.caption(f"Est. prep: {c_item.get('wait_time', '15 mins')}")
                with c2:
                    st.markdown(f"${c_item.get('price', 0):.2f}")
                with c3:
                    if st.button("❌ Remove", key=f"del_cart_{i}"):
                        st.session_state.cart.pop(i)
                        st.rerun()

            st.markdown("---")
            total_col1, total_col2 = st.columns([2, 1])
            with total_col1:
                st.markdown(f"### Total: **${cart_total:.2f}**")
                st.caption(f"Seated at: **{st.session_state.restaurant['table']}** • Contact: **{st.session_state.customer_name}** ({st.session_state.customer_phone})")
            
            order_notes = st.text_input("Special Kitchen Instructions / Notes", placeholder="e.g. Extra spicy, sauce on the side...")

            # 1-Click Order Button
            if st.button("🚀 Place Order Now", type="primary", use_container_width=True):
                new_id = f"ORD-{int(time.time())}"
                new_order_num = f"#{1043 + len(st.session_state.orders)}"
                new_order = {
                    "id": new_id,
                    "order_number": new_order_num,
                    "table": st.session_state.restaurant["table"],
                    "customer_name": st.session_state.customer_name,
                    "customer_phone": st.session_state.customer_phone,
                    "items": list(st.session_state.cart),
                    "total": cart_total,
                    "wait_time": "15-20 mins",
                    "status": "pending",
                    "created_at": "Just now",
                    "notes": order_notes
                }
                # Add to restaurant orders
                st.session_state.orders.insert(0, new_order)
                st.session_state.current_customer_order_id = new_id
                st.session_state.cart = []
                st.success(f"🎉 Order {new_order_num} placed successfully! The kitchen has been notified.")
                st.rerun()


# ==========================================
# 2. RESTAURANT ADMIN DASHBOARD
# ==========================================
else:
    rest = st.session_state.restaurant
    st.markdown(f"""
    <div class="menuflow-header" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);">
        <div class="brand-title">
            <span>👨‍🍳 Menu<span class="brand-highlight">Flow</span> Restaurant Admin</span>
        </div>
        <div class="brand-subtitle">
            Managing: <b>{rest['name']}</b> &nbsp;•&nbsp; Incoming Live Orders & Kitchen Control
        </div>
    </div>
    """, unsafe_allow_html=True)

    admin_tab1, admin_tab2, admin_tab3 = st.tabs([
        f"🛎️ Live Incoming Orders ({len(st.session_state.orders)})",
        f"📋 Menu & Dish Management ({len(st.session_state.menu_items)} dishes)",
        "⚙️ Restaurant Settings"
    ])

    # ---------------------------------------------
    # ADMIN TAB 1: LIVE ORDERS MANAGEMENT
    # ---------------------------------------------
    with admin_tab1:
        st.markdown("#### **Incoming Live Table Orders**")
        st.caption("Review customer orders, phone contact numbers, special notes, and advance order status.")

        if not st.session_state.orders:
            st.info("No incoming orders yet.")
        else:
            for order in st.session_state.orders:
                with st.expander(
                    f"**Order {order['order_number']}** — {order['table']} — {order['customer_name']} (${order['total']:.2f}) — Status: [{order['status'].upper()}]", 
                    expanded=(order['status'] in ['pending', 'accepted', 'preparing'])
                ):
                    o_c1, o_c2, o_c3 = st.columns([2, 1, 1])
                    with o_c1:
                        st.markdown(f"**Customer:** {order['customer_name']}")
                        st.markdown(f"📞 **Phone (Contact):** `{order['customer_phone']}`")
                        st.markdown(f"📍 **Location:** `{order['table']}` &nbsp;•&nbsp; ⏱️ Wait: **{order['wait_time']}**")
                        if order.get("notes"):
                            st.info(f"**Kitchen Note:** {order['notes']}")
                        
                        st.markdown("**Dishes Ordered:**")
                        for item in order.get("items", []):
                            st.markdown(f"- **{item.get('name')}** (${item.get('price', 0):.2f})")

                    with o_c2:
                        st.metric("Total", f"${order['total']:.2f}")
                        st.caption(f"Placed: {order.get('created_at', 'Recently')}")

                    with o_c3:
                        st.markdown("**Status Workflow:**")
                        curr_status = order["status"]

                        if curr_status == "pending":
                            if st.button("✅ Accept Order", key=f"acc_{order['id']}", use_container_width=True):
                                order["status"] = "accepted"
                                st.rerun()
                            if st.button("❌ Reject Order", key=f"rej_{order['id']}", use_container_width=True):
                                order["status"] = "rejected"
                                st.rerun()

                        elif curr_status == "accepted":
                            if st.button("🔥 Start Preparing", key=f"prep_{order['id']}", use_container_width=True):
                                order["status"] = "preparing"
                                st.rerun()

                        elif curr_status == "preparing":
                            if st.button("🔔 Mark as Ready", key=f"rdy_{order['id']}", use_container_width=True):
                                order["status"] = "ready"
                                st.rerun()

                        elif curr_status == "ready":
                            if st.button("🎉 Complete & Serve", key=f"comp_{order['id']}", use_container_width=True):
                                order["status"] = "completed"
                                st.rerun()

                        elif curr_status == "completed":
                            st.success("✅ Order Fulfilled")

    # ---------------------------------------------
    # ADMIN TAB 2: MENU & DISH MANAGEMENT
    # ---------------------------------------------
    with admin_tab2:
        st.markdown("#### **Menu Catalog & Stock Control**")
        st.caption("Toggle availability (In Stock / Sold Out), adjust prices, or create new dishes. Changes sync directly to the AI RAG index.")

        # Quick Dish In-Stock Toggles
        for dish in st.session_state.menu_items:
            m_c1, m_c2, m_c3, m_c4 = st.columns([3, 1, 1, 1])
            with m_c1:
                st.markdown(f"**{dish.get('name')}** ({dish.get('category')})")
                st.caption(f"Ingredients: {', '.join(dish.get('ingredients', []))[:70]}...")
            with m_c2:
                st.markdown(f"${dish.get('price', 0):.2f}")
            with m_c3:
                is_avail = dish.get("is_available", True)
                new_status = st.toggle("In Stock", value=is_avail, key=f"toggle_{dish.get('name')}")
                dish["is_available"] = new_status
            with m_c4:
                st.caption(f"Wait: {dish.get('wait_time', '15 mins')}")
            st.markdown("---")

        # Add New Dish to Menu
        with st.expander("➕ **Add New Dish to Restaurant Menu**"):
            with st.form("add_dish_form"):
                new_name = st.text_input("Dish Name", placeholder="e.g. Smoky Chipotle Grilled Salmon")
                new_cat = st.selectbox("Category", options=["Starters & Appetizers", "Main Entrees", "Pastas & Risotto", "Steaks & Grills", "Desserts", "Beverages"])
                new_price = st.number_input("Price ($)", min_value=1.0, value=24.0, step=0.5)
                new_wait = st.text_input("Estimated Wait Time", value="15-20 mins")
                new_spice = st.selectbox("Spice Level", options=["Mild", "Medium", "Medium-Hot", "Hot / Spicy", "Extra Fiery"])
                new_ingredients = st.text_area("Ingredients (comma-separated)", placeholder="Salmon fillet, chipotle glaze, roasted corn, lime, cilantro, garlic")
                new_desc = st.text_input("Description", placeholder="Fresh grilled salmon with smoky chipotle pepper glaze.")

                submitted = st.form_submit_button("Add Dish to Kitchen Menu & RAG")
                if submitted and new_name:
                    ing_list = [i.strip() for i in new_ingredients.split(",") if i.strip()]
                    new_dish_obj = {
                        "id": str(len(st.session_state.menu_items) + 1),
                        "name": new_name.strip(),
                        "category": new_cat,
                        "price": float(new_price),
                        "wait_time": new_wait.strip(),
                        "spice_level": new_spice,
                        "ingredients": ing_list,
                        "flavor_profile": f"Flavors of {', '.join(ing_list[:4])}",
                        "description": new_desc.strip(),
                        "is_available": True
                    }
                    st.session_state.menu_items.append(new_dish_obj)
                    # Sync with RAG
                    GLOBAL_RAG_ENGINE.menu_items.append(new_dish_obj)
                    st.success(f"Added '{new_name}' to menu! The AI Concierge now knows about this dish.")
                    st.rerun()

    # ---------------------------------------------
    # ADMIN TAB 3: RESTAURANT SETTINGS
    # ---------------------------------------------
    with admin_tab3:
        st.markdown("#### **Restaurant Profile & Configuration**")
        with st.form("settings_form"):
            s_name = st.text_input("Restaurant Name", value=st.session_state.restaurant["name"])
            s_loc = st.text_input("Location / Address", value=st.session_state.restaurant["location"])
            s_phone = st.text_input("Restaurant Official Phone", value=st.session_state.restaurant["phone"])
            s_wait = st.text_input("Default Kitchen Wait Time", value=st.session_state.restaurant["avg_wait_time"])
            s_table = st.text_input("Demo Table Assigned", value=st.session_state.restaurant["table"])

            save_settings = st.form_submit_button("Save Restaurant Settings")
            if save_settings:
                st.session_state.restaurant["name"] = s_name
                st.session_state.restaurant["location"] = s_loc
                st.session_state.restaurant["phone"] = s_phone
                st.session_state.restaurant["avg_wait_time"] = s_wait
                st.session_state.restaurant["table"] = s_table
                st.success("Restaurant settings updated!")
                st.rerun()
