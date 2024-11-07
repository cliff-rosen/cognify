from sqlalchemy import create_engine, text
from config import settings
import os

def init_database():
    engine = create_engine(settings.DATABASE_URL)
    
    # Read SQL schema file
    schema_path = os.path.join(os.path.dirname(__file__), '..', 'db', 'init_db.sql')
    with open(schema_path, 'r') as file:
        sql_commands = file.read()
        
    with engine.connect() as connection:
        # Split commands by semicolon and execute each one
        for command in sql_commands.split(';'):
            if command.strip():
                connection.execute(text(command))
                connection.commit()

if __name__ == "__main__":
    print("Initializing database...")
    try:
        init_database()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {str(e)}") 