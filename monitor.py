import difflib
import csv
import gzip
import hashlib
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree
from urllib.parse import urljoin, urlparse, urlunparse

import requests
import yaml
import supabase

from robots_policy import can_fetch_url
from advertools_adapter import (
    parse_robots_to_df,
    extract_sitemaps_from_robots,
    detect_robots_issues,
    crawl_sitemap_with_advertools,
    normalize_sitemap_dataframe,
    analyze_robots_intelligence
)
from robots_intelligence import (
    RobotsIntelligenceScore,
    AIAccessibilityScore,
    PortfolioBenchmark,
    DirectiveExplainability,
    RobotsDiffIntelligence,
    RiskImpactClassification
)

DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "robots_monitor.sqlite3"
ALERTS_CSV_PATH = DATA_DIR / "alerts.csv"
DEFAULT_TIMEOUT = 20
URL_DROP_THRESHOLD = 0.3
URL_INCREASE_THRESHOLD = 0.5
SITEMAP_URL_SAMPLE_LIMIT = 25
ROBOTS_USER_AGENTS = [
    "Googlebot",
    "Googlebot-Image",
    "Bingbot",
    "GPTBot",
    "ClaudeBot",
    "PerplexityBot",
    "CCBot",
]
ALERT_FIELDS = [
    "date",
    "site",
    "severity",
    "alert_type",
    "message",
    "url",
    "user_agent",
    "previous_status",
    "current_status",
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def normalize_base_url(base_url):
    parsed = urlparse(base_url if "://" in base_url else f"https://{base_url}")
    origin = urlunparse((parsed.scheme or "https", parsed.netloc or parsed.path, "", "", "", ""))
    return origin.rstrip("/") + "/"


def robots_url(base_url):
    return urljoin(normalize_base_url(base_url), "robots.txt")


def content_hash(content):
    return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()


def make_alert(level, alert_type, message, url="", user_agent="", previous_status="", current_status=""):
    return {
        "level": level,
        "severity": level,
        "alert_type": alert_type,
        "message": message,
        "url": url,
        "user_agent": user_agent,
        "previous_status": previous_status,
        "current_status": current_status,
    }


def init_db():
    DATA_DIR.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                checked_at TEXT NOT NULL,
                site_name TEXT NOT NULL,
                base_url TEXT NOT NULL,
                robots_url TEXT NOT NULL,
                status_code INTEGER,
                final_url TEXT,
                content_hash TEXT,
                content TEXT,
                sitemaps_json TEXT NOT NULL,
                sitemap_details_json TEXT NOT NULL DEFAULT '[]',
                important_url_results_json TEXT NOT NULL DEFAULT '[]',
                alerts_json TEXT NOT NULL
            )
            """
        )
        columns = [row[1] for row in conn.execute("PRAGMA table_info(checks)").fetchall()]
        if "sitemap_details_json" not in columns:
            conn.execute("ALTER TABLE checks ADD COLUMN sitemap_details_json TEXT NOT NULL DEFAULT '[]'")
        if "important_url_results_json" not in columns:
            conn.execute("ALTER TABLE checks ADD COLUMN important_url_results_json TEXT NOT NULL DEFAULT '[]'")
        conn.commit()


def load_sites(config_path="sites.yml"):
    print("=== Starting load_sites ===")
    print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT SET')}")
    print(f"SUPABASE_KEY: {'SET' if os.getenv('SUPABASE_KEY') else 'NOT SET'}")
    
    # Try to load from Supabase first
    try:
        print("Attempting to load from Supabase...")
        supabase_client = supabase.create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_KEY')
        )
        
        response = supabase_client.table('sites').select('*').eq('is_active', True).execute()
        if response.data:
            sites = []
            for site in response.data:
                sites.append({
                    'name': site['name'],
                    'base_url': site['base_url'],
                    'critical_patterns': site.get('critical_patterns', ['/']),
                    'known_sitemaps': site.get('known_sitemaps', [])
                })
            print(f"Loaded {len(sites)} sites from Supabase")
            return sites
        else:
            print("No sites found in Supabase")
    except Exception as e:
        print(f"Error loading sites from Supabase: {e}")
        import traceback
        traceback.print_exc()
    
    # Try to load from Streamlit secrets
    try:
        import streamlit as st
        if "sites" in st.secrets:
            return st.secrets["sites"]
    except Exception:
        pass
    
    # Fallback to local file
    path = Path(config_path)
    if not path.exists():
        path = Path("sites.example.yml")
    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}
    return data.get("sites", [])


def load_important_urls(config_path="important_urls.csv"):
    path = Path(config_path)
    if not path.exists():
        path = Path("important_urls.example.csv")
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def fetch_text(url):
    response = requests.get(
        url,
        timeout=DEFAULT_TIMEOUT,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; RobotsTxtMonitor/1.0; +https://github.com/MarcW88/RobotsTXT_monitoring)",
            "Accept": "text/plain,text/*,*/*;q=0.8",
        },
    )
    content_type = response.headers.get("content-type", "").lower()
    preview = response.text[:500].lower()
    if "text/html" in content_type and "<html" in preview:
        raise requests.RequestException(f"{url} returned HTML instead of robots.txt (final_url={response.url})")
    return response.status_code, response.url, response.text


def fetch_bytes(url):
    response = requests.get(
        url,
        timeout=DEFAULT_TIMEOUT,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; RobotsTxtMonitor/1.0; +https://github.com/MarcW88/RobotsTXT_monitoring)",
            "Accept": "application/xml,text/xml,*/*;q=0.8",
        },
    )
    return response.status_code, response.url, response.content


def extract_sitemaps(robots_content, robots_txt_url):
    """Extract sitemaps using advertools adapter for better parsing."""
    robots_df = parse_robots_to_df(robots_content, robots_txt_url)
    return extract_sitemaps_from_robots(robots_df, robots_txt_url)


def site_matches_important_url(site, row):
    site_key = (row.get("site") or "").strip().lower()
    return site_key in {
        site["name"].strip().lower(),
        site["base_url"].replace("https://", "").replace("http://", "").strip("/").lower(),
    }


def is_homepage_url(base_url, url):
    return url.rstrip("/") == base_url.rstrip("/")


def urls_from_sitemaps(sitemap_details):
    sitemap_urls = set()
    for item in sitemap_details:
        sitemap_urls.update(item.get("urls", []))
    return sitemap_urls


def sample_sitemap_urls(site, sitemap_details, limit=SITEMAP_URL_SAMPLE_LIMIT):
    urls = sorted(urls_from_sitemaps(sitemap_details))
    selected_urls = []
    homepage = site["base_url"].rstrip("/")
    for url in urls:
        if url.rstrip("/") == homepage:
            selected_urls.append(url)
    for keyword in ["contact", "product", "category", "blog", "news", "shop"]:
        for url in urls:
            if keyword in url.lower() and url not in selected_urls:
                selected_urls.append(url)
                break
    for url in urls:
        if url not in selected_urls:
            selected_urls.append(url)
        if len(selected_urls) >= limit:
            break
    return selected_urls[:limit]


def xml_local_name(tag):
    return tag.split("}", 1)[-1] if "}" in tag else tag


def parse_sitemap_xml(content, url):
    if url.lower().endswith(".gz"):
        content = gzip.decompress(content)
    root = ElementTree.fromstring(content)
    root_name = xml_local_name(root.tag)

    if root_name == "sitemapindex":
        children = []
        for sitemap in root:
            if xml_local_name(sitemap.tag) != "sitemap":
                continue
            loc = None
            lastmod = None
            for child in sitemap:
                child_name = xml_local_name(child.tag)
                if child_name == "loc":
                    loc = child.text.strip() if child.text else None
                elif child_name == "lastmod":
                    lastmod = child.text.strip() if child.text else None
            if loc:
                children.append({"url": loc, "lastmod": lastmod})
        return "index", children

    if root_name == "urlset":
        urls = []
        for url_node in root:
            if xml_local_name(url_node.tag) != "url":
                continue
            loc = None
            for child in url_node:
                if xml_local_name(child.tag) == "loc":
                    loc = child.text.strip() if child.text else None
                    break
            if loc:
                urls.append(loc)
        return "urlset", urls

    return "unknown", []


def crawl_sitemaps(seed_sitemaps, max_depth=4):
    """Crawl sitemaps using advertools adapter for intelligent parsing."""
    details = []
    discovered = set()
    queue = [(sitemap, 0, True, None) for sitemap in seed_sitemaps]

    while queue:
        sitemap_url, depth, declared_in_robots, parent = queue.pop(0)
        if sitemap_url in discovered:
            continue
        discovered.add(sitemap_url)

        # Use advertools adapter for sitemap crawling
        sitemap_result = crawl_sitemap_with_advertools(sitemap_url)
        
        detail = {
            "url": sitemap_url,
            "parent": parent,
            "declared_in_robots": declared_in_robots,
            "depth": depth,
            "status_code": sitemap_result['status_code'],
            "final_url": sitemap_result['final_url'],
            "type": sitemap_result['type'],
            "url_count": sitemap_result['url_count'],
            "urls": sitemap_result['urls'],
            "child_count": sitemap_result['child_count'],
            "error": sitemap_result['error'],
        }

        # Handle sitemap index children
        if sitemap_result['type'] == 'index' and depth < max_depth:
            for child in sitemap_result['children']:
                queue.append((child['url'], depth + 1, False, sitemap_url))

        details.append(detail)

    return details


def previous_sitemap_details(previous):
    if not previous:
        return []
    try:
        return json.loads(previous["sitemap_details_json"])
    except (KeyError, TypeError, json.JSONDecodeError):
        return []


def classify_sitemap_alerts(sitemap_details, previous):
    alerts = []
    previous_details = previous_sitemap_details(previous)
    current_by_url = {item["url"]: item for item in sitemap_details}
    previous_by_url = {item["url"]: item for item in previous_details}

    for item in sitemap_details:
        if item["status_code"] is None or item["error"]:
            alerts.append(make_alert("high", "sitemap_inaccessible", f"Sitemap inaccessible: {item['url']}", url=item["url"], current_status="inaccessible"))
        elif item["type"] == "urlset" and item["url_count"] == 0:
            alerts.append(make_alert("medium", "sitemap_empty", f"Sitemap vide: {item['url']}", url=item["url"], current_status="empty"))

    for sitemap_url in sorted(set(previous_by_url) - set(current_by_url)):
        previous_item = previous_by_url[sitemap_url]
        if previous_item.get("declared_in_robots"):
            alerts.append(make_alert("high", "sitemap_removed", f"Sitemap disparu: {sitemap_url}", url=sitemap_url, previous_status="present", current_status="missing"))
        else:
            alerts.append(make_alert("high", "sitemap_child_removed", f"Sitemap enfant supprimé: {sitemap_url}", url=sitemap_url, previous_status="present", current_status="missing"))

    for sitemap_url, current_item in current_by_url.items():
        previous_item = previous_by_url.get(sitemap_url)
        if not previous_item:
            continue
        if current_item.get("type") != "urlset" or previous_item.get("type") != "urlset":
            continue

        current_count = current_item.get("url_count", 0)
        previous_count = previous_item.get("url_count", 0)
        if previous_count <= 0:
            continue

        change_ratio = (current_count - previous_count) / previous_count
        if change_ratio <= -URL_DROP_THRESHOLD:
            alerts.append(make_alert("high", "sitemap_url_drop", f"Chute du nombre d'URLs dans {sitemap_url}: {previous_count} → {current_count}", url=sitemap_url, previous_status=str(previous_count), current_status=str(current_count)))
        elif change_ratio >= URL_INCREASE_THRESHOLD:
            alerts.append(make_alert("medium", "sitemap_url_increase", f"Hausse anormale du nombre d'URLs dans {sitemap_url}: {previous_count} → {current_count}", url=sitemap_url, previous_status=str(previous_count), current_status=str(current_count)))

    return alerts


def previous_important_url_results(previous):
    if not previous:
        return []
    try:
        return json.loads(previous["important_url_results_json"])
    except (KeyError, TypeError, json.JSONDecodeError):
        return []


def robots_path_matches(pattern, url_path):
    if pattern == "":
        return False
    escaped = re.escape(pattern).replace("\\*", ".*")
    if escaped.endswith("\\$"):
        regex = "^" + escaped[:-2] + "$"
    else:
        regex = "^" + escaped
    return re.match(regex, url_path) is not None


def user_agent_applies(rule_agent, user_agent):
    rule_agent = (rule_agent or "*").lower()
    user_agent = (user_agent or "").lower()
    return rule_agent == "*" or rule_agent in user_agent or user_agent in rule_agent


def rule_specificity(rule):
    pattern = rule.get("content") or ""
    return len(pattern.replace("*", "").replace("$", ""))


def explain_robots_match(robots_df, user_agent, url):
    if robots_df is None or robots_df.empty:
        return {
            "user_agent": user_agent,
            "url": url,
            "allowed": True,
            "reason": "No robots rules parsed for this URL.",
            "matched_rule": None,
            "overridden_rule": None,
        }

    parsed_url = urlparse(url)
    url_path = parsed_url.path or "/"
    if parsed_url.query:
        url_path = f"{url_path}?{parsed_url.query}"

    directives = robots_df[robots_df["directive"].isin(["allow", "disallow"])].dropna(subset=["content"])
    applicable = directives[directives["user_agent"].apply(lambda agent: user_agent_applies(agent, user_agent))]
    matching_rules = []
    for _, rule in applicable.iterrows():
        rule_dict = rule.to_dict()
        if robots_path_matches(rule_dict.get("content") or "", url_path):
            matching_rules.append(rule_dict)

    if not matching_rules:
        return {
            "user_agent": user_agent,
            "url": url,
            "allowed": True,
            "reason": "No matching Allow/Disallow rule; URL is allowed by default.",
            "matched_rule": None,
            "overridden_rule": None,
        }

    matching_rules.sort(key=lambda rule: (rule_specificity(rule), rule.get("directive") == "allow", -(rule.get("line_number") or 0)), reverse=True)
    winner = matching_rules[0]
    opposing_rules = [rule for rule in matching_rules[1:] if rule.get("directive") != winner.get("directive")]
    overridden_rule = opposing_rules[0] if opposing_rules else None
    allowed = winner.get("directive") == "allow"

    return {
        "user_agent": user_agent,
        "url": url,
        "allowed": allowed,
        "reason": f"{winner.get('directive', '').title()} {winner.get('content')} line {winner.get('line_number')} wins for {url_path}.",
        "matched_rule": {
            "user_agent": winner.get("user_agent"),
            "directive": winner.get("directive"),
            "path": winner.get("content"),
            "line_number": winner.get("line_number"),
            "specificity": rule_specificity(winner),
        },
        "overridden_rule": {
            "user_agent": overridden_rule.get("user_agent"),
            "directive": overridden_rule.get("directive"),
            "path": overridden_rule.get("content"),
            "line_number": overridden_rule.get("line_number"),
            "specificity": rule_specificity(overridden_rule),
        } if overridden_rule else None,
    }


def explain_important_url_rules(robots_content, url, agent_results):
    robots_df = parse_robots_to_df(robots_content, url)
    return {
        user_agent: explain_robots_match(robots_df, user_agent, url)
        for user_agent in agent_results
    }


def test_important_urls(site, robots_content, sitemap_details, important_urls):
    sitemap_url_set = urls_from_sitemaps(sitemap_details)
    matching_urls = [row for row in important_urls if site_matches_important_url(site, row)]
    sitemap_sample_rows = [
        {
            "site": site["name"],
            "url": url,
            "type": "sitemap_sample",
            "priority": "normal",
        }
        for url in sample_sitemap_urls(site, sitemap_details)
    ]
    configured_urls = {(row.get("url") or "").strip() for row in matching_urls}
    matching_urls = matching_urls + [row for row in sitemap_sample_rows if row["url"] not in configured_urls]
    results = []

    for row in matching_urls:
        url = (row.get("url") or "").strip()
        if not url:
            continue
        agent_results = {}
        for user_agent in ROBOTS_USER_AGENTS:
            agent_results[user_agent] = can_fetch_url(robots_content, user_agent, url)
        results.append(
            {
                "site": row.get("site", ""),
                "url": url,
                "type": row.get("type", ""),
                "priority": row.get("priority", ""),
                "is_homepage": is_homepage_url(site["base_url"], url),
                "in_sitemap": url in sitemap_url_set,
                "agents": agent_results,
                "rule_explanations": explain_important_url_rules(robots_content, url, agent_results),
            }
        )

    return results


def classify_important_url_alerts(important_url_results, previous):
    alerts = []
    previous_results = previous_important_url_results(previous)
    previous_by_key = {
        (item["url"], user_agent): allowed
        for item in previous_results
        for user_agent, allowed in item.get("agents", {}).items()
    }

    for item in important_url_results:
        url = item["url"]
        priority = item.get("priority", "").lower()
        url_type = item.get("type", "")
        agents = item.get("agents", {})
        googlebot_allowed = agents.get("Googlebot", True)
        ai_agents = ["GPTBot", "ClaudeBot", "PerplexityBot", "CCBot"]
        blocked_agents = [agent for agent, allowed in agents.items() if not allowed]
        blocked_ai_agents = [agent for agent in ai_agents if agents.get(agent) is False]

        if item.get("is_homepage") and blocked_agents:
            for user_agent in blocked_agents:
                alerts.append(make_alert("critical", "homepage_blocked", f"Homepage bloquée pour {user_agent}: {url}", url=url, user_agent=user_agent, current_status="blocked"))

        if priority == "high" and blocked_agents:
            for user_agent in blocked_agents:
                alerts.append(make_alert("critical", "high_priority_url_blocked", f"URL high priority bloquée pour {user_agent}: {url}", url=url, user_agent=user_agent, current_status="blocked"))

        if item.get("in_sitemap") and blocked_agents:
            for user_agent in blocked_agents:
                alerts.append(make_alert("high", "sitemap_url_blocked", f"Page présente dans sitemap mais bloquée pour {user_agent}: {url}", url=url, user_agent=user_agent, current_status="blocked"))

        if googlebot_allowed and blocked_ai_agents:
            for user_agent in blocked_ai_agents:
                alerts.append(make_alert("medium", "ai_bot_blocked", f"Googlebot autorisé mais {user_agent} bloqué: {url}", url=url, user_agent=user_agent, current_status="blocked"))

        if url_type.lower() in {"conversion", "business", "money"} and blocked_agents:
            for user_agent in blocked_agents:
                alerts.append(make_alert("critical", "business_url_blocked", f"URL business critique bloquée pour {user_agent}: {url}", url=url, user_agent=user_agent, current_status="blocked"))

        for user_agent, allowed in agents.items():
            previous_allowed = previous_by_key.get((url, user_agent))
            if previous_allowed is not None and previous_allowed != allowed:
                previous_status = "allowed" if previous_allowed else "blocked"
                current_status = "allowed" if allowed else "blocked"
                alerts.append(make_alert("high", "robots_status_changed", f"Changement robots {user_agent} pour {url}: {previous_status} → {current_status}", url=url, user_agent=user_agent, previous_status=previous_status, current_status=current_status))

    return alerts


def get_previous_check(base_url):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        return conn.execute(
            """
            SELECT * FROM checks
            WHERE base_url = ?
            ORDER BY checked_at DESC
            LIMIT 1
            """,
            (base_url,),
        ).fetchone()


def classify_alerts(site, status_code, content, sitemaps, sitemap_details, important_url_results, previous):
    alerts = []
    critical_patterns = site.get("critical_patterns", [])

    if status_code is None:
        alerts.append(make_alert("critical", "robots_inaccessible", "robots.txt inaccessible", url=robots_url(site["base_url"]), current_status="inaccessible"))
    elif status_code >= 500:
        alerts.append(make_alert("critical", "robots_inaccessible", f"robots.txt retourne {status_code}", url=robots_url(site["base_url"]), current_status=str(status_code)))
    elif status_code == 404:
        alerts.append(make_alert("high", "robots_not_found", "robots.txt retourne 404", url=robots_url(site["base_url"]), current_status="404"))
    elif status_code >= 400:
        alerts.append(make_alert("high", "robots_http_error", f"robots.txt retourne {status_code}", url=robots_url(site["base_url"]), current_status=str(status_code)))

    # Use advertools adapter for intelligent robots analysis
    if content:
        robots_df = parse_robots_to_df(content, robots_url(site["base_url"]))
        robots_issues = detect_robots_issues(robots_df)
        robots_intelligence = analyze_robots_intelligence(robots_df, robots_issues)
        
        # Add alerts based on advertools analysis
        for issue in robots_issues:
            if issue['type'] == 'disallow_all':
                alerts.append(make_alert("critical", "disallow_all", issue['description'], url=robots_url(site["base_url"]), current_status="blocked"))
            elif issue['type'] == 'contradictory_directive':
                alerts.append(make_alert("medium", "contradictory_directive", issue['description'], url=robots_url(site["base_url"]), current_status="contradictory"))
            elif issue['type'] == 'rule_order_conflict':
                alerts.append(make_alert("medium", "rule_order_conflict", issue['description'], url=robots_url(site["base_url"]), current_status="ambiguous_order"))
            elif issue['type'] == 'crawl_delay':
                alerts.append(make_alert("info", "crawl_delay", issue['description'], url=robots_url(site["base_url"]), current_status="crawl_delay"))
    else:
        # Fallback to simple string matching if content is empty
        lowered = content.lower() if content else ""
        if "disallow: /" in lowered:
            alerts.append(make_alert("critical", "disallow_all", "Directive Disallow: / détectée", url=robots_url(site["base_url"]), current_status="blocked"))

    for pattern in critical_patterns:
        if pattern != "/" and f"disallow: {pattern.lower()}" in (content.lower() if content else ""):
            alerts.append(make_alert("critical", "critical_pattern_blocked", f"Pattern critique bloqué: {pattern}", url=pattern, current_status="blocked"))

    if not sitemaps:
        alerts.append(make_alert("medium", "no_sitemap_declared", "Aucun sitemap déclaré dans robots.txt", url=robots_url(site["base_url"]), current_status="missing"))

    if previous:
        previous_hash = previous["content_hash"]
        current_hash = content_hash(content or "")
        previous_sitemaps = set(json.loads(previous["sitemaps_json"]))
        current_sitemaps = set(sitemaps)

        if previous_hash != current_hash:
            alerts.append(make_alert("medium", "robots_changed", "robots.txt modifié depuis le dernier check", url=robots_url(site["base_url"]), previous_status=previous_hash, current_status=current_hash))

        removed_sitemaps = sorted(previous_sitemaps - current_sitemaps)
        for sitemap in removed_sitemaps:
            alerts.append(make_alert("high", "sitemap_removed_from_robots", f"Sitemap supprimé du robots.txt: {sitemap}", url=sitemap, previous_status="present", current_status="missing"))

    alerts.extend(classify_sitemap_alerts(sitemap_details, previous))
    alerts.extend(classify_important_url_alerts(important_url_results, previous))
    return alerts


def summarize_crawl_policy(status_code, alerts, important_url_results, sitemap_details):
    if status_code is None:
        status = "Unknown"
    elif any((alert.get("severity") or alert.get("level")) == "critical" for alert in alerts):
        status = "Critical"
    elif any((alert.get("severity") or alert.get("level")) == "high" for alert in alerts):
        status = "Warning"
    elif any((alert.get("severity") or alert.get("level")) == "medium" for alert in alerts):
        status = "Warning"
    else:
        status = "OK"

    summary = []
    high_priority_urls = [
        item
        for item in important_url_results
        if item.get("priority", "").lower() == "high"
    ]
    googlebot_blocked_high = [
        item
        for item in high_priority_urls
        if item.get("agents", {}).get("Googlebot") is False
    ]
    business_ai_blocked = [
        item
        for item in important_url_results
        if item.get("type", "").lower() in {"conversion", "business", "money"}
        and any(
            item.get("agents", {}).get(agent) is False
            for agent in ["GPTBot", "ClaudeBot", "PerplexityBot", "CCBot"]
        )
    ]
    sitemap_drops = [
        alert
        for alert in alerts
        if alert.get("alert_type") == "sitemap_url_drop"
    ]
    inaccessible_sitemaps = [
        item
        for item in sitemap_details
        if item.get("error")
    ]

    if googlebot_blocked_high:
        summary.append(f"Googlebot est bloqué sur {len(googlebot_blocked_high)} URL(s) critique(s).")
    elif high_priority_urls:
        summary.append("Googlebot peut accéder aux URLs critiques suivies.")
    else:
        summary.append("Aucune URL critique manuelle configurée pour ce site.")

    if sitemap_drops:
        summary.append(f"{len(sitemap_drops)} sitemap(s) ont perdu plus de {int(URL_DROP_THRESHOLD * 100)} % de leurs URLs.")

    if business_ai_blocked:
        summary.append(f"Des bots IA sont bloqués sur {len(business_ai_blocked)} URL(s) business.")

    if inaccessible_sitemaps:
        summary.append(f"{len(inaccessible_sitemaps)} sitemap(s) sont inaccessibles.")

    if status == "OK" and len(summary) == 1:
        summary.append("Aucune alerte robots.txt ou sitemap majeure détectée.")

    return {
        "status": status,
        "summary": " ".join(summary),
    }


def save_check(site, result):
    print(f"=== Starting save_check for site: {site['name']} ===")
    print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT SET')}")
    print(f"SUPABASE_KEY: {'SET' if os.getenv('SUPABASE_KEY') else 'NOT SET'}")
    
    # Save to Supabase instead of local SQLite
    try:
        print("Creating Supabase client...")
        supabase_client = supabase.create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_KEY')
        )
        
        # Get site ID from Supabase
        print(f"Looking up site ID for base_url: {site['base_url']}")
        site_response = supabase_client.table('sites').select('id').eq('base_url', site['base_url']).execute()
        if not site_response.data:
            print(f"Site not found in Supabase: {site['base_url']}")
            return
        
        site_id = site_response.data[0]['id']
        print(f"Found site ID: {site_id}")
        
        # Insert check with intelligence data
        print("Preparing check data...")
        check_data = {
            'site_id': site_id,
            'checked_at': result['checked_at'],
            'robots_url': result['robots_url'],
            'status_code': result['status_code'],
            'final_url': result['final_url'],
            'content_hash': result['content_hash'],
            'content': result['content'],
            'sitemaps': result['sitemaps'],
            'sitemap_details': result['sitemap_details'],
            'important_url_results': result['important_url_results'],
            'alerts': result['alerts'],
            'robots_intelligence_score': result.get('robots_intelligence_score'),
            'ai_accessibility': result.get('ai_accessibility'),
            'risk_classification': result.get('risk_classification'),
            'robots_diff': result.get('robots_diff'),
            'portfolio_benchmark': result.get('portfolio_benchmark')
        }
        
        print("Inserting check into Supabase...")
        check_response = supabase_client.table('checks').insert(check_data).execute()
        check_id = check_response.data[0]['id'] if check_response.data else None
        if not check_id:
            print("Could not retrieve inserted check ID from Supabase")
            return
        print(f"Check saved to Supabase for site: {site['name']}")

        if result.get('sitemap_details'):
            print(f"Inserting {len(result['sitemap_details'])} sitemap details into sitemap_details table...")
            for sitemap_detail in result['sitemap_details']:
                sitemap_data = {
                    'check_id': check_id,
                    'site_id': site_id,
                    'url': sitemap_detail.get('url'),
                    'parent': sitemap_detail.get('parent'),
                    'declared_in_robots': sitemap_detail.get('declared_in_robots', False),
                    'depth': sitemap_detail.get('depth', 0),
                    'status_code': sitemap_detail.get('status_code'),
                    'type': sitemap_detail.get('type'),
                    'url_count': sitemap_detail.get('url_count', 0),
                    'child_count': sitemap_detail.get('child_count', 0),
                    'error': sitemap_detail.get('error')
                }
                supabase_client.table('sitemap_details').insert(sitemap_data).execute()
            print("Sitemap details saved to Supabase")

        if result.get('alerts'):
            print(f"Inserting {len(result['alerts'])} alerts into alerts table...")
            for alert in result['alerts']:
                alert_data = {
                    'site_id': site_id,
                    'check_id': check_id,
                    'severity': alert.get('severity', 'info'),
                    'alert_type': alert.get('alert_type', 'unknown'),
                    'message': alert.get('message', ''),
                    'url': alert.get('url', ''),
                    'user_agent': alert.get('user_agent', ''),
                    'previous_status': alert.get('previous_status', ''),
                    'current_status': alert.get('current_status', '')
                }
                supabase_client.table('alerts').insert(alert_data).execute()
            print("Alerts saved to Supabase")
        
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to local SQLite
        print("Falling back to local SQLite...")
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                """
                INSERT INTO checks (
                    checked_at, site_name, base_url, robots_url, status_code,
                    final_url, content_hash, content, sitemaps_json, sitemap_details_json,
                    important_url_results_json, alerts_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    result["checked_at"],
                    site["name"],
                    site["base_url"],
                    result["robots_url"],
                    result["status_code"],
                    result["final_url"],
                    result["content_hash"],
                    result["content"],
                    json.dumps(result["sitemaps"], ensure_ascii=False),
                    json.dumps(result["sitemap_details"], ensure_ascii=False),
                    json.dumps(result["important_url_results"], ensure_ascii=False),
                    json.dumps(result["alerts"], ensure_ascii=False),
                ),
            )
            conn.commit()
            print("Check saved to local SQLite")


