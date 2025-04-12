import os
import sys
from sqlalchemy import create_engine, text
from database import Base, engine
from models import URL, URLStatus, SubsequentRequest

def reset_database():
    """Reset the database by removing existing tables and creating new ones."""
    # Get the absolute path to the database file
    db_path = os.path.abspath('url_monitor.db')
    
    # Check if the database file exists and remove it
    if os.path.exists(db_path):
        try:
            print(f"Removing existing database file: {db_path}")
            os.remove(db_path)
            print("Database file removed successfully.")
        except OSError as e:
            print(f"Error removing database file: {e}")
            sys.exit(1)
    else:
        print("No existing database file found.")
    
    # Create a new database with the defined models
    try:
        print("Creating new database schema...")
        Base.metadata.create_all(bind=engine)
        print("Database schema created successfully.")
        
        # Verify connection to the new database
        with engine.connect() as conn:
            result = conn.execute(text("SELECT sqlite_version();"))
            version = result.scalar()
            print(f"Successfully connected to the new SQLite database (version {version}).")
        
        print("\nDatabase reset complete. You can now start the application with a clean database.")
        return True
    except Exception as e:
        print(f"Error creating new database: {e}")
        return False

if __name__ == "__main__":
    print("===== URL Monitor Database Reset Tool =====")
    confirmation = input("This will delete ALL data in the database. Are you sure? (y/N): ").lower()
    
    if confirmation == 'y':
        reset_database()
    else:
        print("Database reset cancelled.")