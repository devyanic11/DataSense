import pandas as pd
import numpy as np
from scipy import stats
from typing import Tuple, Dict, List, Any

class DataCleaner:
    """Intelligent data cleaning assistant with analysis and one-click fixes."""

    @staticmethod
    def analyze_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze data quality issues and suggest fixes.
        
        Returns:
            {
                "summary": str,
                "issues": [
                    {
                        "type": "missing_values|duplicates|outliers|datatype",
                        "column": str,
                        "severity": "low|medium|high",
                        "count": int,
                        "percentage": float,
                        "suggestion": str,
                        "fixable": bool
                    }
                ]
            }
        """
        issues = []
        
        # Check for missing values
        for col in df.columns:
            missing_count = df[col].isna().sum()
            if missing_count > 0:
                missing_pct = (missing_count / len(df)) * 100
                severity = "high" if missing_pct > 30 else "medium" if missing_pct > 10 else "low"
                issues.append({
                    "type": "missing_values",
                    "column": col,
                    "severity": severity,
                    "count": int(missing_count),
                    "percentage": round(missing_pct, 2),
                    "suggestion": f"Fill with median (numeric) or mode (categorical)" if severity != "high" else "Consider removing column if >30% missing",
                    "fixable": True
                })
        
        # Check for duplicates
        dup_count = df.duplicated().sum()
        if dup_count > 0:
            issues.append({
                "type": "duplicates",
                "column": "entire_row",
                "severity": "medium" if dup_count / len(df) > 0.1 else "low",
                "count": int(dup_count),
                "percentage": round((dup_count / len(df)) * 100, 2),
                "suggestion": "Remove duplicate rows to ensure data integrity",
                "fixable": True
            })
        
        # Check for outliers (numeric columns only)
        for col in df.select_dtypes(include=[np.number]).columns:
            try:
                z_scores = np.abs(stats.zscore(df[col].dropna()))
                outlier_count = (z_scores > 3).sum()
                if outlier_count > 0:
                    outlier_pct = (outlier_count / len(df)) * 100
                    issues.append({
                        "type": "outliers",
                        "column": col,
                        "severity": "medium" if outlier_pct > 5 else "low",
                        "count": int(outlier_count),
                        "percentage": round(outlier_pct, 2),
                        "suggestion": "Remove or cap outliers using IQR method",
                        "fixable": True
                    })
            except:
                pass
        
        # Check for datatype issues
        for col in df.columns:
            try:
                if df[col].dtype == 'object':
                    # Try to convert to numeric
                    numeric_conversion = pd.to_numeric(df[col], errors='coerce')
                    successfully_converted = numeric_conversion.notna().sum()
                    conversion_rate = (successfully_converted / len(df)) * 100
                    
                    if conversion_rate > 80:  # Mostly numeric, wrong type
                        issues.append({
                            "type": "datatype",
                            "column": col,
                            "severity": "low",
                            "count": int(len(df) - successfully_converted),
                            "percentage": round(100 - conversion_rate, 2),
                            "suggestion": f"Column appears numeric but stored as text",
                            "fixable": True
                        })
            except:
                pass
        
        # Generate summary
        issue_types = {}
        for issue in issues:
            issue_types[issue["type"]] = issue_types.get(issue["type"], 0) + 1
        
        summary_parts = []
        if issue_types:
            for issue_type, count in issue_types.items():
                summary_parts.append(f"{count} {issue_type} issue(s)")
        
        summary = f"Found {len(issues)} quality issue(s): {', '.join(summary_parts)}" if issues else "Data quality looks good!"
        
        return {
            "summary": summary,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "issues": issues
        }

    @staticmethod
    def apply_cleaning(df: pd.DataFrame, cleaning_steps: List[Dict[str, Any]]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Apply cleaning operations to dataframe.
        
        Each step format:
            {
                "operation": "fill_missing|remove_duplicates|remove_outliers|convert_dtype",
                "column": "column_name" (required for column-specific ops),
                "method": "median|mean|forward_fill|drop" (for fill_missing),
                "params": {} (additional params)
            }
        
        Returns:
            (cleaned_df, report)
        """
        df_cleaned = df.copy()
        report = {
            "operations_applied": [],
            "rows_removed": 0,
            "columns_affected": []
        }
        
        for step in cleaning_steps:
            operation = step.get("operation")
            column = step.get("column")
            method = step.get("method", "median")
            
            try:
                if operation == "fill_missing":
                    if column and column in df_cleaned.columns:
                        if pd.api.types.is_numeric_dtype(df_cleaned[column]):
                            # Numeric: fill with median or mean
                            fill_value = df_cleaned[column].median() if method == "median" else df_cleaned[column].mean()
                        else:
                            # Categorical: fill with mode
                            fill_value = df_cleaned[column].mode()[0] if len(df_cleaned[column].mode()) > 0 else "Unknown"
                        
                        df_cleaned[column].fillna(fill_value, inplace=True)
                        report["operations_applied"].append(f"Filled missing values in {column} with {method}")
                        report["columns_affected"].append(column)
                
                elif operation == "remove_duplicates":
                    rows_before = len(df_cleaned)
                    df_cleaned.drop_duplicates(inplace=True)
                    rows_removed = rows_before - len(df_cleaned)
                    report["rows_removed"] += rows_removed
                    report["operations_applied"].append(f"Removed {rows_removed} duplicate rows")
                
                elif operation == "remove_outliers":
                    if column and column in df_cleaned.columns and pd.api.types.is_numeric_dtype(df_cleaned[column]):
                        Q1 = df_cleaned[column].quantile(0.25)
                        Q3 = df_cleaned[column].quantile(0.75)
                        IQR = Q3 - Q1
                        lower_bound = Q1 - 1.5 * IQR
                        upper_bound = Q3 + 1.5 * IQR
                        
                        rows_before = len(df_cleaned)
                        df_cleaned = df_cleaned[(df_cleaned[column] >= lower_bound) & (df_cleaned[column] <= upper_bound)]
                        rows_removed = rows_before - len(df_cleaned)
                        report["rows_removed"] += rows_removed
                        report["operations_applied"].append(f"Removed {rows_removed} outliers in {column}")
                        report["columns_affected"].append(column)
                
                elif operation == "convert_dtype":
                    if column and column in df_cleaned.columns:
                        target_type = step.get("target_type", "numeric")
                        if target_type == "numeric":
                            df_cleaned[column] = pd.to_numeric(df_cleaned[column], errors='coerce')
                        elif target_type == "categorical":
                            df_cleaned[column] = df_cleaned[column].astype('category')
                        report["operations_applied"].append(f"Converted {column} to {target_type}")
                        report["columns_affected"].append(column)
            except Exception as e:
                report["operations_applied"].append(f"Error in {operation} for {column}: {str(e)}")
        
        return df_cleaned, report