def check_site(site):
    base_url = normalize_base_url(site["base_url"])
    site = {**site, "base_url": base_url}
    url = robots_url(base_url)
    previous = get_previous_check(base_url)
    important_urls = load_important_urls()

    try:
        status_code, final_url, content = fetch_text(url)
    except requests.RequestException as error:
        status_code = None
        final_url = None
        content = ""
        sitemaps = []
        sitemap_details = []
        important_url_results = []
        alerts = [make_alert("critical", "robots_network_error", f"Erreur réseau: {error}", url=url, current_status="network_error")]
    else:
        # Use advertools adapter for sitemap extraction
        sitemaps = extract_sitemaps(content, final_url or url)
        sitemap_details = crawl_sitemaps(sitemaps)
        important_url_results = test_important_urls(site, content, sitemap_details, important_urls)
        alerts = classify_alerts(site, status_code, content, sitemaps, sitemap_details, important_url_results, previous)
    
    result = {
        "checked_at": now_iso(),
        "robots_url": url,
        "status_code": status_code,
        "final_url": final_url,
        "content_hash": content_hash(content),
        "content": content,
        "sitemaps": sitemaps,
        "sitemap_details": sitemap_details,
        "important_url_results": important_url_results,
        "alerts": alerts,
    }
    
    # Add robots intelligence to result for dashboard display
    if content:
        robots_df = parse_robots_to_df(content, url)
        robots_issues = detect_robots_issues(robots_df)
        robots_intelligence = analyze_robots_intelligence(robots_df, robots_issues)
        result["robots_intelligence"] = robots_intelligence
        result["robots_issues"] = robots_issues
        
        # Calculate Robots Intelligence Score
        robots_accessible = status_code is not None and status_code < 400
        sitemap_declared = len(sitemaps) > 0
        sitemap_valid = any(detail.get('type') == 'urlset' for detail in sitemap_details)
        ai_bots_consistent = not any(
            result.get('agents', {}).get(agent) is False
            for result in important_url_results
            for agent in ["GPTBot", "ClaudeBot", "PerplexityBot", "CCBot"]
        )
        no_contradictory_directives = not any(issue['type'] == 'contradictory_directive' for issue in robots_issues)
        
        # Check business URLs accessibility
        business_urls_accessible = True
        for url_result in important_url_results:
            if url_result.get('type', '').lower() in {'conversion', 'business', 'money'}:
                agents = url_result.get('agents', {})
                if not agents.get('Googlebot', True):
                    business_urls_accessible = False
                    break
        
        # Calculate historical stability
        historical_stability = 1.0
        if previous:
            previous_hash = previous.get('content_hash')
            current_hash = content_hash(content)
            if previous_hash != current_hash:
                historical_stability = 0.5  # Reduced stability if changed
        
        robots_score = RobotsIntelligenceScore.calculate_score(
            robots_accessible=robots_accessible,
            sitemap_declared=sitemap_declared,
            sitemap_valid=sitemap_valid,
            ai_bots_consistent=ai_bots_consistent,
            no_contradictory_directives=no_contradictory_directives,
            business_urls_accessible=business_urls_accessible,
            historical_stability=historical_stability
        )
        result["robots_intelligence_score"] = robots_score
        
        # Calculate AI Accessibility Score
        ai_accessibility = AIAccessibilityScore.calculate_score(important_url_results)
        result["ai_accessibility"] = ai_accessibility
        
        # Classify alerts by risk impact
        risk_classification = RiskImpactClassification.classify_alerts(alerts)
        result["risk_classification"] = risk_classification
        
        # Analyze robots diff if previous exists
        if previous and previous.get('content'):
            diff_analysis = RobotsDiffIntelligence.analyze_diff(previous['content'], content)
            result["robots_diff"] = diff_analysis
    
    save_check(site, result)
    return result


