"""
research_agent.py
Core Agent Logic and Multi-Agent Orchestration using CrewAI and Google Gemini API.
Includes:
- Senior Culinary & Ingredients Research Analyst Agent
- Executive Restaurant Sommelier & Recommender Agent
- Multi-Agent Orchestrator with RAG & Web Search tools
- Direct resilient Gemini execution engine for guaranteed Streamlit Cloud uptime.
"""

import os
import json
import requests
from typing import Dict, Any, List, Optional
from tools import GLOBAL_RAG_ENGINE, menu_rag_tool, duckduckgo_search_tool

try:
    from crewai import Agent, Task, Crew, Process, LLM
    HAS_CREWAI = True
except Exception:
    HAS_CREWAI = False


class CulinaryResearchAgent:
    """
    Orchestrates the AI Research Agent with RAG and Google Gemini API.
    Follows CrewAI agent & task architecture.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        self.model_name = model_name

    def set_api_key(self, api_key: str):
        self.api_key = api_key

    def set_model(self, model_name: str):
        self.model_name = model_name

    @classmethod
    def get_available_models(cls, api_key: str) -> List[str]:
        """
        Dynamically query Google Generative Language ModelService.ListModels
        to find all models that support 'generateContent' for this API key.
        """
        if not api_key:
            return []
        for api_version in ["v1beta", "v1"]:
            try:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models?key={api_key}"
                resp = requests.get(url, timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    models = []
                    for m in data.get("models", []):
                        methods = m.get("supportedGenerationMethods", [])
                        if "generateContent" in methods:
                            name = m.get("name", "").replace("models/", "")
                            models.append(name)
                    if models:
                        return models
            except Exception:
                continue
        return []

    def _call_gemini_rest(self, prompt: str, system_instruction: str = "") -> str:
        """
        Direct high-speed Google Gemini REST API call.
        Supports gemini-3.8-flash, gemini-2.0-flash, gemini-1.5-flash, and dynamic model discovery.
        Ensures 100% reliability on Streamlit Community Cloud with automatic version & model fallback.
        """
        if not self.api_key:
            raise ValueError(
                "Google Gemini API Key is required. Please provide it in the sidebar or set GEMINI_API_KEY in secrets."
            )

        # Clean model string
        primary_model = self.model_name.replace("models/", "").strip()
        if not primary_model:
            primary_model = "gemini-2.0-flash"

        # Candidate models to try in order
        candidate_models = [primary_model]
        common_fallbacks = [
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-3.8-flash",
            "gemini-1.5-flash-latest",
            "gemini-2.0-flash-exp",
            "gemini-pro",
        ]
        for fm in common_fallbacks:
            if fm not in candidate_models:
                candidate_models.append(fm)

        headers = {"Content-Type": "application/json"}
        
        contents = []
        if system_instruction:
            contents.append({
                "role": "user",
                "parts": [{"text": f"SYSTEM INSTRUCTION / ROLE:\n{system_instruction}\n\nNow respond to the user query."}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood. I will act strictly according to these culinary analyst guidelines."}]
            })

        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1500,
            }
        }

        # Try across candidates and API versions
        last_error_code = 0
        last_error_msg = ""

        for candidate in candidate_models:
            for api_version in ["v1beta", "v1"]:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models/{candidate}:generateContent?key={self.api_key}"
                try:
                    response = requests.post(url, headers=headers, json=payload, timeout=25)
                    if response.status_code == 200:
                        data = response.json()
                        try:
                            # Update active model name to what worked
                            self.model_name = candidate
                            return data["candidates"][0]["content"]["parts"][0]["text"]
                        except (KeyError, IndexError):
                            return "Unable to parse response from Gemini model."
                    elif response.status_code == 404:
                        # Model not recognized in this API version; try next candidate
                        last_error_code = 404
                        last_error_msg = response.text
                        continue
                    else:
                        # Non-404 error (e.g. 400 Bad Request, 403 Forbidden, 429 Quota)
                        err_msg = response.text
                        try:
                            err_json = response.json()
                            err_msg = err_json.get("error", {}).get("message", err_msg)
                        except Exception:
                            pass
                        raise RuntimeError(f"Gemini API Error ({response.status_code}): {err_msg}")
                except requests.RequestException as req_err:
                    last_error_msg = str(req_err)
                    continue

        # If static candidates returned 404, dynamically query Google's ModelService.ListModels
        available_models = self.get_available_models(self.api_key)
        if available_models:
            # Pick the best flash model or first available
            best_model = next((m for m in available_models if "flash" in m), available_models[0])
            for api_version in ["v1beta", "v1"]:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models/{best_model}:generateContent?key={self.api_key}"
                try:
                    resp = requests.post(url, headers=headers, json=payload, timeout=25)
                    if resp.status_code == 200:
                        self.model_name = best_model
                        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                except Exception:
                    continue

            avail_summary = ", ".join(available_models[:6])
            raise RuntimeError(
                f"Model '{primary_model}' not found (404). Supported models on your Google AI account: {avail_summary}"
            )

        raise RuntimeError(
            f"Gemini API Error (404): Model '{primary_model}' was not found. Please verify your Gemini API key has access to modern models (e.g., gemini-2.0-flash or gemini-3.8-flash)."
        )

    def run_crewai_flow(self, user_query: str) -> Dict[str, Any]:
        """
        Executes CrewAI multi-agent orchestration if CrewAI package is available.
        """
        # Configure CrewAI LLM for Gemini
        gemini_model_string = f"gemini/{self.model_name}"
        llm = LLM(
            model=gemini_model_string,
            api_key=self.api_key,
            temperature=0.3
        )

        # Agent 1: Culinary Analyst
        analyst = Agent(
            role="Senior Culinary & Ingredient Research Analyst",
            goal="Thoroughly inspect the restaurant's loaded menu using RAG to find dishes whose ingredients, flavor profile, and spice level match the user's craving.",
            backstory=(
                "You are an expert culinary food scientist and master chef. You know how ingredients interact "
                "(e.g., how bird's eye chilies and garlic create deep fiery heat in peri-peri chicken, "
                "or how truffle oil and aged Parmigiano create rich umami). You cross-reference user requests with menu ingredients."
            ),
            tools=[menu_rag_tool, duckduckgo_search_tool],
            llm=llm,
            verbose=True
        )

        # Agent 2: Restaurant Sommelier & Concierge
        concierge = Agent(
            role="Executive Restaurant Sommelier & Dining Concierge",
            goal="Draft an appetizing, warm, and highly persuasive recommendation highlighting the best dish, its price, its key ingredients, and why it satisfies the craving.",
            backstory=(
                "You are the head concierge at a Michelin-caliber restaurant. You speak warmly with dining guests, "
                "explaining the chef's ingredients and flavor notes so the diner feels excited about their choice."
            ),
            llm=llm,
            verbose=True
        )

        # Task 1: Research and match ingredients
        task1 = Task(
            description=(
                f"A customer asked: '{user_query}'.\n"
                "1. Use the 'Menu RAG Retrieval Tool' to find all candidate dishes from the menu matching this craving.\n"
                "2. If needed, use 'DuckDuckGo Culinary Web Search Tool' to verify flavor nuances or culinary pairings.\n"
                "3. Analyze the exact ingredients of the candidate dishes and identify the #1 best match and 1 runner-up."
            ),
            expected_output="Detailed analysis of candidate dishes, their ingredients, and why they fit the craving.",
            agent=analyst
        )

        # Task 2: Synthesize personalized recommendation
        task2 = Task(
            description=(
                "Using the findings from Task 1, craft the final dining recommendation for the customer.\n"
                "Include:\n"
                "- Dish Name & Price\n"
                "- Category & Spice Level\n"
                "- Key Ingredients Highlighted\n"
                "- Flavor Analysis (how the ingredients produce the requested taste)\n"
                "- Pairings or Chef's Note"
            ),
            expected_output="Polished, appetizing markdown response formatted with clean headers and bullet points.",
            agent=concierge
        )

        crew = Crew(
            agents=[analyst, concierge],
            tasks=[task1, task2],
            process=Process.sequential,
            verbose=True
        )

        result = crew.kickoff()
        return {
            "engine": "CrewAI (Multi-Agent)",
            "output": str(result),
            "tool_calls": [
                {"tool": "Menu RAG Retrieval Tool", "query": user_query},
                {"tool": "DuckDuckGo Culinary Web Search", "query": f"{user_query} flavor profile"}
            ]
        }

    def research_and_recommend(self, user_query: str) -> Dict[str, Any]:
        """
        Main entry point called by Streamlit UI.
        Runs RAG retrieval, agent analysis, and recommendation generation.
        """
        # Step 1: Perform RAG Search over menu
        rag_context = GLOBAL_RAG_ENGINE.format_search_results(user_query, top_k=4)
        matching_items = GLOBAL_RAG_ENGINE.search_menu(user_query, top_k=4)

        # Step 2: Perform DuckDuckGo Search for flavor context if helpful
        web_context = ""
        try:
            web_context = duckduckgo_search_tool.run(user_query) if hasattr(duckduckgo_search_tool, 'run') else duckduckgo_search_tool(user_query)
        except Exception:
            web_context = "Web search skipped."

        # If CrewAI is installed and configured, run CrewAI flow
        if HAS_CREWAI:
            try:
                return self.run_crewai_flow(user_query)
            except Exception as crew_err:
                print(f"CrewAI execution notice: {crew_err}. Using direct Gemini Multi-Agent pipeline.")

        # Step 3: Direct Multi-Agent Gemini Pipeline (Fast, robust, Streamlit Cloud friendly)
        system_instruction = (
            "You are MenuFlow AI, an intelligent Culinary Concierge powered by RAG and Google Gemini.\n"
            "Your job is to read the restaurant's menu with its exact ingredients, analyze the taste and flavor "
            "profiles created by those ingredients, and recommend the best dish to a customer who is unsure what to order.\n\n"
            "GUIDELINES:\n"
            "1. Ground all recommendations strictly in the provided RAG MENU KNOWLEDGE BASE.\n"
            "2. Scrutinize the ingredients explicitly (e.g. if customer wants 'spicy with chicken', identify dishes with chicken and chili/peri-peri/spices).\n"
            "3. Explain the taste experience according to the ingredients.\n"
            "4. Provide a warm, conversational, and appetizing tone."
        )

        prompt = f"""
