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
            max_tokens=1000,
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

async def suggest_topic_name(text: str) -> str:
    """
    Use Claude to suggest a topic name based on the content.
    
    Args:
        text: The text content to analyze
        
    Returns:
        str: A suggested topic name
    """
    try:
        prompt = f"""Based on the following user provided entry, suggest a concise and relevant topic name (2-5 words) that would be appropriate for this entry to help the user categorize it.
Return ONLY the suggested name, nothing else.

Text: {text[:500]}...

Topic name:"""

        message = anthropic.messages.create(
            #model="claude-3-haiku-20240307",
            model="claude-3-sonnet-20240229",
            max_tokens=50,
            temperature=0.7,
            system="You are a helpful assistant that suggests concise, relevant topic names based on text content. Keep suggestions between 2-5 words. Return only the topic name using captialization consistent with existing topics.",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        suggested_name = message.content[0].text.strip()
        logger.debug(f"Suggested topic name: '{suggested_name}'")
        return suggested_name
        
    except Exception as e:
        logger.error(f"Error in AI topic suggestion: {str(e)}")
        return "New Topic"

async def suggest_topic_name_with_context(text: str, existing_topics: List[str]) -> str:
    """
    Use Claude to suggest a topic name based on the content and existing topics.
    
    Args:
        text: The text content to analyze
        existing_topics: List of user's existing topic names
        
    Returns:
        str: A suggested topic name
    """
    try:
        # Format existing topics for the prompt
        topics_list = "\n".join([f"- {topic}" for topic in existing_topics])
        
        prompt = f"""Based on the following user provided entry and existing topic list, suggest a new concise and relevant topic name (2-5 words).
Use capitalization consistent with existing topics, noting especially whether existing topics more frequently use title case or sentence case. Ignore captitalization of Entry text

User's existing topics:
{topics_list}

Entry text: {text[:500]}...

Return ONLY the suggested topic name, nothing else."""

        message = anthropic.messages.create(
            #model="claude-3-haiku-20240307",
            model="claude-3-sonnet-20240229",
            max_tokens=50,
            temperature=0.1,
            system="You are a helpful assistant that suggests concise, relevant topic names based on text content. Keep suggestions between 2-5 words. Return only the topic name. Suggest existing topics when appropriate.",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        suggested_name = message.content[0].text.strip()
        logger.info(f"Suggested topic name with context: '{suggested_name}'")
        return suggested_name
        
    except Exception as e:
        logger.error(f"Error in AI topic suggestion with context: {str(e)}")
        return "New Topic" 
        return "New Topic" 