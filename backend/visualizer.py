import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import json

class Visualizer:
    @staticmethod
    def _apply_theme(fig: go.Figure, title: str) -> go.Figure:
        """Applies DataSense light theme to Plotly figures."""
        fig.update_layout(
            title=dict(text=title, font=dict(color="#1e293b", size=18, family="Inter, sans-serif")),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#475569", family="Inter, sans-serif"),
            xaxis=dict(gridcolor="rgba(0,0,0,0.06)", zerolinecolor="rgba(0,0,0,0.1)", linecolor="rgba(0,0,0,0.1)"),
            yaxis=dict(gridcolor="rgba(0,0,0,0.06)", zerolinecolor="rgba(0,0,0,0.1)", linecolor="rgba(0,0,0,0.1)"),
            margin=dict(l=40, r=40, t=60, b=40)
        )
        return fig

    @staticmethod
    def generate_bar_chart(df: pd.DataFrame, title: str, x_col: str, y_cols: list[str]) -> str:
        """Generates a bar chart JSON from a complete DataFrame."""
        try:
            # Aggregate if data is too large or has many categories
            if len(df) > 1000:
                agg_df = df.groupby(x_col)[y_cols].sum().reset_index()
            else:
                agg_df = df

            fig = px.bar(agg_df, x=x_col, y=y_cols, barmode='group',
                         color_discrete_sequence=['#8b5cf6', '#3b82f6', '#ec4899', '#f97316'])
            fig = Visualizer._apply_theme(fig, title)
            return fig.to_json()
        except Exception as e:
            return json.dumps({"error": f"Bar Chart Error: {str(e)}"})

    @staticmethod
    def generate_line_chart(df: pd.DataFrame, title: str, x_col: str, y_cols: list[str]) -> str:
        """Generates a line chart JSON from a complete DataFrame."""
        try:
            # Sort by X axis for line charts
            temp_df = df.copy()
            if temp_df[x_col].dtype == 'object':
                try:
                    temp_df[x_col] = pd.to_datetime(temp_df[x_col])
                except:
                    pass
            temp_df = temp_df.sort_values(by=x_col)
            
            # Aggregate if large
            if len(temp_df) > 5000:
                 temp_df = temp_df.groupby(x_col)[y_cols].mean().reset_index()

            fig = px.line(temp_df, x=x_col, y=y_cols, 
                          color_discrete_sequence=['#f97316', '#3b82f6', '#ec4899', '#8b5cf6'])
            fig = Visualizer._apply_theme(fig, title)
            fig.update_traces(line=dict(width=3))
            return fig.to_json()
        except Exception as e:
            return json.dumps({"error": f"Line Chart Error: {str(e)}"})

    @staticmethod
    def generate_pie_chart(df: pd.DataFrame, title: str, label_col: str, value_col: str) -> str:
        """Generates a pie chart JSON from a complete DataFrame."""
        try:
            agg_df = df.groupby(label_col)[value_col].sum().reset_index()
            # Keep top 12 categories if too many
            if len(agg_df) > 12:
                top_11 = agg_df.nlargest(11, value_col)
                other_sum = agg_df[~agg_df[label_col].isin(top_11[label_col])][value_col].sum()
                other_df = pd.DataFrame([{label_col: 'Other', value_col: other_sum}])
                agg_df = pd.concat([top_11, other_df], ignore_index=True)

            fig = px.pie(agg_df, names=label_col, values=value_col, hole=0.4,
                         color_discrete_sequence=['#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#f97316'])
            fig = Visualizer._apply_theme(fig, title)
            fig.update_traces(textposition='inside', textinfo='percent+label')
            return fig.to_json()
        except Exception as e:
            return json.dumps({"error": f"Pie Chart Error: {str(e)}"})

    @staticmethod
    def generate_scatter_plot(df: pd.DataFrame, title: str, x_col: str, y_col: str, tooltip_col: str = None) -> str:
        """Generates a scatter plot JSON from a complete DataFrame."""
        try:
            # Sample if data is massive to prevent browser freezing with too many dots
            plot_df = df.sample(n=min(len(df), 5000)) if len(df) > 5000 else df
            
            hover_data = [tooltip_col] if tooltip_col and tooltip_col in plot_df.columns else None

            fig = px.scatter(plot_df, x=x_col, y=y_col, hover_data=hover_data,
                             color_discrete_sequence=['#ec4899'])
            fig = Visualizer._apply_theme(fig, title)
            fig.update_traces(marker=dict(size=8, opacity=0.7, line=dict(width=1, color='White')))
            return fig.to_json()
        except Exception as e:
            return json.dumps({"error": f"Scatter Plot Error: {str(e)}"})