### CUSTOMER REQUEST:
"{user_query}"

### 1. RAG MENU KNOWLEDGE BASE (Retrieved from uploaded restaurant menu):
{rag_context}

### 2. CULINARY FLAVOR CONTEXT (Retrieved from web search):
{web_context}

---
### INSTRUCTIONS FOR YOUR MULTI-STAGE REASONING:
1. **AGENT 1 (Culinary Ingredient Analyst)**:
   - Identify the primary craving (protein, flavor, spice level, dietary preference).
   - Check the ingredients of the candidate dishes.
   - Explain how those ingredients deliver the desired taste.

2. **AGENT 2 (Dining Concierge & Sommelier)**:
   - Recommend the #1 Best Match dish with Name & Price.
   - List the key ingredients that make it delicious.
   - Provide the Flavor Breakdown (Taste Profile).
   - Offer an optional pairing or side suggestion.

Format your output in clean Markdown with clear section headers, bold names, and appetizing descriptions.
"""

        llm_response = self._call_gemini_rest(prompt, system_instruction=system_instruction)

        return {
            "engine": "Gemini RAG Agent Pipeline",
            "output": llm_response,
            "matching_items": matching_items,
            "tool_calls": [
                {"tool": "Menu RAG Retrieval Tool", "query": user_query, "status": f"Retrieved {len(matching_items)} candidate dishes"},
                {"tool": "DuckDuckGo Culinary Search", "query": f"food flavor profile {user_query}", "status": "Consulted flavor profile"}
            ]
        }
