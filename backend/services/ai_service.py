from anthropic import Anthropic
from typing import Optional, List, Dict, Tuple, Any
import os
import logging
import json
from fastapi import HTTPException, status
from models import Topic, Entry
from schemas import (
    ProposedTopic, ProposedEntry, TopicSuggestion, 
    TopicAssignment, NewTopicProposal, CategorySuggestion
)

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

        # Get existing topic names for filtering
        existing_topic_names = {topic.topic_name.lower() for topic in kept_topics}
        
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
            temperature=0.1,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        # Parse response and filter out duplicates
        suggested_names = [
            line.strip() 
            for line in message.content[0].text.split('\n') 
            if line.strip() and line.strip().lower() not in existing_topic_names
        ]
        
        logger.info("AI suggested topics before filtering: %s", message.content[0].text.split('\n'))
        logger.info("AI suggested topics after filtering: %s", suggested_names)
        
        # For the set difference, calculate it separately to avoid f-string issues
        filtered_out = set(line.strip() for line in message.content[0].text.split('\n')) - set(suggested_names)
        logger.info("Filtered out topics: %s", filtered_out)
        
        return suggested_names

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

# Add new function for quick categorization
async def get_quick_categorization_suggestions(entries: List[Entry], existing_topics: List[Topic]) -> List[dict]:
    """
    Get categorization suggestions for multiple entries.
    Returns suggestions for each entry, including both new and existing topics.
    """
    try:
        # Get all topic names for context
        existing_topic_names = [topic.topic_name.lower() for topic in existing_topics]
        
        # Process each entry
        results = []
        for entry in entries:
            suggestions = []
            
            # Create prompt for this entry
            prompt = f"""Analyze this text entry and suggest appropriate categories for it. Consider both creating new categories and using existing ones.

Text entry: "{entry.content}"

Existing categories:
{chr(10).join(f"- {name}" for name in existing_topic_names)}

Return a JSON array of category suggestions, each with:
- topic_name: suggested category name
- is_new: boolean indicating if this is a new category
- confidence_score: number between 0 and 1 indicating confidence

Format example:
[
    {{"topic_name": "Machine Learning", "is_new": false, "confidence_score": 0.95}},
    {{"topic_name": "Neural Networks", "is_new": true, "confidence_score": 0.85}}
]

Suggestions:"""

            # Get suggestions from Claude
            message = anthropic.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                temperature=0,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Parse response
            try:
                raw_suggestions = json.loads(message.content[0].text.strip())
                
                # Process each suggestion
                for suggestion in raw_suggestions:
                    # Clean up the topic name
                    topic_name = suggestion["topic_name"].strip()
                    is_new = suggestion["is_new"]
                    confidence = float(suggestion["confidence_score"])
                    
                    # For existing topics, try to match with actual topic
                    topic_id = None
                    if not is_new:
                        # Find matching existing topic
                        for topic in existing_topics:
                            if topic.topic_name.lower() == topic_name.lower():
                                topic_id = topic.topic_id
                                topic_name = topic.topic_name  # Use exact name from DB
                                break
                        
                        # If no match found, mark as new
                        if topic_id is None:
                            is_new = True
                    
                    suggestions.append({
                        "topic_id": topic_id,
                        "topic_name": topic_name,
                        "is_new": is_new,
                        "confidence_score": confidence
                    })
                
                # Sort suggestions by confidence
                suggestions.sort(key=lambda x: x["confidence_score"], reverse=True)
                
                # Take top 3 suggestions
                suggestions = suggestions[:3]
                
                results.append({
                    "entry_id": entry.entry_id,
                    "content": entry.content,
                    "suggestions": suggestions
                })
                
            except json.JSONDecodeError:
                logger.error(f"Failed to parse AI response for entry {entry.entry_id}")
                continue
                
        return results
        
    except Exception as e:
        logger.error(f"Error in quick categorization suggestions: {str(e)}")
        raise


    ####### ARCHIVE #######

