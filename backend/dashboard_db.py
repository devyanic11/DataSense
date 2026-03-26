import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import os

class DashboardDB:
    """Manage saved dashboards with SQLite backend."""
    
    DB_PATH = "dashboards.db"
    
    @staticmethod
    def init_db():
        """Initialize the database schema."""
        conn = sqlite3.connect(DashboardDB.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dashboards (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                filename TEXT,
                insights_summary TEXT,
                chart_configs TEXT,
                original_data TEXT,
                column_metadata TEXT,
                content_summary TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def save_dashboard(
        name: str,
        filename: str,
        insights_summary: str,
        chart_configs: List[Dict[str, Any]],
        original_data: List[Dict[str, Any]],
        column_metadata: Dict[str, Any],
        content_summary: str
    ) -> str:
        """Save a dashboard configuration. Returns dashboard ID."""
        dashboard_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        conn = sqlite3.connect(DashboardDB.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO dashboards (
                id, name, created_at, updated_at, filename,
                insights_summary, chart_configs, original_data,
                column_metadata, content_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            dashboard_id,
            name,
            now,
            now,
            filename,
            json.dumps({"summary": insights_summary}),
            json.dumps(chart_configs),
            json.dumps(original_data[:100]),  # Store only first 100 rows
            json.dumps(column_metadata),
            content_summary[:2000]  # Store summary only
        ))
        
        conn.commit()
        conn.close()
        
        return dashboard_id
    
    @staticmethod
    def load_dashboard(dashboard_id: str) -> Optional[Dict[str, Any]]:
        """Load a saved dashboard by ID."""
        conn = sqlite3.connect(DashboardDB.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM dashboards WHERE id = ?', (dashboard_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return {
            "id": row[0],
            "name": row[1],
            "created_at": row[2],
            "updated_at": row[3],
            "filename": row[4],
            "insights_summary": json.loads(row[5]),
            "chart_configs": json.loads(row[6]),
            "original_data": json.loads(row[7]),
            "column_metadata": json.loads(row[8]),
            "content_summary": row[9]
        }
    
    @staticmethod
    def list_dashboards() -> List[Dict[str, Any]]:
        """List all saved dashboards."""
        conn = sqlite3.connect(DashboardDB.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, created_at, updated_at, filename
            FROM dashboards
            ORDER BY created_at DESC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [
            {
                "id": row[0],
                "name": row[1],
                "created_at": row[2],
                "updated_at": row[3],
                "filename": row[4]
            }
            for row in rows
        ]
    
    @staticmethod
    def delete_dashboard(dashboard_id: str) -> bool:
        """Delete a saved dashboard."""
        conn = sqlite3.connect(DashboardDB.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM dashboards WHERE id = ?', (dashboard_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        
        return deleted
    
    @staticmethod
    def update_dashboard_name(dashboard_id: str, new_name: str) -> bool:
        """Update dashboard name."""
        conn = sqlite3.connect(DashboardDB.DB_PATH)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        cursor.execute(
            'UPDATE dashboards SET name = ?, updated_at = ? WHERE id = ?',
            (new_name, now, dashboard_id)
        )
        conn.commit()
        updated = cursor.rowcount > 0
        conn.close()
        
        return updated

# Initialize database on import
DashboardDB.init_db()
