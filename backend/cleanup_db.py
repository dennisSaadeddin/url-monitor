#!/usr/bin/env python3
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys

def cleanup_database():
    """Clean up database issues, particularly with date formats"""
    print("Starting database cleanup...")
    
    # Connect to the database
    engine = create_engine("sqlite:///./url_monitor.db")
    Session = sessionmaker(bind=engine)
    session = Session()
    conn = engine.connect()
    
    try:
        # Set last_alerted_at to NULL for all rows to fix any formatting issues
        conn.execute(text("UPDATE urls SET last_alerted_at = NULL"))
        conn.execute(text("UPDATE urls SET consecutive_failures = 0"))
        
        # Commit changes
        session.commit()
        print("Database cleanup completed successfully")
        return True
        
    except Exception as e:
        print(f"Error during database cleanup: {str(e)}")
        session.rollback()
        return False
    finally:
        conn.close()
        session.close()

if __name__ == "__main__":
    print("===== URL Monitor Database Cleanup =====")
    confirmation = input("This will reset alert states in the database. Continue? (y/N): ").lower()
    
    if confirmation == 'y':
        cleanup_database()
    else:
        print("Cleanup cancelled.")