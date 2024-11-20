from anthropic import Anthropic
from typing import Optional, List, Dict, Tuple
import os
import logging
import json
from fastapi import HTTPException
from models import Topic, Entry
from schemas import ProposedTopic, ProposedEntry

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

async def get_proposed_topics(
    kept_topics: List[Topic],
    kept_entries: List[Entry],
    entries_to_categorize: List[Entry],
    instructions: Optional[str] = None
) -> List[str]:
    """
    Get proposed new topics based on entries that need categorization.
    """
    try:
        # If there are no entries to categorize, return default
        if not entries_to_categorize:
            logger.info("No entries to categorize, returning default topic")
            return ["New Topic"]

        # Construct the prompt
        prompt = "You are a topic organization expert. Based on the following information, suggest appropriate new topics for uncategorized entries.\n\n"
        
        if kept_topics:
            prompt += "Currently kept topics and their entries:\n"
            for topic in kept_topics:
                prompt += f"\nTopic: {topic.topic_name}\n"
                topic_entries = [e for e in kept_entries if e.topic_id == topic.topic_id]
                for entry in topic_entries[:3]:  # Show up to 3 examples per topic
                    prompt += f"- {entry.content[:100]}...\n"
        
        prompt += "\nEntries needing categorization:\n"
        for entry in entries_to_categorize:
            prompt += f"- {entry.content[:100]}...\n"
            
        if instructions:
            prompt += f"\nUser instructions for categorization: {instructions}\n"
            
        prompt += "\nPlease suggest 3-5 new topics that would effectively organize the uncategorized entries."
        prompt += "\nConsider the existing topic structure when making suggestions."
        prompt += "\nReturn only the topic names, one per line."
        
        message = anthropic.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            temperature=0.7,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        # Parse response into list of topic names
        topic_names = [
            line.strip() 
            for line in message.content[0].text.split('\n') 
            if line.strip()
        ]
        
        logger.info(f"AI suggested {len(topic_names)} new topics: {topic_names}")
        return topic_names

    except Exception as e:
        logger.error(f"Error getting proposed topics: {str(e)}")
        return ["New Topic"]

async def get_entry_assignments(
    entries: List[Entry],
    proposed_topics: List[ProposedTopic]
) -> List[dict]:
    """
    Get topic assignments for entries using Claude.
    """
    try:
        # Construct the prompt
        prompt = "You are a content categorization expert. Please assign each entry to the most appropriate topic.\n\n"
        
        prompt += "Available topics:\n"
        for topic in proposed_topics:
            prompt += f"- {topic.topic_name}"
            if not topic.is_new:
                prompt += " (existing topic)"
            prompt += "\n"
            
        prompt += "\nEntries to categorize:\n"
        for i, entry in enumerate(entries, 1):
            prompt += f"\n{i}. {entry.content[:200]}...\n"
            
        prompt += "\nFor each entry, provide the topic assignment and confidence score (0-1) in this format:"
        prompt += "\nentry_number|topic_name|confidence_score"
        prompt += "\nProvide exactly one assignment per entry, with no extra text."
        prompt += "\nExample format:"
        prompt += "\n1|Technical Learning|0.95"
        prompt += "\n2|Health and Fitness|0.88"
        
        message = anthropic.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            temperature=0,
            system="You are a content categorization expert. Respond only with entry assignments in the exact format requested, one per line.",
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        # Parse response into assignments
        assignments = []
        response_lines = message.content[0].text.strip().split('\n')
        logger.debug(f"Raw response lines: {response_lines}")
        
        for line in response_lines:
            if '|' not in line:
                continue
            try:
                parts = line.strip().split('|')
                if len(parts) != 3:
                    continue
                    
                entry_num, topic_name, confidence = parts
                entry_num = int(entry_num)
                confidence = float(confidence)
                
                if 1 <= entry_num <= len(entries):
                    assignments.append({
                        'entry_id': entries[entry_num-1].entry_id,
                        'topic_name': topic_name.strip(),
                        'confidence': min(1.0, max(0.0, confidence))
                    })
                    logger.debug(f"Added assignment: Entry {entry_num} -> {topic_name} ({confidence})")
            except (ValueError, IndexError) as e:
                logger.warning(f"Failed to parse line '{line}': {str(e)}")
                continue
                
        logger.info(f"Generated {len(assignments)} entry assignments")
        
        # Verify we have assignments for all entries
        if len(assignments) != len(entries):
            logger.warning(f"Missing assignments: got {len(assignments)}, expected {len(entries)}")
            
        return assignments

    except Exception as e:
        logger.error(f"Error getting entry assignments: {str(e)}")
        return []