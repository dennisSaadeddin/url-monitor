#!/usr/bin/env python3
from sqlalchemy import create_engine, Column, Boolean, Integer, DateTime, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.schema import MetaData, Table
import os
import sys

def migrate_alerts():
    """Add alert fields to the URLs table"""
    engine = create_engine("sqlite:///./url_monitor.db")
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Check if table exists
    metadata = MetaData()
    metadata.reflect(bind=engine)
    
    if 'urls' not in metadata.tables:
        print("URLs table not found. Run the application first to create the database.")
        return False
    
    # Get the URLs table
    urls_table = metadata.tables['urls']
    
    # Check if migration is needed
    columns_to_add = {
        'alert_enabled': Column(Boolean, default=False),
        'consecutive_failures': Column(Integer, default=0),
        'last_alerted_at': Column(DateTime, nullable=True),
        'alert_recovery': Column(Boolean, default=True)
    }
    
    # Add any missing columns
    columns_added = False
    conn = engine.connect()
    
    for column_name, column_def in columns_to_add.items():
        if column_name not in urls_table.columns:
            print(f"Adding column {column_name}...")
            column_type = column_def.type.compile(engine.dialect)
            
            # Set default for new column
            default = "0"
            if isinstance(column_def.type, Boolean):
                if column_name == 'alert_recovery':
                    default = "1"  # True by default
                else:
                    default = "0"  # False by default
            elif column_name == 'consecutive_failures':
                default = "0"
            
            # Use SQLAlchemy's text() function to execute raw SQL
            sql = text(f"ALTER TABLE urls ADD COLUMN {column_name} {column_type} DEFAULT {default}")
            conn.execute(sql)
            columns_added = True
    
    conn.close()
    
    if columns_added:
        print("Migration completed successfully.")
    else:
        print("No migration needed. Alert columns already exist.")
    
    return True

if __name__ == "__main__":
    print("===== URL Monitor Alert Migration Tool =====")
    confirmation = input("This will add alerts functionality to the database. Continue? (y/N): ").lower()
    
    if confirmation == 'y':
        migrate_alerts()
    else:
        print("Migration cancelled.")