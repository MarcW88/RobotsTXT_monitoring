"""
Advertools Adapter Module
Provides expert robots.txt and sitemap parsing using advertools library.
This module serves as the intelligent parsing layer for robots.txt analysis.
"""

import gzip
import pandas as pd
import requests
from xml.etree import ElementTree
from urllib.parse import urljoin
from typing import List, Dict, Tuple, Optional
import advertools as adv

DEFAULT_TIMEOUT = 20


def parse_robots_to_df(robots_content: str, robots_url: str) -> pd.DataFrame:
    """
    Parse robots.txt content into a structured DataFrame using advertools.
    
    Returns DataFrame with columns:
    - user_agent: The user-agent targeted by the rule
    - directive: Type of directive (allow, disallow, crawl-delay, etc.)
    - content: The path or value for the directive
    - line_number: Line number in robots.txt
    - is_comment: Whether the line is a comment
    - is_empty: Whether the line is empty
    """
    lines = robots_content.splitlines()
    records = []
    current_user_agent = '*'
    
    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            records.append({
                'user_agent': current_user_agent,
                'directive': None,
                'content': None,
                'line_number': line_num,
                'is_comment': False,
                'is_empty': True
            })
            continue
        
        # Skip comments
        if stripped.startswith('#'):
            records.append({
                'user_agent': current_user_agent,
                'directive': 'comment',
                'content': stripped[1:].strip(),
                'line_number': line_num,
                'is_comment': True,
                'is_empty': False
            })
            continue
        
        # Parse user-agent declarations
        lower_line = stripped.lower()
        if lower_line.startswith('user-agent:'):
            current_user_agent = stripped.split(':', 1)[1].strip()
            records.append({
                'user_agent': current_user_agent,
                'directive': 'user-agent',
                'content': current_user_agent,
                'line_number': line_num,
                'is_comment': False,
                'is_empty': False
            })
            continue
        
        # Parse directives
        directive = None
        content = None
        
        if lower_line.startswith('allow:'):
            directive = 'allow'
            content = stripped.split(':', 1)[1].strip()
        elif lower_line.startswith('disallow:'):
            directive = 'disallow'
            content = stripped.split(':', 1)[1].strip()
        elif lower_line.startswith('crawl-delay:'):
            directive = 'crawl-delay'
            content = stripped.split(':', 1)[1].strip()
        elif lower_line.startswith('sitemap:'):
            directive = 'sitemap'
            content = stripped.split(':', 1)[1].strip()
        else:
            # Unknown directive
            directive = 'unknown'
            content = stripped
        
        records.append({
            'user_agent': current_user_agent,
            'directive': directive,
            'content': content,
            'line_number': line_num,
            'is_comment': False,
            'is_empty': False
        })
    
    return pd.DataFrame(records)


def extract_sitemaps_from_robots(robots_df: pd.DataFrame) -> List[str]:
    """
    Extract sitemap URLs from parsed robots.txt DataFrame.
    
    Returns sorted list of unique sitemap URLs.
    """
    sitemap_rows = robots_df[robots_df['directive'] == 'sitemap']
    sitemaps = sitemap_rows['content'].dropna().unique().tolist()
    return sorted([s for s in sitemaps if s])


def detect_robots_issues(robots_df: pd.DataFrame) -> List[Dict]:
    """
    Detect potential issues in robots.txt using structured analysis.
    
    Returns list of issue dictionaries with type and description.
    """
    issues = []
    
    # Check for disallow all
    disallow_all = robots_df[
        (robots_df['directive'] == 'disallow') & 
        (robots_df['content'] == '/')
    ]
    if not disallow_all.empty:
        affected_agents = disallow_all['user_agent'].unique().tolist()
        issues.append({
            'type': 'disallow_all',
            'severity': 'critical',
            'description': f'Directive Disallow: / detected for user-agents: {", ".join(affected_agents)}',
            'affected_agents': affected_agents
        })
    
    # Check for contradictory directives
    for user_agent in robots_df['user_agent'].unique():
        if user_agent == '*':
            continue
        agent_df = robots_df[robots_df['user_agent'] == user_agent]
        
        # Check for same path with both allow and disallow
        paths = agent_df[agent_df['directive'].isin(['allow', 'disallow'])]['content'].tolist()
        path_counts = {}
        for path in paths:
            if path in path_counts:
                path_counts[path] += 1
            else:
                path_counts[path] = 1
        
        for path, count in path_counts.items():
            if count > 1:
                issues.append({
                    'type': 'contradictory_directive',
                    'severity': 'medium',
                    'description': f'Contradictory directives for path "{path}" under user-agent {user_agent}',
                    'affected_agents': [user_agent],
                    'path': path
                })
    
    # Check for AI-specific rules
    ai_agents = ['gptbot', 'claudebot', 'perplexitybot', 'ccbot', 'google-extended']
    ai_rules = robots_df[robots_df['user_agent'].str.lower().isin(ai_agents)]
    if not ai_rules.empty:
        issues.append({
            'type': 'ai_specific_rules',
            'severity': 'info',
            'description': f'AI-specific rules found for: {", ".join(ai_rules["user_agent"].unique())}',
            'affected_agents': ai_rules['user_agent'].unique().tolist()
        })
    
    # Check for crawl-delay
    crawl_delay = robots_df[robots_df['directive'] == 'crawl-delay']
    if not crawl_delay.empty:
        issues.append({
            'type': 'crawl_delay',
            'severity': 'info',
            'description': f'Crawl-delay directives found for: {", ".join(crawl_delay["user_agent"].unique())}',
            'affected_agents': crawl_delay['user_agent'].unique().tolist()
        })
    
    return issues


