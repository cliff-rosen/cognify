from sqlalchemy.orm import Session
from models import Topic, Entry
from schemas import (
    TopicCreate, TopicUpdate, TopicSearchResponse, TopicSuggestionResponse, 
    ProposedEntry, ProposedTopic, AutoCategorizeResponse, ApplyCategorizeRequest, 
    TopicResponse, QuickCategorizeResponse, TopicSuggestion, TopicAssignment, 
    ExistingTopicAssignment, NewTopicProposal, UnassignedEntry, CategoryMetadata, 
    QuickCategorizeUncategorizedRequest, QuickCategorizeUncategorizedResponse
)
from fastapi import HTTPException, status
from typing import Optional, List, Dict
import logging
from services import ai_service
from datetime import datetime
import random
from sqlalchemy import func
import time
from statistics import mean
from collections import defaultdict

logger = logging.getLogger(__name__)


################## CRUD Services ##################

async def create_topic(db: Session, topic: TopicCreate, user_id: int):
    db_topic = Topic(topic_name=topic.topic_name, user_id=user_id)
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic 


async def get_topics(db: Session, user_id: int):
    logger.info(f"Getting topics for user {user_id}")
    
    # Get topics with entry counts using a subquery
    logger.info(f"Getting entry counts")
    entry_counts = (
        db.query(
            Entry.topic_id, 
            func.count(Entry.entry_id).label('entry_count')
        )
        .filter(Entry.user_id == user_id)
        .group_by(Entry.topic_id)
        .subquery()
    )
    
    # Get topics with their counts
    logger.info(f"Getting topics with counts")
    topics = (
        db.query(Topic, func.coalesce(entry_counts.c.entry_count, 0).label('entry_count'))
        .outerjoin(entry_counts, Topic.topic_id == entry_counts.c.topic_id)
        .filter(Topic.user_id == user_id)
        .all()
    )
    
    # Get uncategorized count
    uncategorized_count = (
        db.query(func.count(Entry.entry_id))
        .filter(Entry.user_id == user_id, Entry.topic_id.is_(None))
        .scalar() or 0
    )
    
    # Convert to list of Topic objects with entry_count attribute
    result = []
    
    # Add uncategorized "topic" first
    logger.info(f"Adding uncategorized topic with count {uncategorized_count}")
    result.append(TopicResponse(
        topic_id=0,  # UNCATEGORIZED_TOPIC_ID
        topic_name="Uncategorized",
        user_id=user_id,
        creation_date=datetime.utcnow(),
        entry_count=uncategorized_count,
        is_uncategorized=True
    ).model_dump())
    
    # Add regular topics with their counts
    for topic, count in topics:
        topic.entry_count = count
        result.append(topic)
    
    return result


async def update_topic(db: Session, topic_id: int, topic_update: TopicUpdate, user_id: int):
    """Update a topic if it belongs to the user"""
    try:
        # Get existing topic
        db_topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
        if not db_topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )
            
        # Verify ownership
        if db_topic.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Topic belongs to another user"
            )
            
        # Update only if new value provided (PATCH behavior)
        if topic_update.topic_name is not None:
            db_topic.topic_name = topic_update.topic_name
            
        db.commit()
        db.refresh(db_topic)
        logger.info(f"Updated topic {topic_id} for user {user_id}")
        return db_topic
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating topic: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update topic"
        )


async def delete_topic(db: Session, topic_id: int, user_id: int):
    """Delete a topic and all its associated entries if it belongs to the user"""
    try:
        # Get existing topic
        db_topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
        if not db_topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )
            
        # Verify ownership
        if db_topic.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Topic belongs to another user"
            )
            
        # Delete associated entries first
        db.query(Entry).filter(Entry.topic_id == topic_id).delete()
        
        # Delete the topic
        db.delete(db_topic)
        db.commit()
        
        logger.info(f"Deleted topic {topic_id} and its entries for user {user_id}")
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting topic: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete topic"
        )


################## AI Enabled Services ##################

def calculate_topic_match_score(topic_name: str, query: str) -> float:
    """
    Calculate how well a topic name matches a search query using AI.
    
    Args:
        topic_name: The name of the topic to check
        query: The search query to match against
        
    Returns:
        float: Score indicating how well the topic matches (0-1)
    """
    try:
        return ai_service.calculate_similarity_score(topic_name, query)
    except Exception as e:
        logger.error(f"Error calculating topic match score: {str(e)}")
        return 0.0


