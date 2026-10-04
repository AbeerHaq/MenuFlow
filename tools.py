"""
tools.py
External Tools for MenuFlow AI Culinary Research Agent:
1. MenuRAGTool: RAG retrieval tool over restaurant dishes, ingredients, and flavor profiles.
2. DuckDuckGoSearchTool: Free web search tool for checking culinary pairings, spice profiles, and ingredient flavors.
"""

import json
import re
from typing import List, Dict, Any, Optional

try:
    from crewai.tools import tool
    HAS_CREWAI = True
except Exception:
    HAS_CREWAI = False
    # Fallback decorator if crewai is loading
    def tool(name_or_func=None, **kwargs):
        def decorator(func):
            func.__tool_name__ = name_or_func if isinstance(name_or_func, str) else getattr(func, '__name__', 'tool')
            return func
        if callable(name_or_func):
            return decorator(name_or_func)
        return decorator

try:
    from duckduckgo_search import DDGS
    HAS_DDGS = True
except Exception:
    HAS_DDGS = False

try:
    from pypdf import PdfReader
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


# ==========================================
# DEFAULT RESTAURANT MENU WITH DETAILED INGREDIENTS
# ==========================================
DEFAULT_MENU = [
    {
        "id": "1",
        "name": "Fire-Grilled Peri-Peri Chicken",
        "category": "Main Entrees",
        "price": 22.50,
        "spice_level": "Hot / Spicy",
        "ingredients": [
            "Boneless chicken thighs",
            "African bird's eye chili (peri-peri)",
            "Smoked paprika",
            "Fresh garlic & ginger marinade",
            "Lemon zest",
            "Oregano",
            "Olive oil",
            "Charred bell peppers"
        ],
        "flavor_profile": "Spicy, smoky, tangy citrus, deeply savory garlic herb char",
        "dietary": ["Gluten-Free", "High-Protein", "Halal"],
        "description": "Tender chicken thighs marinated for 24 hours in fiery peri-peri chilies, garlic, and fresh lemon juice, grilled over open flames."
    },
    {
        "id": "2",
        "name": "Spicy Korean Gochujang Crispy Chicken Bites",
        "category": "Starters & Appetizers",
        "price": 15.00,
        "spice_level": "Medium-Hot",
        "ingredients": [
            "Crispy double-fried chicken breast pieces",
            "Fermented Korean gochujang chili paste",
            "Honey & brown sugar glaze",
            "Toasted sesame seeds",
            "Scallions",
            "Grated ginger",
            "Rice vinegar"
        ],
        "flavor_profile": "Sweet & spicy glaze, umami crunch, savory sesame aroma, sharp ginger bite",
        "dietary": ["Dairy-Free"],
        "description": "Double-crunch chicken tossed in a sticky, sweet & fiery fermented gochujang chili glaze with toasted sesame."
    },
    {
        "id": "3",
        "name": "Crispy Truffle Calamari",
        "category": "Starters & Appetizers",
        "price": 14.50,
        "spice_level": "Mild / Black Pepper",
        "ingredients": [
            "Tender Atlantic squid rings",
            "Black pepper flour dusting",
            "White truffle oil drizzle",
            "Roasted garlic aioli",
            "Fresh lemon wedges",
            "Parsley"
        ],
        "flavor_profile": "Crispy, earthy truffle aroma, savory garlic creaminess, mild cracked pepper zest",
        "dietary": ["Pescatarian"],
        "description": "Flash-fried tender calamari rings infused with aromatic white truffle essence and served with roasted garlic aioli."
    },
    {
        "id": "4",
        "name": "Prime Ribeye Steak (12oz)",
        "category": "Main Entrees",
        "price": 36.00,
        "spice_level": "Mild",
        "ingredients": [
            "USDA Prime 12oz ribeye beef",
            "Rosemary herb compound butter",
            "Charred sea salt & crushed peppercorns",
            "Grilled jumbo asparagus",
            "Garlic & chive mashed potatoes"
        ],
        "flavor_profile": "Rich marbling, buttery, deeply savory beef umami, woodsy rosemary herb notes",
        "dietary": ["Gluten-Free"],
        "description": "Pan-seared USDA Prime ribeye basted in rosemary herb butter, served with charred asparagus and creamy garlic potato mash."
    },
    {
        "id": "5",
        "name": "Truffle Tagliatelle",
        "category": "Pastas",
        "price": 24.00,
        "spice_level": "Non-Spicy",
        "ingredients": [
            "Handmade fresh egg tagliatelle pasta",
            "Wild forest mushrooms (cremini, shiitake, chanterelle)",
            "Black summer truffle shavings",
            "24-month aged Parmigiano-Reggiano",
            "French butter & white wine reduction",
            "Fresh thyme"
        ],
        "flavor_profile": "Rich, earthy, velvety butter creaminess, deep mushroom umami, nutty parmesan",
        "dietary": ["Vegetarian"],
        "description": "Ribbons of silky handmade egg pasta tossed with wild forest mushrooms, black truffle shavings, and aged Parmigiano."
    },
    {
        "id": "6",
        "name": "Neapolitan Margherita Pizza",
        "category": "Woodfired Pizzas",
        "price": 18.00,
        "spice_level": "Non-Spicy",
        "ingredients": [
            "San Marzano tomato sauce DOP",
            "Fior di latte fresh mozzarella",
            "Organic sweet basil leaves",
            "Cold-pressed extra virgin olive oil",
            "Slow-fermented sourdough crust"
        ],
        "flavor_profile": "Sweet-tangy tomato acidity, melted creamy cheese, aromatic herbaceous basil, charred woodfire crust",
        "dietary": ["Vegetarian"],
        "description": "Classic authentic woodfired pizza with crushed San Marzano tomatoes, fresh buffalo mozzarella, and aromatic basil."
    },
    {
        "id": "7",
        "name": "Pan-Roasted Atlantic Salmon",
        "category": "Main Entrees",
        "price": 28.50,
        "spice_level": "Mild",
        "ingredients": [
            "Fresh Atlantic salmon fillet with crispy skin",
            "Lemon dill velouté reduction",
            "Steamed tender asparagus spears",
            "Wild rice pilaf",
            "Capers & white wine"
        ],
        "flavor_profile": "Silky rich omega fats, crispy salty skin, citrus dill brightness, aromatic nutty wild rice",
        "dietary": ["Pescatarian", "Gluten-Free"],
        "description": "Crispy-skin Atlantic salmon fillet over wild rice pilaf, finished with a bright lemon dill reduction."
    },
    {
        "id": "8",
        "name": "Classic Venetian Tiramisu",
        "category": "Desserts & Sweets",
        "price": 9.50,
        "spice_level": "Non-Spicy / Sweet",
        "ingredients": [
            "Savoiardi ladyfinger biscuits",
            "Italian espresso coffee brew",
            "Marsala wine splash",
            "Whipped mascarpone cream",
            "Valrhona dark cocoa powder dusting",
            "Pure vanilla bean"
        ],
        "flavor_profile": "Decadent creaminess, bold roasted coffee bitterness, sweet vanilla, dark chocolate finish",
        "dietary": ["Vegetarian"],
        "description": "Traditional Venetian dessert layered with espresso-soaked ladyfingers, velvety mascarpone cream, and dark Valrhona cocoa."
    },
    {
        "id": "9",
        "name": "Iced Passionfruit Mint Refresher",
        "category": "Artisan Beverages",
        "price": 6.50,
        "spice_level": "Refreshing",
        "ingredients": [
            "Fresh passionfruit pulp & puree",
            "Sparkling San Pellegrino mineral water",
            "Bruised garden mint leaves",
            "Lime juice",
            "Agave nectar",
            "Crushed ice"
        ],
        "flavor_profile": "Exotic tropical tartness, cooling spearmint, effervescent citrus sparkle",
        "dietary": ["Vegan", "Non-Alcoholic", "Gluten-Free"],
        "description": "A vibrant thirst-quencher with real passionfruit pulp, fresh mint leaves, lime, and crisp sparkling mineral water."
    }
]


