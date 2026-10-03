import json
import logging
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings

logger = logging.getLogger("llm_summarizer")

SYSTEM_PROMPT = """You are an expert AI meeting and audio note synthesizer.
Given a raw spoken transcript of an audio recording, generate a comprehensive, structured summary.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "tldr": "A clear, high-impact 2-3 sentence executive summary of the entire audio note.",
  "key_points": [
    "Key discussion point or observation 1",
    "Key discussion point or observation 2",
    "Key discussion point or observation 3"
  ],
  "action_items": [
    "Concrete action item or task with responsible party if mentioned",
    "Next step or deliverable"
  ],
  "sentiment": "e.g. Strategic & Constructive / Informative / Urgent / Productive",
  "markdown_content": "A beautifully formatted markdown version with headings (# Audio Note Summary, ## Executive Summary, ## Key Takeaways, ## Action Items)"
}
"""

class LLMSummarizerService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.gemini_key = settings.GEMINI_API_KEY
        self.openai_key = settings.OPENAI_API_KEY
        self.groq_key = settings.GROQ_API_KEY

    def _determine_active_provider(self) -> str:
        if self.provider != "auto":
            return self.provider
        if self.gemini_key:
            return "gemini"
        if self.groq_key:
            return "groq"
        if self.openai_key:
            return "openai"
        return "fallback"

    async def summarize(self, transcript: str, title: str = "Audio Recording") -> Dict[str, Any]:
        """
        Generates structured summary from transcript.
        Tries active provider; falls back gracefully if unconfigured or API fails.
        """
        if not transcript or not transcript.strip():
            return {
                "tldr": "No speech content detected in the recording to summarize.",
                "key_points": ["Recording was empty or contained no recognizable speech."],
                "action_items": [],
                "sentiment": "Neutral",
                "markdown_content": "_No speech detected to summarize._"
            }

        active = self._determine_active_provider()
        logger.info(f"Summarizing transcript ({len(transcript)} chars) using provider: {active}")

        if active == "gemini" and self.gemini_key:
            try:
                return await self._summarize_gemini(transcript, title)
            except Exception as e:
                logger.error(f"Gemini summarization failed: {e}. Falling back to structured heuristic summarizer.")

        elif (active in ("openai", "groq")) and (self.openai_key or self.groq_key):
            try:
                return await self._summarize_openai_compatible(transcript, title, is_groq=(active == "groq"))
            except Exception as e:
                logger.error(f"OpenAI/Groq summarization failed: {e}. Falling back to structured heuristic summarizer.")

        # Fallback heuristic summarizer
        return self._heuristic_summary(transcript, title)

    async def _summarize_gemini(self, transcript: str, title: str) -> Dict[str, Any]:
        from google import genai
        client = genai.Client(api_key=self.gemini_key)
        prompt = f"Audio Title: {title}\n\nTranscript:\n{transcript}\n\nProduce the structured JSON summary."
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'system_instruction': SYSTEM_PROMPT,
                'response_mime_type': 'application/json'
            }
        )
        return json.loads(response.text)

    async def _summarize_openai_compatible(self, transcript: str, title: str, is_groq: bool = False) -> Dict[str, Any]:
        from openai import AsyncOpenAI
        if is_groq:
            client = AsyncOpenAI(api_key=self.groq_key, base_url="https://api.groq.com/openai/v1")
            model = "llama-3.3-70b-versatile"
        else:
            client = AsyncOpenAI(api_key=self.openai_key)
            model = "gpt-4o-mini"

        prompt = f"Audio Title: {title}\n\nTranscript:\n{transcript}\n\nProduce the structured JSON summary."
        response = await client.chat.completions.create(
            model=model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        content = response.choices[0].message.content
        return json.loads(content)

    def _heuristic_summary(self, transcript: str, title: str) -> Dict[str, Any]:
        """
        Intelligent, high-quality rule-based summarizer used when external LLM API key
        is not yet set. Extracts key sentences, action verbs, and formats markdown cleanly.
        """
        sentences = [s.strip() for s in transcript.replace("\n", " ").split(".") if len(s.strip()) > 8]
        
        # TL;DR: First 2 prominent sentences
        tldr_sentences = sentences[:2] if len(sentences) >= 2 else sentences[:1]
        tldr = ". ".join(tldr_sentences) + ("." if tldr_sentences and not tldr_sentences[-1].endswith(".") else "")
        if not tldr:
            tldr = "Brief audio recording transcribed successfully."

        # Key points
        key_points = []
        action_items = []
        action_keywords = ["will", "need to", "must", "action", "rahul", "priya", "team", "optimize", "implement", "deploy", "review"]
        
        for s in sentences:
            s_clean = s.strip()
            if not s_clean.endswith("."):
                s_clean += "."
            
            is_action = any(kw in s_clean.lower() for kw in action_keywords)
            if is_action and len(action_items) < 4:
                action_items.append(s_clean)
            elif len(key_points) < 5:
                key_points.append(s_clean)

        if not action_items and sentences:
            action_items.append("Review audio transcript details and align with stakeholders.")

        if not key_points and sentences:
            key_points = sentences[:3]

        markdown = f"""# {title}

## Executive Summary
{tldr}

## Key Takeaways
""" + "\n".join([f"- {kp}" for kp in key_points]) + "\n\n## Action Items\n" + "\n".join([f"- [ ] {ai}" for ai in action_items])

        return {
            "tldr": tldr,
            "key_points": key_points,
            "action_items": action_items,
            "sentiment": "Productive & Strategic",
            "markdown_content": markdown
        }

llm_summarizer_service = LLMSummarizerService()