async def get_quick_categorization(
    db: Session, 
    user_id: int, 
    entry_ids: List[int]
) -> QuickCategorizeResponse:
    """Get quick categorization suggestions for selected entries"""
    try:
        # Get existing topics for the user
        existing_topics = db.query(Topic).filter(Topic.user_id == user_id).all()
        
        # Get the selected entries
        entries = db.query(Entry).filter(
            Entry.entry_id.in_(entry_ids),
            Entry.user_id == user_id
        ).all()

        # Get suggestions from AI service
        proposals = await ai_service.get_quick_categorization_suggestions(
            entries=entries,
            existing_topics=existing_topics
        )

        return QuickCategorizeResponse(proposals=proposals)

    except Exception as e:
        logger.error(f"Error in quick categorization: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate categorization suggestions"
        )


async def search_topics(db: Session, query: str, user_id: int) -> List[TopicSearchResponse]:
    """
    Search topics based on a query string and return them sorted by match score
    
    Args:
        db: Database session
        query: Search string to match against topic names
        user_id: ID of the user whose topics to search
        
    Returns:
        List of topics with match scores, sorted by score descending
    """
    # Get all topics for the user
    topics = db.query(Topic).filter(Topic.user_id == user_id).all()
    
    if not topics:
        return []
    
    # Get all topic names
    topic_names = [topic.topic_name for topic in topics]
    
    # Get scores for all topics in one call
    scores = ai_service.calculate_similarity_scores(topic_names, query)
    
    # Pair topics with their scores
    scored_topics = list(zip(topics, scores))
    
    # Sort by score descending
    scored_topics.sort(key=lambda x: x[1], reverse=True)
    
    # Convert to response objects
    return [
        TopicSearchResponse(
            topic_id=topic.topic_id,
            topic_name=topic.topic_name,
            user_id=topic.user_id,
            creation_date=topic.creation_date,
            score=score
        )
        for topic, score in scored_topics
    ]


async def get_topic_suggestions(db: Session, text: str, user_id: int) -> List[TopicSearchResponse]:
    try:
        results = []
        
        # 1. Get user's existing topics
        existing_topics = db.query(Topic).filter(Topic.user_id == user_id).all()
        existing_topic_names = [topic.topic_name.lower() for topic in existing_topics]
        
        # 2. Get AI suggestion considering existing topics
        suggested_name = await ai_service.suggest_topic_name_with_context(text, existing_topic_names)
        suggested_name_lower = suggested_name.lower() if suggested_name else ""
        
        # 3. Add AI suggestion only if valid and doesn't match existing topics
        if (suggested_name and 
            suggested_name != "New Topic" and 
            suggested_name_lower not in existing_topic_names):
            results.append(TopicSearchResponse(
                topic_id=-1,
                topic_name=suggested_name,
                user_id=user_id,
                creation_date=datetime.utcnow(),
                score=1.0,
                is_ai_suggested=True,
                is_new_topic=True
            ))

        # 4. Get and add similar existing topics
        similar_topics = await search_topics(db, text, user_id)
        results.extend(similar_topics)

        return results
        
    except Exception as e:
        logger.error(f"Error getting topic suggestions: {str(e)}")
        return []



async def suggest_topic_name(db: Session, text: str, user_id: int) -> dict:
    """
    Suggests a topic name based on the provided text using AI.
    Uses the AI service to generate a concise, relevant topic name.
    """
    try:
        # Use AI service to generate topic suggestion
        suggested_name = await ai_service.suggest_topic_name(text)
        
        # Ensure the suggestion isn't too long
        if len(suggested_name) > 50:
            suggested_name = suggested_name[:47] + "..."
            
        return {"suggested_name": suggested_name}
        
    except Exception as e:
        logger.error(f"Error suggesting topic name: {str(e)}")
        return {"suggested_name": "New Topic"}