async def analyze_entries_for_categorization(
    entries: List[Entry],
    existing_topics: List[Topic],
    min_confidence: float,
    max_new_topics: int,
    instructions: Optional[str]
) -> Dict[Entry, List[CategorySuggestion]]:
    """Analyze entries and suggest categorizations"""
    
    try:
        # Format the prompt
        prompt = f"""Analyze these entries and suggest appropriate categorizations.
        
Existing topics:
{chr(10).join(f"- {topic.topic_name}" for topic in existing_topics)}

Entries to categorize:
{chr(10).join(f"Entry {i+1}: {entry.content[:200]}..." for i, entry in enumerate(entries))}

{instructions if instructions else ""}

For each entry, suggest the best topic matches (either existing or new) with confidence scores.
Consider similarity to existing topics and content patterns.
Provide rationale for any new topics suggested.

Return a JSON object with this structure:
{{
    "entries": [
        {{
            "entry_index": 1,
            "suggestions": [
                {{
                    "topic_name": "string",
                    "is_new": boolean,
                    "confidence": float,
                    "rationale": "string",
                    "similar_topics": [
                        {{
                            "topic_name": "string",
                            "confidence": float
                        }}
                    ]
                }}
            ]
        }}
    ]
}}
"""

        message = anthropic.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2000,
            temperature=0.5,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        # Parse AI response
        raw_suggestions = json.loads(message.content[0].text)
        
        # Process suggestions into required format
        processed_suggestions: Dict[Entry, List[CategorySuggestion]] = {}
        
        for entry_data in raw_suggestions["entries"]:
            entry_index = entry_data["entry_index"] - 1  # Convert to 0-based index
            entry = entries[entry_index]
            
            entry_suggestions = []
            for suggestion in entry_data["suggestions"]:
                topic_name = suggestion["topic_name"]
                is_new = suggestion["is_new"]
                confidence = float(suggestion["confidence"])
                
                # For existing topics, try to match with actual topic
                topic_id = None
                if not is_new:
                    for topic in existing_topics:
                        if topic.topic_name.lower() == topic_name.lower():
                            topic_id = topic.topic_id
                            topic_name = topic.topic_name  # Use exact name from DB
                            break
                
                entry_suggestions.append(CategorySuggestion(
                    topic_id=topic_id,
                    topic_name=topic_name,
                    is_new=is_new,
                    confidence_score=confidence
                ))
            
            processed_suggestions[entry] = entry_suggestions
        
        return processed_suggestions

    except Exception as e:
        logger.error(f"Error in AI analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze entries"
        )