# ==========================================
# MENU RAG ENGINE CLASS
# ==========================================
class MenuRAGEngine:
    """RAG storage and retrieval engine for restaurant dishes and ingredients."""
    
    def __init__(self):
        self.menu_items = list(DEFAULT_MENU)

    def load_default_menu(self):
        """Reset back to the default Grand Bistro menu."""
        self.menu_items = list(DEFAULT_MENU)
        return len(self.menu_items)

    def load_from_json(self, json_str: str) -> int:
        """Load dishes from JSON string or list."""
        data = json.loads(json_str)
        if isinstance(data, list):
            self.menu_items = data
        elif isinstance(data, dict) and "menu" in data:
            self.menu_items = data["menu"]
        return len(self.menu_items)

    def load_from_text(self, text: str) -> int:
        """Parse raw text/markdown into menu items with ingredients."""
        items = []
        blocks = re.split(r'\n(?=[#*-]|\d+\.|\b[A-Z][a-zA-Z\s]{2,30}:)', text)
        
        for idx, block in enumerate(blocks):
            clean_block = block.strip()
            if not clean_block or len(clean_block) < 5:
                continue

            lines = clean_block.split('\n')
            name = lines[0].strip('#*- 0123456789.').strip()
            
            # Extract ingredients
            ingredients = []
            desc = ""
            price = 15.0
            
            for line in lines[1:]:
                lower_line = line.lower()
                if "ingredient" in lower_line:
                    ing_text = re.sub(r'ingredients?:?', '', line, flags=re.IGNORECASE).strip()
                    ingredients = [i.strip() for i in re.split(r'[,;•-]', ing_text) if i.strip()]
                elif "$" in line:
                    price_match = re.search(r'\$(\d+(?:\.\d{2})?)', line)
                    if price_match:
                        price = float(price_match.group(1))
                else:
                    desc += " " + line.strip()

            if not ingredients and desc:
                # heuristic fallback: split descriptive words
                ingredients = [w.strip() for w in desc.split(',') if len(w.strip()) > 2]

            items.append({
                "id": str(idx + 1),
                "name": name,
                "category": "Chef's Specials",
                "price": price,
                "spice_level": "Varies" if "spicy" in clean_block.lower() else "Mild",
                "ingredients": ingredients or ["Custom chef recipe"],
                "flavor_profile": desc.strip() or "Delicious savory flavor",
                "dietary": [],
                "description": desc.strip() or clean_block
            })

        if items:
            self.menu_items = items
        return len(self.menu_items)

    def load_from_pdf(self, file_bytes: bytes) -> int:
        """Extract text from uploaded PDF and ingest into RAG menu index."""
        if not HAS_PYPDF:
            raise ImportError("pypdf is required to parse PDF menus.")
        
        import io
        pdf_reader = PdfReader(io.BytesIO(file_bytes))
        full_text = ""
        for page in pdf_reader.pages:
            full_text += (page.extract_text() or "") + "\n"
            
        return self.load_from_text(full_text)

    def search_menu(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        RAG similarity & keyword scoring over dish names, ingredients, and flavor profiles.
        Matches user queries like 'spicy chicken', 'truffle pasta', 'sweet dessert'.
        """
        if not self.menu_items:
            return []

        q_terms = [t.lower() for t in re.split(r'[\s,]+', query) if len(t) > 2]
        scored_items = []

        for item in self.menu_items:
            score = 0
            name_lower = item.get("name", "").lower()
            desc_lower = item.get("description", "").lower()
            flavor_lower = item.get("flavor_profile", "").lower()
            spice_lower = item.get("spice_level", "").lower()
            ingredients = [i.lower() for i in item.get("ingredients", [])]
            dietary = [d.lower() for d in item.get("dietary", [])]

            all_searchable_text = f"{name_lower} {desc_lower} {flavor_lower} {spice_lower} {' '.join(ingredients)} {' '.join(dietary)}"

            # Key concept bonuses
            if "spicy" in query.lower() or "hot" in query.lower():
                if "spicy" in spice_lower or "hot" in spice_lower or "chili" in all_searchable_text or "peri-peri" in all_searchable_text or "gochujang" in all_searchable_text:
                    score += 5

            if "chicken" in query.lower() and "chicken" in all_searchable_text:
                score += 6

            if "vegetarian" in query.lower() or "veg" in query.lower():
                if "vegetarian" in dietary or "vegan" in dietary:
                    score += 5

            if "dessert" in query.lower() or "sweet" in query.lower():
                if "dessert" in item.get("category", "").lower() or "sweet" in flavor_lower:
                    score += 5

            for term in q_terms:
                if term in name_lower:
                    score += 4
                elif any(term in ing for ing in ingredients):
                    score += 3
                elif term in flavor_lower:
                    score += 2
                elif term in desc_lower:
                    score += 1

            if score > 0:
                scored_items.append((score, item))

        # Sort by relevance
        scored_items.sort(key=lambda x: x[0], reverse=True)
        
        # If no specific matches, return all menu items up to top_k
        if not scored_items:
            return self.menu_items[:top_k]

        return [item for _, item in scored_items[:top_k]]

    def format_search_results(self, query: str, top_k: int = 4) -> str:
        """Formats RAG results into a clean structured prompt string for LLM/Agents."""
        matches = self.search_menu(query, top_k=top_k)
        if not matches:
            return "No matching dishes found in the restaurant menu."

        output = f"### 🍽️ RAG MENU SEARCH RESULTS (Query: '{query}'):\n\n"
        for idx, item in enumerate(matches, 1):
            ings = ", ".join(item.get("ingredients", []))
            output += (
                f"**Dish #{idx}: {item.get('name')}** (${item.get('price', 0):.2f})\n"
                f"- Category: {item.get('category', 'General')}\n"
                f"- Spice Level: {item.get('spice_level', 'Not specified')}\n"
                f"- Est. Wait Time: {item.get('wait_time', '15-20 mins')}\n"
                f"- Full Ingredients: {ings}\n"
                f"- Flavor Profile: {item.get('flavor_profile', 'N/A')}\n"
                f"- Dietary: {', '.join(item.get('dietary', [])) or 'Standard'}\n"
                f"- Description: {item.get('description', '')}\n\n"
            )
        return output


# Global Singleton for RAG engine
GLOBAL_RAG_ENGINE = MenuRAGEngine()


# ==========================================
# CREWAI & DIRECT CALLABLE TOOLS
# ==========================================

@tool("Menu RAG Retrieval Tool")
def menu_rag_tool(query: str) -> str:
    """
    Useful to search the uploaded restaurant menu for dishes, specific ingredients,
    flavors, spice levels, prices, and dietary tags.
    Pass customer cravings or ingredient queries (e.g. 'spicy chicken', 'truffle pasta', 'vegetarian').
    """
    return GLOBAL_RAG_ENGINE.format_search_results(query, top_k=4)


@tool("DuckDuckGo Culinary Web Search Tool")
def duckduckgo_search_tool(query: str) -> str:
    """
    Useful to search the internet for culinary knowledge, ingredient flavor profiles,
    spice combinations, flavor pairings, and cultural dishes.
    """
    if not HAS_DDGS:
        return "DuckDuckGo search package not installed; relying on internal culinary intelligence."

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(f"food culinary flavor profile {query}", max_results=3))
            if not results:
                return f"No external web search results found for '{query}'."
            
            snippets = [
                f"- [{r.get('title', 'Food Info')}]: {r.get('body', '')}"
                for r in results
            ]
            return "### 🌐 DUCKDUCKGO CULINARY WEB SEARCH RESULTS:\n" + "\n".join(snippets)
    except Exception as e:
        return f"Web search notice: {str(e)[:120]}. Using internal culinary flavor knowledge."
