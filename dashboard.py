import json
import sqlite3
from pathlib import Path

import pandas as pd
import streamlit as st

try:
    import plotly.express as px
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

from monitor import ALERTS_CSV_PATH, DB_PATH, init_db, run_all, summarize_crawl_policy

st.set_page_config(page_title="Robots.txt Monitor", layout="wide")

with open("style.css", encoding="utf-8") as file:
    st.markdown(f"<style>{file.read()}</style>", unsafe_allow_html=True)

col_logo, col_title = st.columns([1, 4])
with col_logo:
    st.image("hibou_logo_transparent_7680.png", width=120)
with col_title:
    st.title("Robots.txt Monitor")
    st.caption("Dashboard d'alerte multi-sites pour les fichiers robots.txt")

init_db()

if st.button("Lancer un check maintenant"):
    with st.spinner("Check des robots.txt en cours..."):
        results = run_all()
    st.success(f"{len(results)} site(s) vérifié(s)")

if not Path(DB_PATH).exists():
    st.info("Aucune donnée pour le moment.")
    st.stop()

# KPI Cards
with sqlite3.connect(DB_PATH) as conn:
    total_sites = pd.read_sql_query("SELECT COUNT(DISTINCT base_url) as count FROM checks", conn).iloc[0]["count"]
    total_checks = pd.read_sql_query("SELECT COUNT(*) as count FROM checks", conn).iloc[0]["count"]
    total_alerts = pd.read_sql_query("SELECT COUNT(*) as count FROM checks WHERE alerts_json != '[]'", conn).iloc[0]["count"]

kpi1, kpi2, kpi3 = st.columns(3)
with kpi1:
    st.metric("Sites surveillés", total_sites)
with kpi2:
    st.metric("Checks effectués", total_checks)
with kpi3:
    st.metric("Alertes détectées", total_alerts)

st.markdown("---")

with sqlite3.connect(DB_PATH) as conn:
    checks = pd.read_sql_query(
        """
        SELECT * FROM checks
        ORDER BY checked_at DESC
        """,
        conn,
    )

if checks.empty:
    st.info("Aucun check enregistré pour le moment.")
    st.stop()

latest = checks.sort_values("checked_at", ascending=False).drop_duplicates("base_url")

summary_rows = []
for _, row in latest.iterrows():
    alerts = json.loads(row["alerts_json"])
    sitemap_details = json.loads(row.get("sitemap_details_json", "[]"))
    important_url_results = json.loads(row.get("important_url_results_json", "[]"))
    critical_count = sum(1 for alert in alerts if alert.get("level") == "critical")
    high_count = sum(1 for alert in alerts if alert.get("level") == "high")
    medium_count = sum(1 for alert in alerts if alert.get("level") == "medium")
    total_sitemap_urls = sum(item.get("url_count", 0) for item in sitemap_details)
    crawl_policy = summarize_crawl_policy(
        row["status_code"],
        alerts,
        important_url_results,
        sitemap_details,
    )
    blocked_important_urls = sum(
        1
        for item in important_url_results
        if any(allowed is False for allowed in item.get("agents", {}).values())
    )
    summary_rows.append(
        {
            "Site": row["site_name"],
            "Base URL": row["base_url"],
            "Crawl Policy Status": crawl_policy["status"],
            "Résumé": crawl_policy["summary"],
            "Status": row["status_code"],
            "Critical": critical_count,
            "High": high_count,
            "Medium": medium_count,
            "Sitemaps déclarés": len(json.loads(row["sitemaps_json"])),
            "Sitemaps crawlés": len(sitemap_details),
            "URLs sitemap": total_sitemap_urls,
            "URLs importantes": len(important_url_results),
            "URLs importantes bloquées": blocked_important_urls,
            "Dernier check": row["checked_at"],
        }
    )

st.subheader("Vue portefeuille")
st.dataframe(pd.DataFrame(summary_rows), width='stretch')

# Alert severity donut chart
st.subheader("Répartition des alertes par sévérité")
alert_severity_data = {"critical": 0, "high": 0, "medium": 0}
for _, row in latest.iterrows():
    alerts = json.loads(row["alerts_json"])
    for alert in alerts:
        level = alert.get("level") or alert.get("severity")
        if level in alert_severity_data:
            alert_severity_data[level] += 1

if PLOTLY_AVAILABLE and sum(alert_severity_data.values()) > 0:
    fig = px.pie(
        values=list(alert_severity_data.values()),
        names=list(alert_severity_data.keys()),
        hole=0.5,
        color_discrete_map={"critical": "#8b7a64", "high": "#c2915d", "medium": "#526a68"}
    )
    fig.update_traces(textposition='inside', textinfo='percent+label')
    fig.update_layout(
        showlegend=True,
        height=400,
        margin=dict(l=0, r=0, t=0, b=0)
    )
    st.plotly_chart(fig, width='stretch')
elif sum(alert_severity_data.values()) > 0:
    st.json(alert_severity_data)
else:
    st.info("Aucune alerte détectée")

st.subheader("Rapport d'alertes exporté")
if Path(ALERTS_CSV_PATH).exists():
    alerts_report = pd.read_csv(ALERTS_CSV_PATH)
    severity_filter = st.multiselect(
        "Filtrer par sévérité",
        ["critical", "high", "medium"],
    )
    if severity_filter:
        alerts_report = alerts_report[alerts_report["severity"].isin(severity_filter)]
    st.dataframe(alerts_report, width='stretch')
    st.download_button(
        "Télécharger alerts.csv",
        alerts_report.to_csv(index=False).encode("utf-8"),
        file_name="alerts.csv",
        mime="text/csv",
    )
