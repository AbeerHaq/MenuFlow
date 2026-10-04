"""
research_agent.py
Core Agent Logic and Multi-Agent Orchestration using CrewAI and Groq API.
Includes:
- Senior Culinary & Ingredients Research Analyst Agent
- Executive Restaurant Sommelier & Recommender Agent
- Multi-Agent Orchestrator with RAG & Web Search tools
- Direct resilient Groq ultra-low latency execution engine (openai/gpt-oss-120b)
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
    Orchestrates the AI Culinary Research Agent with RAG and Groq API.
    Default Model: openai/gpt-oss-120b
    """

    @staticmethod
    def normalize_model_name(model_name: str) -> str:
        clean = (model_name or "").strip()
        if not clean or clean in ["gpt-oss", "120b", "gpt-oss-120b"]:
            return "openai/gpt-oss-120b"
        if clean in ["llama", "llama-70b", "llama3"]:
            return "llama-3.3-70b-versatile"
        if clean in ["llama-8b", "instant"]:
            return "llama-3.1-8b-instant"
        return clean

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "openai/gpt-oss-120b"
    ):
        self.api_key = (
            api_key
            or os.getenv("GROQ_API_KEY", "")
        )
        self.model_name = self.normalize_model_name(model_name)

    def set_api_key(self, api_key: str):
        self.api_key = (api_key or "").strip()

    def set_model(self, model_name: str):
        self.model_name = self.normalize_model_name(model_name)

    def _call_groq_rest(self, prompt: str, system_instruction: str = "") -> str:
        """
        Direct high-speed Groq REST API call (OpenAI-compatible).
        Ultra-low latency inference with openai/gpt-oss-120b.
        """
        if not self.api_key:
            raise ValueError(
                "Groq API Key is required. Please add GROQ_API_KEY in Streamlit Cloud Secrets (Settings > Secrets) or enter it in the sidebar."
            )

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        candidates = [self.model_name]
        for fallback in ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
            if fallback not in candidates:
                candidates.append(fallback)

        last_error = ""
        for cand in candidates:
            payload = {
                "model": cand,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 1500
            }
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    self.model_name = cand
                    return data["choices"][0]["message"]["content"]
                elif resp.status_code == 404:
                    last_error = resp.text
                    continue
                else:
                    err_msg = resp.text
                    try:
                        err_json = resp.json()
                        err_msg = err_json.get("error", {}).get("message", err_msg)
                    except Exception:
                        pass
                    raise RuntimeError(f"Groq API Error ({resp.status_code}): {err_msg}")
            except requests.RequestException as req_err:
                last_error = str(req_err)
                continue

        raise RuntimeError(f"Groq API Error: Failed with model '{self.model_name}'. Details: {last_error}")

    def run_crewai_flow(self, user_query: str) -> Dict[str, Any]:
        """
        Executes CrewAI multi-agent orchestration if CrewAI package is available.
        """
        llm = LLM(
            model=f"groq/{self.model_name}",
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
            "engine": f"CrewAI Multi-Agent (Groq: {self.model_name})",
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
                print(f"CrewAI execution notice: {crew_err}. Using direct Groq Multi-Agent pipeline.")

        # Step 3: Direct Multi-Agent LLM Pipeline (Groq - Ultra-low latency)
        system_instruction = (
            "You are MenuFlow AI, an intelligent Culinary Concierge powered by RAG and Groq (openai/gpt-oss-120b).\n"
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

        llm_response = self._call_groq_rest(prompt, system_instruction=system_instruction)

        return {
            "engine": f"Groq Ultra-Fast RAG Agent ({self.model_name})",
            "output": llm_response,
            "matching_items": matching_items,
            "tool_calls": [
                {"tool": "Menu RAG Retrieval Tool", "query": user_query, "status": f"Retrieved {len(matching_items)} candidate dishes"},
                {"tool": "DuckDuckGo Culinary Search", "query": f"food flavor profile {user_query}", "status": "Consulted flavor profile"}
            ]
        }
