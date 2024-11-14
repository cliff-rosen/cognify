from sqlalchemy.orm import Session
from models import Topic
from schemas import TopicCreate



async def get_topics(db: Session, user_id: int):
    return db.query(Topic).filter(Topic.user_id == user_id).all()


async def create_topic(db: Session, topic: TopicCreate, user_id: int):
    db_topic = Topic(topic_name=topic.topic_name, user_id=user_id)
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic 