async def analyze_message(
    message: str,
    context: List[Dict[str, Any]],
    available_tools: Dict[str, str],
    thread_info: Dict[str, Any]
) -> Dict[str, Dict[str, Any]]:
    """
    Analyzes a user message to determine which tools to use.
    """
    try:
        # Format context for the prompt
        context_str = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in context[-3:]
        ])
        
        # Format tools for the prompt
        tools_str = "\n".join([
            f"- {name}: {desc}"
            for name, desc in available_tools.items()
        ])
        
        prompt = f"""Based on the user's message and conversation context, determine which tools would be helpful to provide a good response.

Context:
{context_str}

Available tools:
{tools_str}

Thread info:
- Thread ID: {thread_info['thread_id']}
- Topic ID: {thread_info.get('topic_id', 'None')}
- Title: {thread_info['title']}

User message: {message}

For each tool you want to use, you must provide all required parameters:
- search_entries requires a 'query' parameter that should capture the key concepts to search for, not just single words
- get_topic requires a 'topic_id' parameter
- get_entries requires a 'topic_id' parameter
- get_topic_stats requires a 'topic_id' parameter

When constructing search queries:
- Use multiple relevant keywords
- Focus on the core concepts, not just individual words
- Consider synonyms and related terms
- Make queries that will find relevant content, not just exact matches

Example search queries:
- "career goals achievements professional growth"
- "family relationships marriage children"
- "health fitness exercise nutrition"
- "learning education study knowledge"

IMPORTANT: Return ONLY a JSON object, with no additional text or explanation.
The JSON object should map tool names to their parameters. Only include tools if you can provide all required parameters.

Example response formats:
{{
    "search_entries": {{"query": "career goals achievements professional"}}
}}

or

{{
    "get_topic": {{"topic_id": 123}},
    "get_entries": {{"topic_id": 123, "limit": 5}}
}}

or

{{}}

Response (JSON only):"""

        logger.debug(f"Sending prompt to AI service:\n{prompt}")
        
        message = anthropic.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            temperature=0,
            system="You are a JSON-only response generator. Return only valid JSON objects with no additional text or explanation. When constructing search queries, use multiple relevant keywords to capture core concepts.",
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        # Log the raw response
        raw_response = message.content[0].text.strip()
        logger.debug(f"Raw AI response:\n{raw_response}")
        
        # Try to extract JSON if there's surrounding text
        try:
            # First try direct JSON parsing
            tool_requests = json.loads(raw_response)
        except json.JSONDecodeError:
            # If that fails, try to find JSON object between curly braces
            import re
            json_match = re.search(r'\{[^{}]*\}', raw_response)
            if json_match:
                try:
                    tool_requests = json.loads(json_match.group())
                    logger.info(f"Successfully extracted JSON from response: {tool_requests}")
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse extracted JSON: {json_match.group()}")
                    return {}
            else:
                logger.error("No JSON object found in response")
                return {}
        
        # Validation code remains the same...
        if not isinstance(tool_requests, dict):
            logger.error(f"AI response is not a dictionary: {raw_response}")
            return {}
            
        valid_requests = {}
        for tool_name, params in tool_requests.items():
            if tool_name not in available_tools:
                logger.warning(f"Unknown tool requested: {tool_name}")
                continue
                
            if not isinstance(params, dict):
                logger.warning(f"Invalid parameters for tool {tool_name}: {params}")
                continue
            
            # Enhanced validation for search queries
            if tool_name == "search_entries":
                if "query" not in params:
                    logger.warning("search_entries tool missing required query parameter")
                    continue
                query = params["query"].strip()
                if len(query.split()) < 2:
                    logger.warning(f"Search query too simple: '{query}'. Needs multiple keywords.")
                    continue
                
            if tool_name in ["get_topic", "get_entries", "get_topic_stats"] and "topic_id" not in params:
                logger.warning(f"{tool_name} tool missing required topic_id parameter")
                continue
            
            valid_requests[tool_name] = params
        
        logger.info(f"Validated tool requests: {valid_requests}")
        return valid_requests
            
    except Exception as e:
        logger.error(f"Error in analyze_message: {str(e)}", exc_info=True)
        return {}

async def generate_response(
    message: str,
    context: List[Dict[str, Any]],
    tool_results: Dict[str, Any],
    thread_info: Dict[str, Any]
) -> str:
    """
    Generates an AI response using the message, context, and tool results.
    """
    try:
        # Format context
        context_str = "\n".join([
            f"{msg['role']}: {msg['content']}"  # Using role consistently
            for msg in context[-3:]
        ])
        
        # Format tool results
        tools_str = ""
        for tool_name, result in tool_results.items():
            tools_str += f"\n{tool_name} results:\n"
            if isinstance(result, dict) and "error" in result:
                tools_str += f"Error: {result['error']}\n"
            else:
                tools_str += f"{json.dumps(result, indent=2)}\n"
        
        prompt = f"""Generate a helpful response to the user's message using the available context and tool results.

Conversation context:
{context_str}

Tool results:{tools_str}

Thread info:
- Thread ID: {thread_info['thread_id']}
- Topic ID: {thread_info.get('topic_id', 'None')}
- Title: {thread_info['title']}

User message: {message}

Generate a clear, helpful response. If tool results show errors, handle them gracefully.
Be concise but informative. If referencing entries or topics, include relevant details from the tool results.

Response:"""

        message = anthropic.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2000,
            temperature=0.7,
            messages=[{
                "role": "user",  # Using role consistently
                "content": prompt
            }]
        )
        
        return message.content[0].text.strip()
        
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        return "I apologize, but I encountered an error while processing your request. Please try again."