async def analyze_categorization(
    db: Session, 
    user_id: int, 
    instructions: Optional[str] = None,
    topics_to_keep: List[int] = []
) -> AutoCategorizeResponse:
    try:
        logger.info(f"Starting analyze_categorization for user {user_id}")
        
        # Get all entries and topics
        entries = db.query(Entry).filter(Entry.user_id == user_id).all()
        existing_topics = db.query(Topic).filter(Topic.user_id == user_id).all()
        logger.info(f"Found {len(entries)} entries and {len(existing_topics)} topics")

        # Separate topics and entries into keep vs recategorize
        topics_to_keep_set = set(topics_to_keep)
        kept_topics = [topic for topic in existing_topics if topic.topic_id in topics_to_keep_set]
        logger.info(f"Keeping {len(kept_topics)} topics")

        # Initialize response with kept topics
        proposed_topics = [
            ProposedTopic(
                topic_id=topic.topic_id,
                topic_name=topic.topic_name,
                is_new=False,
                entries=[],
                confidence_score=1.0
            )
            for topic in kept_topics
        ]

        # Add entries for kept topics
        kept_entries = []
        for entry in entries:
            if entry.topic_id in topics_to_keep_set:
                kept_topic = next(t for t in proposed_topics if t.topic_id == entry.topic_id)
                kept_entries.append(entry.entry_id)
                kept_topic.entries.append(ProposedEntry(
                    entry_id=entry.entry_id,
                    content=entry.content,
                    current_topic_id=entry.topic_id,
                    proposed_topic_id=entry.topic_id,
                    creation_date=entry.creation_date,
                    confidence_score=1.0
                ))
        logger.info(f"Added {len(kept_entries)} entries to kept topics")

        # Get entries that need recategorization
        entries_to_categorize = [e for e in entries if e.entry_id not in kept_entries]
        if entries_to_categorize:
            logger.info(f"Getting new topics for {len(entries_to_categorize)} entries")
            
            # First AI call: Get proposed new topics
            new_topic_names = await ai_service.get_proposed_topics(
                kept_topics=kept_topics,
                kept_entries=[e for e in entries if e.entry_id in kept_entries],
                entries_to_categorize=entries_to_categorize,
                instructions=instructions
            )
            logger.info(f"AI suggested {len(new_topic_names)} new topics")
            
            # Add new topics to proposed_topics list
            for topic_name in new_topic_names:
                proposed_topics.append(ProposedTopic(
                    topic_id=None,
                    topic_name=topic_name,
                    is_new=True,
                    entries=[],
                    confidence_score=0.0  # Will be updated based on entry assignments
                ))
            
            # Second AI call: Get entry assignments
            assignments = await ai_service.get_entry_assignments(
                entries=entries_to_categorize,
                proposed_topics=[t for t in proposed_topics if t.is_new]
            )
            logger.info(f"Got {len(assignments)} entry assignments from AI")
            
            # Process assignments
            for assignment in assignments:
                entry_id = assignment['entry_id']
                topic_name = assignment['topic_name']
                confidence = assignment['confidence']
                
                # Find the entry and topic
                entry = next(e for e in entries_to_categorize if e.entry_id == entry_id)
                topic = next(t for t in proposed_topics if t.topic_name == topic_name)
                
                # Create proposed entry
                proposed_entry = ProposedEntry(
                    entry_id=entry.entry_id,
                    content=entry.content,
                    current_topic_id=entry.topic_id,
                    proposed_topic_id=topic.topic_id,
                    creation_date=entry.creation_date,
                    confidence_score=confidence
                )
                
                topic.entries.append(proposed_entry)
            
            # Update topic confidence scores based on entry assignments
            for topic in proposed_topics:
                if topic.is_new and topic.entries:
                    topic.confidence_score = sum(e.confidence_score for e in topic.entries) / len(topic.entries)
                    logger.debug(f"Topic '{topic.topic_name}' confidence: {topic.confidence_score:.2f} "
                               f"with {len(topic.entries)} entries")

        # Filter out any new topics that didn't get any entries
        original_count = len(proposed_topics)
        proposed_topics = [t for t in proposed_topics if t.entries or not t.is_new]
        if original_count != len(proposed_topics):
            logger.info(f"Filtered out {original_count - len(proposed_topics)} empty topics")

        logger.info("Analysis complete")
        return AutoCategorizeResponse(
            proposed_topics=proposed_topics,
            uncategorized_entries=[],  # All entries are assigned in this implementation
            instructions_used=instructions
        )

    except Exception as e:
        logger.error(f"Error in analyze_categorization: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze categorization"
        )