def export_alerts_csv(results):
    DATA_DIR.mkdir(exist_ok=True)
    rows = []
    for item in results:
        site = item["site"]
        result = item["result"]
        for alert in result["alerts"]:
            severity = alert.get("severity") or alert.get("level", "")
            rows.append(
                {
                    "date": result["checked_at"],
                    "site": site["name"],
                    "severity": severity,
                    "alert_type": alert.get("alert_type", "general"),
                    "message": alert.get("message", ""),
                    "url": alert.get("url", ""),
                    "user_agent": alert.get("user_agent", ""),
                    "previous_status": alert.get("previous_status", ""),
                    "current_status": alert.get("current_status", ""),
                }
            )

    with ALERTS_CSV_PATH.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=ALERT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def run_all(config_path="sites.yml"):
    """Run all site checks using advertools-enhanced parsing and intelligence."""
    init_db()
    sites = load_sites(config_path)
    results = []
    for site in sites:
        results.append({"site": site, "result": check_site(site)})
    export_alerts_csv(results)
    
    # Generate portfolio benchmark
    sites_data = []
    for item in results:
        site_data = {
            "name": item["site"]["name"],
            "robots_intelligence": item["result"].get("robots_intelligence_score", {}),
            "ai_accessibility": item["result"].get("ai_accessibility", {}),
            "sitemaps": item["result"].get("sitemaps", []),
            "alerts": item["result"].get("alerts", [])
        }
        sites_data.append(site_data)
    
    portfolio_benchmark = PortfolioBenchmark.generate_benchmark(sites_data)
    
    # Add portfolio benchmark to results
    for item in results:
        item["portfolio_benchmark"] = portfolio_benchmark
    
    return results


def unified_diff(previous_content, current_content):
    return "\n".join(
        difflib.unified_diff(
            previous_content.splitlines(),
            current_content.splitlines(),
            fromfile="previous robots.txt",
            tofile="current robots.txt",
            lineterm="",
        )
    )


if __name__ == "__main__":
    for item in run_all():
        site = item["site"]
        result = item["result"]
        sitemap_url_count = sum(item["url_count"] for item in result["sitemap_details"])
        print(f"{site['name']} - {result['status_code']} - {sitemap_url_count} sitemap URL(s) - {len(result['alerts'])} alert(s)")