else:
    st.info("Aucun fichier alerts.csv généré pour le moment.")

selected_site = st.selectbox("Site", latest["site_name"].tolist())
if not selected_site:
    st.info("Sélectionne un site pour afficher le détail.")
    st.stop()
site_rows = checks[checks["site_name"] == selected_site].sort_values("checked_at", ascending=False)
if site_rows.empty:
    st.info("Aucune donnée disponible pour le site sélectionné.")
    st.stop()
current = site_rows.iloc[0]
current_alerts = json.loads(current["alerts_json"])
current_sitemap_details = json.loads(current.get("sitemap_details_json", "[]"))
current_important_url_results = json.loads(current.get("important_url_results_json", "[]"))
current_crawl_policy = summarize_crawl_policy(
    current["status_code"],
    current_alerts,
    current_important_url_results,
    current_sitemap_details,
)

st.subheader("Crawl Policy Status")
status_col, summary_col = st.columns([1, 3])
with status_col:
    status = current_crawl_policy["status"]
    if status == "OK":
        st.success(status)
    elif status == "Critical":
        st.error(status)
    elif status == "Unknown":
        st.warning(status)
    else:
        st.warning(status)
with summary_col:
    st.write(current_crawl_policy["summary"])

left, right = st.columns(2)
with left:
    st.subheader("Alertes")
    alerts = current_alerts
    if alerts:
        st.dataframe(
            pd.DataFrame(
                [
                    {
                        "severity": alert.get("severity") or alert.get("level"),
                        "alert_type": alert.get("alert_type", "general"),
                        "message": alert.get("message"),
                        "url": alert.get("url", ""),
                        "user_agent": alert.get("user_agent", ""),
                        "previous_status": alert.get("previous_status", ""),
                        "current_status": alert.get("current_status", ""),
                    }
                    for alert in alerts
                ]
            ),
            width='stretch',
        )
    else:
        st.success("Aucune alerte")

with right:
    st.subheader("Sitemaps déclarés")
    sitemaps = json.loads(current["sitemaps_json"])
    if sitemaps:
        for sitemap in sitemaps:
            st.write(sitemap)
    else:
        st.write("Aucun sitemap détecté")

st.subheader("Sitemaps crawlés")
sitemap_details = current_sitemap_details
if sitemap_details:
    st.dataframe(
        pd.DataFrame(sitemap_details)[
            [
                "url",
                "parent",
                "declared_in_robots",
                "depth",
                "status_code",
                "type",
                "url_count",
                "child_count",
                "error",
            ]
        ],
        width='stretch',
    )
else:
    st.info("Aucun sitemap crawlable pour ce site.")

st.subheader("Évolution des URLs sitemap")
history_rows = []
for _, row in site_rows.iterrows():
    details = json.loads(row.get("sitemap_details_json", "[]"))
    history_rows.append(
        {
            "checked_at": row["checked_at"],
            "sitemaps_crawlés": len(details),
            "urls_sitemap": sum(item.get("url_count", 0) for item in details),
            "sitemaps_inaccessibles": sum(1 for item in details if item.get("error")),
            "sitemaps_vides": sum(
                1
                for item in details
                if item.get("type") == "urlset" and item.get("url_count", 0) == 0
            ),
        }
    )

history_df = pd.DataFrame(history_rows)
if PLOTLY_AVAILABLE and len(history_df) > 1:
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=history_df["checked_at"],
        y=history_df["urls_sitemap"],
        mode="lines+markers",
        name="URLs sitemap",
        line=dict(color="#526a68", width=2),
        marker=dict(size=6)
    ))
    fig.add_trace(go.Scatter(
        x=history_df["checked_at"],
        y=history_df["sitemaps_crawlés"],
        mode="lines+markers",
        name="Sitemaps crawlés",
        line=dict(color="#c2915d", width=2),
        marker=dict(size=6)
    ))
    fig.update_layout(
        title="Évolution temporelle",
        xaxis_title="Date",
        yaxis_title="Nombre",
        hovermode="x unified",
        height=400,
        margin=dict(l=0, r=0, t=40, b=0),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    st.plotly_chart(fig, width='stretch')
    
    with st.expander("Voir le tableau détaillé"):
        st.dataframe(history_df, width='stretch')
else:
    st.dataframe(history_df, width='stretch')

st.subheader("URLs importantes vs robots.txt")
important_url_results = current_important_url_results

if important_url_results:
    important_rows = []
    for item in important_url_results:
        row = {
            "url": item.get("url"),
            "type": item.get("type"),
            "priority": item.get("priority"),
            "homepage": item.get("is_homepage"),
            "in_sitemap": item.get("in_sitemap"),
        }
        for user_agent, allowed in item.get("agents", {}).items():
            row[user_agent] = "allowed" if allowed else "blocked"
        important_rows.append(row)
    st.dataframe(pd.DataFrame(important_rows), width='stretch')
else:
    st.info("Aucune URL importante configurée pour ce site.")

st.subheader("robots.txt actuel")
st.code(current["content"] or "", language="text")

st.subheader("Historique")
st.dataframe(
    site_rows[["checked_at", "status_code", "robots_url", "final_url", "content_hash"]],
    width='stretch',
)