async def apply_categorization(
    db: Session, 
    user_id: int, 
    changes: ApplyCategorizeRequest
) -> None:
    """Apply the provided categorization changes"""
    try:
        logger.info(f"Starting categorization changes for user {user_id}")
        logger.info(
            "Changes summary: "
            f"{len(changes.proposed_topics)} topics, "
            f"{sum(len(t.entries) for t in changes.proposed_topics)} entries to move, "
            f"{len(changes.uncategorized_entries)} entries to uncategorize | "
            f"New topics: {[t.topic_name for t in changes.proposed_topics if t.is_new]}"
        )

        # Create new topics first
        new_topic_map = {}  # Maps topic_name to new topic_id
        new_topics_count = 0
        for proposed_topic in changes.proposed_topics:
            if proposed_topic.is_new:
                new_topics_count += 1
                logger.info(
                    f"Creating new topic: {proposed_topic.topic_name} | "
                    f"Entry count: {len(proposed_topic.entries)} | "
                    f"User: {user_id}"
                )
                new_topic = Topic(
                    topic_name=proposed_topic.topic_name,
                    user_id=user_id
                )
                db.add(new_topic)
                db.flush()  # Get the new topic_id
                new_topic_map[proposed_topic.topic_name] = new_topic.topic_id
                logger.info(
                    f"Created new topic {proposed_topic.topic_name} "
                    f"with ID {new_topic.topic_id} for user {user_id}"
                )
        
        # Update entry categorizations with more detailed logging
        entries_moved = 0
        for proposed_topic in changes.proposed_topics:
            target_topic_id = (
                proposed_topic.topic_id if not proposed_topic.is_new 
                else new_topic_map[proposed_topic.topic_name]
            )
            
            logger.info(
                f"Processing entries for topic '{proposed_topic.topic_name}' "
                f"(ID: {target_topic_id}) | "
                f"Entry count: {len(proposed_topic.entries)} | "
                f"User: {user_id}"
            )
            
            for entry in proposed_topic.entries:
                if entry.current_topic_id != target_topic_id:
                    db_entry = db.query(Entry).filter(
                        Entry.entry_id == entry.entry_id,
                        Entry.user_id == user_id
                    ).first()
                    
                    if db_entry:
                        old_topic_id = db_entry.topic_id
                        db_entry.topic_id = target_topic_id
                        entries_moved += 1
                        logger.debug(
                            f"Moved entry {entry.entry_id} | "
                            f"From: {old_topic_id} | "
                            f"To: {target_topic_id} | "
                            f"Content preview: {db_entry.content[:50]}... | "
                            f"User: {user_id}"
                        )
        
        # Handle uncategorized entries
        uncategorized_count = 0
        for entry in changes.uncategorized_entries:
            db_entry = db.query(Entry).filter(
                Entry.entry_id == entry.entry_id,
                Entry.user_id == user_id
            ).first()
            
            if db_entry:
                old_topic_id = db_entry.topic_id
                db_entry.topic_id = None
                uncategorized_count += 1
                logger.debug(
                    f"Uncategorized entry {entry.entry_id} | "
                    f"From: {old_topic_id} | "
                    f"Content preview: {db_entry.content[:50]}... | "
                    f"User: {user_id}"
                )
        
        # Final summary with more context
        logger.info(
            f"Categorization changes complete for user {user_id}:\n"
            f"- Created {new_topics_count} new topics\n"
            f"- Moved {entries_moved} entries\n"
            f"- Uncategorized {uncategorized_count} entries\n"
            f"- Total topics affected: {len(changes.proposed_topics)}"
        )
        
        db.commit()
        
    except Exception as e:
        logger.error(
            f"Error applying categorization for user {user_id}: {str(e)}", 
            exc_info=True,
            extra={
                "user_id": user_id,
                "proposed_topics_count": len(changes.proposed_topics),
                "entries_count": sum(len(t.entries) for t in changes.proposed_topics),
                "uncategorized_count": len(changes.uncategorized_entries)
            }
        )
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply categorization changes"
        )


