from anthropic import Anthropic
from typing import Optional
import os
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Initialize Anthropic client
try:
    anthropic = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
except Exception as e:
    logger.error(f"Failed to initialize Anthropic client: {str(e)}")
    raise

def calculate_similarity_score(text1: str, text2: str) -> float:
    """
    Use Claude to calculate a similarity score between two pieces of text.
    
    Args:
        text1: First text to compare
        text2: Second text to compare
        
    Returns:
        float: Similarity score between 0 and 1, where 1 is most similar
    """
    try:
        prompt = f"""You are a similarity scoring system. Your task is to analyze two pieces of text and return ONLY a number between 0 and 1 indicating their semantic similarity. 

Text 1: "{text1}"
Text 2: "{text2}"

Rules:
- Return ONLY a number between 0.0 and 1.0
- 1.0 means identical or very close meaning
- 0.0 means completely unrelated
- Do not include any other text or explanation
- Format: just the number (e.g., "0.75")

Score:"""

        message = anthropic.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=10,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        # Log the raw response for debugging
        response_text = message.content[0].text.strip()
        logger.debug(f"Raw Claude response: '{response_text}'")
        
        # Extract the score from the response
        try:
            score = float(response_text)
            # Ensure score is between 0 and 1
            score = max(0.0, min(1.0, score))
            return score
        except ValueError:
            logger.error(f"Failed to parse similarity score from Claude response: '{response_text}'")
            return 0.0

    except Exception as e:
        logger.error(f"Error calculating similarity score: {str(e)}")
        return 0.0 