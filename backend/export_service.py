import pandas as pd
import io
from typing import List, Dict, Any

class ExportService:
    """Handle data and dashboard exports in various formats."""
    
    @staticmethod
    def export_to_csv(data: List[Dict[str, Any]]) -> bytes:
        """Export data to CSV format."""
        df = pd.DataFrame(data)
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        return csv_buffer.getvalue().encode('utf-8')
    
    @staticmethod
    def export_to_json(data: List[Dict[str, Any]]) -> bytes:
        """Export data to JSON format."""
        import json
        json_str = json.dumps(data, indent=2, default=str)
        return json_str.encode('utf-8')
    
    @staticmethod
    def export_to_excel(data: List[Dict[str, Any]]) -> bytes:
        """Export data to Excel format."""
        df = pd.DataFrame(data)
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, engine='openpyxl')
        excel_buffer.seek(0)
        return excel_buffer.getvalue()
    
    @staticmethod
    def generate_summary_report(
        filename: str,
        insights_summary: str,
        column_metadata: Dict[str, Any],
        data_rows_count: int
    ) -> str:
        """Generate a text report summary."""
        report = f"""
DATA SUMMARY REPORT
====================
Generated from: {filename}
Total Rows: {data_rows_count}
Total Columns: {len(column_metadata)}

INSIGHTS
--------
{insights_summary}

COLUMNS INFORMATION
-------------------
"""
        for col_name, col_info in column_metadata.items():
            if col_name.startswith('_'):
                continue
            col_type = col_info.get('type', 'unknown')
            null_count = col_info.get('null_count', 0)
            nunique = col_info.get('nunique', 0)
            report += f"\n{col_name}:\n"
            report += f"  Type: {col_type}\n"
            report += f"  Missing Values: {null_count}\n"
            report += f"  Unique Values: {nunique}\n"
            
            if col_type == 'numeric':
                min_val = col_info.get('min', 'N/A')
                max_val = col_info.get('max', 'N/A')
                report += f"  Range: {min_val} to {max_val}\n"
            else:
                samples = col_info.get('samples', [])
                if samples:
                    report += f"  Samples: {', '.join(str(s) for s in samples[:3])}\n"
        
        return report
