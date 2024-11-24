"""Add chat threading functionality

Revision ID: add_chat_threading
Revises: 
Create Date: 2024-03-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic
revision = 'add_chat_threading'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create chat_threads table
    op.create_table(
        'chat_threads',
        sa.Column('thread_id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('last_message_at', sa.TIMESTAMP, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('status', mysql.ENUM('active', 'archived', 'deleted'), nullable=False),
        sa.PrimaryKeyConstraint('thread_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.topic_id'])
    )
    op.create_index('idx_chat_threads_user', 'chat_threads', ['user_id'])
    op.create_index('idx_chat_threads_topic', 'chat_threads', ['topic_id'])
    
    # Add thread_id to chat_messages
    op.add_column('chat_messages', sa.Column('thread_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_chat_messages_thread', 
        'chat_messages', 'chat_threads',
        ['thread_id'], ['thread_id']
    )
    op.create_index('idx_chat_messages_thread', 'chat_messages', ['thread_id'])

def downgrade():
    # Remove thread_id from chat_messages
    op.drop_constraint('fk_chat_messages_thread', 'chat_messages', type_='foreignkey')
    op.drop_index('idx_chat_messages_thread', 'chat_messages')
    op.drop_column('chat_messages', 'thread_id')
    
    # Drop chat_threads table
    op.drop_table('chat_threads')