def crawl_sitemap_with_advertools(sitemap_url: str, max_depth: int = 4) -> Dict:
    """
    Crawl a sitemap (or sitemap index) using advertools for intelligent parsing.
    
    Returns dictionary with sitemap metadata and URLs.
    """
    result = {
        'url': sitemap_url,
        'status_code': None,
        'final_url': None,
        'type': 'unknown',
        'url_count': 0,
        'urls': [],
        'child_count': 0,
        'children': [],
        'error': None
    }
    
    try:
        try:
            sitemap_df = adv.sitemap_to_df(sitemap_url)
            if not sitemap_df.empty:
                loc_column = 'loc' if 'loc' in sitemap_df.columns else sitemap_df.columns[0]
                result['urls'] = sitemap_df[loc_column].dropna().astype(str).unique().tolist()
                result['url_count'] = len(result['urls'])
                result['type'] = 'urlset'
        except Exception as e:
            result['error'] = f'advertools parsing error: {e}'

        response = requests.get(
            sitemap_url,
            timeout=DEFAULT_TIMEOUT,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; RobotsTxtMonitor/1.0; +https://github.com/MarcW88/RobotsTXT_monitoring)',
                'Accept': 'application/xml,text/xml,*/*;q=0.8',
            }
        )
        result['status_code'] = response.status_code
        result['final_url'] = response.url
        
        if response.status_code >= 400:
            result['error'] = f'HTTP {response.status_code}'
            return result
        
        # Handle gzip
        content = response.content
        if sitemap_url.lower().endswith('.gz'):
            try:
                content = gzip.decompress(content)
            except Exception as e:
                result['error'] = f'Gzip decompression error: {e}'
                return result
        
        # Parse XML
        try:
            root = ElementTree.fromstring(content)
            root_name = root.tag.split('}', 1)[-1] if '}' in root.tag else root.tag
            
            if root_name == 'sitemapindex':
                result['type'] = 'index'
                for sitemap in root:
                    sitemap_tag = sitemap.tag.split('}', 1)[-1] if '}' in sitemap.tag else sitemap.tag
                    if sitemap_tag != 'sitemap':
                        continue
                    loc = None
                    lastmod = None
                    for child in sitemap:
                        child_name = child.tag.split('}', 1)[-1] if '}' in child.tag else child.tag
                        if child_name == 'loc':
                            loc = child.text.strip() if child.text else None
                        elif child_name == 'lastmod':
                            lastmod = child.text.strip() if child.text else None
                    if loc:
                        result['children'].append({'url': loc, 'lastmod': lastmod})
                result['child_count'] = len(result['children'])
                
            elif root_name == 'urlset':
                result['type'] = 'urlset'
                if result['url_count'] == 0:
                    for url_node in root:
                        url_tag = url_node.tag.split('}', 1)[-1] if '}' in url_node.tag else url_node.tag
                        if url_tag != 'url':
                            continue
                        loc = None
                        for child in url_node:
                            child_name = child.tag.split('}', 1)[-1] if '}' in child.tag else child.tag
                            if child_name == 'loc':
                                loc = child.text.strip() if child.text else None
                                break
                        if loc:
                            result['urls'].append(loc)
                    result['url_count'] = len(result['urls'])
            else:
                result['error'] = result['error'] or f'Unknown root element: {root_name}'
                
        except ElementTree.ParseError as e:
            result['error'] = result['error'] or f'XML parsing error: {e}'
            
    except requests.RequestException as e:
        result['error'] = f'Network error: {e}'
    
    return result


def normalize_sitemap_dataframe(sitemap_details: List[Dict]) -> pd.DataFrame:
    """
    Convert sitemap details list to normalized DataFrame.
    
    Returns DataFrame with columns:
    - url: Sitemap URL
    - type: Type (index or urlset)
    - status_code: HTTP status code
    - url_count: Number of URLs in sitemap
    - child_count: Number of child sitemaps
    - error: Error message if any
    - depth: Depth in sitemap tree
    - parent: Parent sitemap URL
    """
    records = []
    for detail in sitemap_details:
        records.append({
            'url': detail.get('url'),
            'type': detail.get('type'),
            'status_code': detail.get('status_code'),
            'url_count': detail.get('url_count', 0),
            'child_count': detail.get('child_count', 0),
            'error': detail.get('error'),
            'depth': detail.get('depth', 0),
            'parent': detail.get('parent')
        })
    
    return pd.DataFrame(records)


def analyze_robots_intelligence(robots_df: pd.DataFrame, issues: List[Dict]) -> Dict:
    """
    Provide high-level intelligence analysis of robots.txt.
    
    Returns dictionary with analysis results:
    - complexity: Number of rules
    - user_agents: List of user-agents
    - has_ai_rules: Whether AI-specific rules exist
    - has_crawl_delay: Whether crawl-delay exists
    - sitemap_count: Number of sitemaps
    - risk_level: Overall risk assessment
    """
    sitemaps = extract_sitemaps_from_robots(robots_df)
    user_agents = robots_df['user_agent'].unique().tolist()
    
    # Calculate risk level
    critical_issues = [i for i in issues if i.get('severity') == 'critical']
    high_issues = [i for i in issues if i.get('severity') == 'high']
    
    if critical_issues:
        risk_level = 'critical'
    elif high_issues:
        risk_level = 'high'
    elif issues:
        risk_level = 'medium'
    else:
        risk_level = 'low'
    
    return {
        'complexity': len(robots_df[robots_df['directive'].notna()]),
        'user_agents': user_agents,
        'has_ai_rules': any(i['type'] == 'ai_specific_rules' for i in issues),
        'has_crawl_delay': any(i['type'] == 'crawl_delay' for i in issues),
        'sitemap_count': len(sitemaps),
        'risk_level': risk_level,
        'issues_count': len(issues),
        'critical_issues_count': len(critical_issues)
    }