async def quick_categorize_uncategorized(
    db: Session,
    user_id: int,
    min_confidence: float = 0.7,
    max_new_topics: int = 3,
    instructions: Optional[str] = None
) -> QuickCategorizeUncategorizedResponse:
    """Analyze and categorize uncategorized entries"""
    
    start_time = time.time()
    
    try:
        # Get uncategorized entries
        uncategorized_entries = (
            db.query(Entry)
            .filter(Entry.user_id == user_id, Entry.topic_id.is_(None))
            .all()
        )
        
        if not uncategorized_entries:
            return QuickCategorizeUncategorizedResponse(
                existing_topic_assignments=[],
                new_topic_proposals=[],
                unassigned_entries=[],
                metadata=CategoryMetadata(
                    total_entries_analyzed=0,
                    assigned_to_existing=0,
                    assigned_to_new=0,
                    unassigned=0,
                    average_confidence=0.0,
                    processing_time_ms=int((time.time() - start_time) * 1000)
                )
            )

        # Get existing topics
        existing_topics = db.query(Topic).filter(Topic.user_id == user_id).all()
        
        # Get AI suggestions for all entries
        suggestions = await ai_service.analyze_entries_for_categorization(
            entries=uncategorized_entries,
            existing_topics=existing_topics,
            min_confidence=min_confidence,
            max_new_topics=max_new_topics,
            instructions=instructions
        )
        logger.info(f"AI suggestions: {suggestions}")

        # Process suggestions into response format
        existing_assignments = defaultdict(list)
        new_topics = []
        unassigned = []
        all_confidences = []
        
        for entry, entry_suggestions in suggestions.items():
            best_match = max(entry_suggestions, key=lambda x: x.confidence_score)
            
            if best_match.confidence_score < min_confidence:
                # Entry doesn't meet confidence threshold
                unassigned.append(UnassignedEntry(
                    entry_id=entry.entry_id,
                    content=entry.content,
                    reason="No confident matches found",
                    top_suggestions=[
                        TopicSuggestion(
                            topic_id=s.topic_id,
                            topic_name=s.topic_name,
                            confidence=s.confidence_score
                        ) for s in entry_suggestions[:3]
                    ]
                ))
                continue
                
            if best_match.topic_id:  # Existing topic
                existing_assignments[best_match.topic_id].append(
                    TopicAssignment(
                        entry_id=entry.entry_id,
                        content=entry.content,
                        confidence=best_match.confidence_score,
                        alternative_topics=[
                            TopicSuggestion(
                                topic_id=s.topic_id,
                                topic_name=s.topic_name,
                                confidence=s.confidence_score
                            ) for s in entry_suggestions[1:3]  # Next 2 best matches
                        ]
                    )
                )
            else:  # New topic
                # Find or create new topic proposal
                new_topic = next(
                    (t for t in new_topics if t.suggested_name == best_match.topic_name),
                    None
                )
                if not new_topic:
                    new_topic = NewTopicProposal(
                        suggested_name=best_match.topic_name,
                        confidence=best_match.confidence_score,
                        rationale="Multiple related entries found",
                        similar_existing_topics=[],
                        entries=[]
                    )
                    new_topics.append(new_topic)
                
                # Add entry to new topic
                new_topic.entries.append(
                    TopicAssignment(
                        entry_id=entry.entry_id,
                        content=entry.content,
                        confidence=best_match.confidence_score,
                        alternative_topics=[
                            TopicSuggestion(
                                topic_id=s.topic_id,
                                topic_name=s.topic_name,
                                confidence=s.confidence_score
                            ) for s in entry_suggestions[1:3]
                        ]
                    )
                )
                
                # Update topic confidence based on all its entries
                new_topic.confidence = mean(e.confidence for e in new_topic.entries)
            
            all_confidences.append(best_match.confidence_score)
        
        # Format response
        response = QuickCategorizeUncategorizedResponse(
            existing_topic_assignments=[
                ExistingTopicAssignment(
                    topic_id=topic_id,
                    topic_name=next(t.topic_name for t in existing_topics if t.topic_id == topic_id),
                    entries=entries
                )
                for topic_id, entries in existing_assignments.items()
            ],
            new_topic_proposals=new_topics,
            unassigned_entries=unassigned,
            metadata=CategoryMetadata(
                total_entries_analyzed=len(uncategorized_entries),
                assigned_to_existing=sum(len(entries) for entries in existing_assignments.values()),
                assigned_to_new=sum(len(t.entries) for t in new_topics),
                unassigned=len(unassigned),
                average_confidence=mean(all_confidences) if all_confidences else 0.0,
                processing_time_ms=int((time.time() - start_time) * 1000)
            )
        )
        
        return response

    except Exception as e:
        logger.error(f"Error in quick categorization: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze entries for categorization"
        )

