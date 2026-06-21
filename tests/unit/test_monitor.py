import json
import os
import sys
import types
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Prevent actual supabase/realtime imports during import-time in monitor.py
sys.modules["supabase"] = types.ModuleType("supabase")
sys.modules["realtime"] = types.ModuleType("realtime")

import monitor
from monitor import (
    normalize_base_url,
    robots_url,
    content_hash,
    is_homepage_url,
    urls_from_sitemaps,
    sample_sitemap_urls,
    previous_sitemap_details,
    previous_important_url_results,
    classify_sitemap_alerts,
    classify_important_url_alerts,
    classify_alerts,
    summarize_crawl_policy,
    export_alerts_csv,
    ALERTS_CSV_PATH,
)


def test_normalize_base_url_adds_trailing_slash():
    assert normalize_base_url("https://example.com") == "https://example.com/"
    assert normalize_base_url("https://example.com/") == "https://example.com/"
    assert normalize_base_url("https://example.com/fr/page?x=1") == "https://example.com/"
    assert normalize_base_url("example.com/fr/page") == "https://example.com/"


def test_robots_url_builds_robots_txt_url():
    assert robots_url("https://example.com") == "https://example.com/robots.txt"
    assert robots_url("https://example.com/fr/page?x=1") == "https://example.com/robots.txt"
    assert robots_url("example.com/fr/page") == "https://example.com/robots.txt"


def test_content_hash_is_consistent():
    assert content_hash("abc") == content_hash("abc")
    assert content_hash("abc") != content_hash("abcd")


def test_is_homepage_url_matching():
    assert is_homepage_url("https://example.com/", "https://example.com")
    assert is_homepage_url("https://example.com", "https://example.com/")
    assert not is_homepage_url("https://example.com", "https://example.com/page")


def test_urls_from_sitemaps_gathers_urls():
    sitemap_details = [
        {"urls": ["https://example.com/1", "https://example.com/2"]},
        {"urls": ["https://example.com/2", "https://example.com/3"]},
    ]
    urls = urls_from_sitemaps(sitemap_details)
    assert urls == {"https://example.com/1", "https://example.com/2", "https://example.com/3"}


def test_sample_sitemap_urls_priority_and_limit():
    site = {"name": "Example", "base_url": "https://example.com/"}
    sitemap_details = [
        {"urls": [
            "https://example.com/", 
            "https://example.com/contact", 
            "https://example.com/product/1", 
            "https://example.com/blog/post"
        ]}
    ]
    selected = sample_sitemap_urls(site, sitemap_details, limit=3)
    assert "https://example.com/" in selected
    assert len(selected) == 3


def test_previous_sitemap_details_empty_previous():
    assert previous_sitemap_details(None) == []
    assert previous_sitemap_details({}) == []


def test_previous_important_url_results_empty_previous():
    assert previous_important_url_results(None) == []
    assert previous_important_url_results({}) == []


def test_classify_sitemap_alerts_inaccessible_and_removed():
    sitemap_details = [
        {"url": "https://example.com/sitemap.xml", "type": "urlset", "status_code": None, "error": "timeout"}
    ]
    previous = {"sitemap_details_json": json.dumps([
        {"url": "https://example.com/old.xml", "declared_in_robots": True}
    ])}

    alerts = classify_sitemap_alerts(sitemap_details, previous)
    assert any(alert["alert_type"] == "sitemap_inaccessible" for alert in alerts)
    assert any(alert["alert_type"] == "sitemap_removed" for alert in alerts)


def test_test_important_urls_and_classify_important_url_alerts():
    site = {"name": "Example", "base_url": "https://example.com/"}
    robots_content = "User-agent: *\nDisallow: /private"
    sitemap_details = [{"urls": ["https://example.com/public"]}]
    important_urls = [{"site": "Example", "url": "https://example.com/private", "type": "business", "priority": "high"}]

    results = monitor.test_important_urls(site, robots_content, sitemap_details, important_urls)
    private_result = next(result for result in results if result["url"] == "https://example.com/private")
    assert any(result["url"] == "https://example.com/public" and result["type"] == "sitemap_sample" for result in results)
    assert private_result["agents"]["Googlebot"] is False
    assert private_result["rule_explanations"]["Googlebot"]["matched_rule"]["directive"] == "disallow"

    alerts = classify_important_url_alerts(results, None)
    assert any(alert["alert_type"] == "high_priority_url_blocked" for alert in alerts)
    assert any(alert["alert_type"] == "business_url_blocked" for alert in alerts)


def test_explain_robots_match_reports_overridden_rule():
    robots_content = "User-agent: *\nDisallow: /private\nAllow: /private/public"
    robots_df = monitor.parse_robots_to_df(robots_content, "https://example.com/robots.txt")
    explanation = monitor.explain_robots_match(robots_df, "Googlebot", "https://example.com/private/public/page")

    assert explanation["allowed"] is True
    assert explanation["matched_rule"]["directive"] == "allow"
    assert explanation["matched_rule"]["line_number"] == 3
    assert explanation["overridden_rule"]["directive"] == "disallow"
    assert explanation["overridden_rule"]["line_number"] == 2


def test_classify_alerts_disallow_all_and_no_sitemap():
    site = {"name": "Example", "base_url": "https://example.com", "critical_patterns": ["/"]}
    content = "User-agent: *\nDisallow: /"
    sitemaps = []
    sitemap_details = []
    important_url_results = []
    alerts = classify_alerts(site, 200, content, sitemaps, sitemap_details, important_url_results, None)

    assert any(alert["alert_type"] == "disallow_all" for alert in alerts)
    assert any(alert["alert_type"] == "no_sitemap_declared" for alert in alerts)


def test_summarize_crawl_policy_critical_and_warning():
    status_code = 200
    alerts = [
        {"severity": "critical"},
        {"alert_type": "sitemap_url_drop"}
    ]
    important_url_results = [
        {"priority": "high", "agents": {"Googlebot": False}, "type": "conversion"}
    ]
    sitemap_details = [{"error": "timeout"}]
    summary = summarize_crawl_policy(status_code, alerts, important_url_results, sitemap_details)

    assert summary["status"] == "Critical"
    assert "Googlebot est bloqué" in summary["summary"]
    assert "sitemap(s) sont inaccessibles" in summary["summary"]


def test_export_alerts_csv_writes_file(tmp_path):
    results = [
        {
            "site": {"name": "Example"},
            "result": {
                "checked_at": "2026-01-01T00:00:00Z",
                "alerts": [
                    {"severity": "critical", "alert_type": "robots_inaccessible", "message": "LOL", "url": "https://example.com/robots.txt", "user_agent": "Googlebot", "previous_status": "", "current_status": "inaccessible"}
                ]
            }
        }
    ]
    path = tmp_path / "alerts.csv"
    original_path = monitor.ALERTS_CSV_PATH
    try:
        monitor.ALERTS_CSV_PATH = path
        monitor.export_alerts_csv(results)
        assert path.exists()
        content = path.read_text(encoding="utf-8")
        assert "robots_inaccessible" in content
    finally:
        monitor.ALERTS_CSV_PATH = original_path
