from anthropic import Anthropic
from typing import Optional, List, Dict, Tuple
import os
import logging
import json
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Initialize Anthropic client
try:
    anthropic = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
except Exception as e:
    logger.error(f"Failed to initialize Anthropic client: {str(e)}")
    raise

def calculate_similarity_scores(topics: List[str], query: str) -> List[float]:
    """
    Use Claude to calculate similarity scores for multiple topics against a query in a single prompt.
    
    Args:
        topics: List of topic names to compare
        query: Search query to match against topics
        
    Returns:
        List of similarity scores (0-1) in the same order as the input topics
    """
    try:
        # Create a list of topic indices for reference
        topic_list = "\n".join([f"{i}: {topic}" for i, topic in enumerate(topics)])
        
        prompt = f"""You are a similarity scoring system. Analyze the semantic similarity between a search query and multiple topics.

Search Query: "{query}"

Topics to score:
{topic_list}

Return a JSON array of scores, where each score is a number between 0.0 and 1.0 indicating semantic similarity.
- 1.0 means identical or very close meaning
- 0.0 means completely unrelated
- Maintain the same order as the input topics
- Return ONLY the JSON array of numbers, nothing else
- Format example: [0.85, 0.32, 0.91, 0.15]

Scores:"""

        message = anthropic.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,  # Increased for longer lists
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
        
        # Parse the JSON array
        try:
            scores = json.loads(response_text)
            if not isinstance(scores, list) or len(scores) != len(topics):
                logger.error(f"Invalid response format: expected list of {len(topics)} scores")
                return [0.0] * len(topics)
                
            # Ensure all scores are floats between 0 and 1
            scores = [max(0.0, min(1.0, float(score))) for score in scores]
            return scores
            
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from Claude response: '{response_text}'")
            return [0.0] * len(topics)

    except Exception as e:
        logger.error(f"Error calculating similarity scores: {str(e)}")
        return [0.0] * len(topics) 