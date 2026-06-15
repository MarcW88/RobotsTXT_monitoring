"""
Robots Intelligence Module
Transforms advertools parsing output into product intelligence and decision support.
Focus on insights, scoring, and visualization rather than parsing.
"""

from typing import Dict, List, Tuple, Optional
from datetime import datetime
import pandas as pd


class RobotsIntelligenceScore:
    """
    Calculates Robots Intelligence Score (0-100) based on weighted criteria.
    
    Criteria and weights:
    - robots accessible: 20
    - sitemap declared: 15
    - sitemap valid: 15
    - IA bots cohérents: 15
    - directives contradictoires: 10
    - URLs business accessibles: 15
    - stabilité historique: 10
    """
    
    WEIGHTS = {
        'robots_accessible': 20,
        'sitemap_declared': 15,
        'sitemap_valid': 15,
        'ai_bots_consistent': 15,
        'no_contradictory_directives': 10,
        'business_urls_accessible': 15,
        'historical_stability': 10
    }
    
    @staticmethod
    def calculate_score(
        robots_accessible: bool,
        sitemap_declared: bool,
        sitemap_valid: bool,
        ai_bots_consistent: bool,
        no_contradictory_directives: bool,
        business_urls_accessible: bool,
        historical_stability: float
    ) -> Dict:
        """
        Calculate overall score and individual component scores.
        
        Args:
            robots_accessible: Whether robots.txt is accessible
            sitemap_declared: Whether sitemap is declared in robots.txt
            sitemap_valid: Whether sitemap is valid and accessible
            ai_bots_consistent: Whether AI bots have consistent access
            no_contradictory_directives: Whether no contradictory directives exist
            business_urls_accessible: Whether business URLs are accessible
            historical_stability: Historical stability score (0-1)
        
        Returns:
            Dictionary with overall score and component breakdown
        """
        scores = {
            'robots_accessible': RobotsIntelligenceScore.WEIGHTS['robots_accessible'] if robots_accessible else 0,
            'sitemap_declared': RobotsIntelligenceScore.WEIGHTS['sitemap_declared'] if sitemap_declared else 0,
            'sitemap_valid': RobotsIntelligenceScore.WEIGHTS['sitemap_valid'] if sitemap_valid else 0,
            'ai_bots_consistent': RobotsIntelligenceScore.WEIGHTS['ai_bots_consistent'] if ai_bots_consistent else 0,
            'no_contradictory_directives': RobotsIntelligenceScore.WEIGHTS['no_contradictory_directives'] if no_contradictory_directives else 0,
            'business_urls_accessible': RobotsIntelligenceScore.WEIGHTS['business_urls_accessible'] if business_urls_accessible else 0,
            'historical_stability': RobotsIntelligenceScore.WEIGHTS['historical_stability'] * historical_stability
        }
        
        overall_score = sum(scores.values())
        
        return {
            'overall_score': overall_score,
            'max_score': 100,
            'component_scores': scores,
            'grade': RobotsIntelligenceScore._get_grade(overall_score)
        }
    
    @staticmethod
    def _get_grade(score: float) -> str:
        """Get letter grade based on score."""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'


class AIAccessibilityScore:
    """
    Calculates AI Accessibility Score and generates AI Accessibility Matrix.
    """
    
    AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'CCBot', 'Googlebot']
    
    @staticmethod
    def calculate_score(url_results: List[Dict]) -> Dict:
        """
        Calculate AI Accessibility Score based on URL accessibility for AI bots.
        
        Args:
            url_results: List of URL check results with agent permissions
        
        Returns:
            Dictionary with AI accessibility score and matrix
        """
        if not url_results:
            return {
                'ai_accessibility_score': 0,
                'ai_accessibility_matrix': {},
                'accessible_bots': [],
                'blocked_bots': []
            }
        
        # Build accessibility matrix
        matrix = {}
        for bot in AIAccessibilityScore.AI_BOTS:
            matrix[bot] = {'accessible': 0, 'blocked': 0, 'total': 0}
        
        for result in url_results:
            agents = result.get('agents', {})
            for bot in AIAccessibilityScore.AI_BOTS:
                if bot in agents:
                    matrix[bot]['total'] += 1
                    if agents[bot]:
                        matrix[bot]['accessible'] += 1
                    else:
                        matrix[bot]['blocked'] += 1
        
        # Calculate accessibility percentage per bot
        for bot in matrix:
            if matrix[bot]['total'] > 0:
                matrix[bot]['accessibility_percentage'] = (matrix[bot]['accessible'] / matrix[bot]['total']) * 100
            else:
                matrix[bot]['accessibility_percentage'] = 100  # No URLs to check = fully accessible
        
        # Calculate overall AI accessibility score
        total_accessibility = sum(m['accessibility_percentage'] for m in matrix.values())
        ai_accessibility_score = total_accessibility / len(matrix)
        
        # Categorize bots
        accessible_bots = [bot for bot, m in matrix.items() if m['accessibility_percentage'] >= 80]
        blocked_bots = [bot for bot, m in matrix.items() if m['accessibility_percentage'] < 50]
        
        return {
            'ai_accessibility_score': round(ai_accessibility_score, 1),
            'ai_accessibility_matrix': matrix,
            'accessible_bots': accessible_bots,
            'blocked_bots': blocked_bots,
            'risk_level': AIAccessibilityScore._get_risk_level(ai_accessibility_score)
        }
    
    @staticmethod
    def _get_risk_level(score: float) -> str:
        """Get risk level based on AI accessibility score."""
        if score >= 80:
            return 'Low'
        elif score >= 50:
            return 'Medium'
        else:
            return 'High'


class PortfolioBenchmark:
    """
    Generates portfolio benchmarking across multiple sites.
    """
    
    @staticmethod
    def generate_benchmark(sites_data: List[Dict]) -> Dict:
        """
        Generate portfolio benchmark comparing multiple sites.
        
        Args:
            sites_data: List of site data with intelligence scores
        
        Returns:
            Dictionary with portfolio benchmark metrics
        """
        if not sites_data:
            return {
                'total_sites': 0,
                'average_score': 0,
                'top_performer': None,
                'bottom_performer': None,
                'site_comparison': []
            }
        
        # Extract scores
        site_scores = []
        for site in sites_data:
            score = site.get('robots_intelligence', {}).get('overall_score', 0)
            ai_score = site.get('ai_accessibility', {}).get('ai_accessibility_score', 0)
            ai_blocked = len(site.get('ai_accessibility', {}).get('blocked_bots', []))
            
            site_scores.append({
                'name': site.get('name', 'Unknown'),
                'robots_score': score,
                'ai_accessibility_score': ai_score,
                'ai_bots_blocked': ai_blocked,
                'sitemaps': len(site.get('sitemaps', [])),
                'alerts': len(site.get('alerts', []))
            })
        
        # Sort by robots score
        site_scores.sort(key=lambda x: x['robots_score'], reverse=True)
        
        # Calculate averages
        avg_robots_score = sum(s['robots_score'] for s in site_scores) / len(site_scores)
        avg_ai_score = sum(s['ai_accessibility_score'] for s in site_scores) / len(site_scores)
        
        return {
            'total_sites': len(site_scores),
            'average_robots_score': round(avg_robots_score, 1),
            'average_ai_accessibility_score': round(avg_ai_score, 1),
            'top_performer': site_scores[0] if site_scores else None,
            'bottom_performer': site_scores[-1] if site_scores else None,
            'site_comparison': site_scores,
            'score_distribution': PortfolioBenchmark._get_score_distribution(site_scores)
        }
    
    @staticmethod
    def _get_score_distribution(site_scores: List[Dict]) -> Dict:
        """Get distribution of scores across grades."""
        grades = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
        for site in site_scores:
            score = site['robots_score']
            if score >= 90:
                grades['A'] += 1
            elif score >= 80:
                grades['B'] += 1
            elif score >= 70:
                grades['C'] += 1
            elif score >= 60:
                grades['D'] += 1
            else:
                grades['F'] += 1
        return grades


class DirectiveExplainability:
    """
    Provides explainability for robots.txt directives and issues.
    """
    
    EXPLANATIONS = {
        'disallow_all': {
            'title': 'Disallow All Detected',
            'explanation': 'The directive "Disallow: /" blocks all crawlers from accessing the entire site. This is typically used during development or maintenance.',
            'impact': 'SEO: Critical - All pages are blocked from search engines',
            'recommendation': 'Remove this directive unless intentionally blocking all crawlers'
        },
        'contradictory_directive': {
            'title': 'Contradictory Directives',
            'explanation': 'Multiple directives for the same path may conflict, causing unpredictable crawler behavior.',
            'impact': 'SEO: High - Crawler behavior may be inconsistent',
            'recommendation': 'Review and consolidate directives for each path'
        },
        'ai_specific_rules': {
            'title': 'AI-Specific Rules Detected',
            'explanation': 'Specific rules for AI crawlers (GPTBot, ClaudeBot, etc.) are present. This indicates intentional AI crawling strategy.',
            'impact': 'GEO: Medium - AI crawler access is explicitly controlled',
            'recommendation': 'Review AI crawler strategy aligns with business goals'
        },
        'crawl_delay': {
            'title': 'Crawl-Delay Directive',
            'explanation': 'Crawl-delay limits how frequently crawlers can request pages. This can help manage server load.',
            'impact': 'SEO: Low - May slow down indexing speed',
            'recommendation': 'Monitor crawl budget and server performance'
        }
    }
    
    @staticmethod
    def explain_issue(issue_type: str, context: Dict = None) -> Dict:
        """
        Get explanation for a specific robots.txt issue.
        
        Args:
            issue_type: Type of issue
            context: Additional context for the issue
        
        Returns:
            Dictionary with explanation, impact, and recommendation
        """
        base_explanation = DirectiveExplainability.EXPLANATIONS.get(issue_type, {
            'title': 'Unknown Issue',
            'explanation': 'No explanation available for this issue type.',
            'impact': 'Unknown',
            'recommendation': 'Review robots.txt configuration'
        })
        
        if context:
            base_explanation['context'] = context
        
        return base_explanation


class RobotsDiffIntelligence:
    """
    Provides intelligent diff analysis for robots.txt changes.
    """
    
    @staticmethod
    def analyze_diff(previous_content: str, current_content: str) -> Dict:
        """
        Analyze differences between previous and current robots.txt with impact classification.
        
        Args:
            previous_content: Previous robots.txt content
            current_content: Current robots.txt content
        
        Returns:
            Dictionary with classified changes and impact assessment
        """
        if not previous_content or not current_content:
            return {
                'changes': [],
                'impact_summary': {'seo': 0, 'geo': 0, 'both': 0},
                'overall_impact': 'Unknown'
            }
        
        previous_lines = set(previous_content.splitlines())
        current_lines = set(current_content.splitlines())
        
        added = current_lines - previous_lines
        removed = previous_lines - current_lines
        
        changes = []
        
        # Classify changes
        for line in added:
            change = RobotsDiffIntelligence._classify_change(line, 'added')
            if change:
                changes.append(change)
        
        for line in removed:
            change = RobotsDiffIntelligence._classify_change(line, 'removed')
            if change:
                changes.append(change)
        
        # Calculate impact summary
        impact_summary = {'seo': 0, 'geo': 0, 'both': 0}
        for change in changes:
            for impact in change['impacts']:
                impact_summary[impact] += 1
        
        # Determine overall impact
        total_changes = len(changes)
        if total_changes == 0:
            overall_impact = 'None'
        elif impact_summary['both'] > 0 or (impact_summary['seo'] > 0 and impact_summary['geo'] > 0):
            overall_impact = 'High'
        elif impact_summary['seo'] > 2 or impact_summary['geo'] > 2:
            overall_impact = 'Medium'
        else:
            overall_impact = 'Low'
        
        return {
            'changes': changes,
            'impact_summary': impact_summary,
            'overall_impact': overall_impact,
            'change_count': total_changes
        }
    
    @staticmethod
    def _classify_change(line: str, change_type: str) -> Optional[Dict]:
        """Classify a single change and determine its impact."""
        line_lower = line.lower().strip()
        
        if not line_lower or line_lower.startswith('#'):
            return None
        
        # AI bot changes
        ai_bots = ['gptbot', 'claudebot', 'perplexitybot', 'ccbot', 'google-extended']
        if any(bot in line_lower for bot in ai_bots):
            return {
                'line': line,
                'type': change_type,
                'category': 'ai_bot',
                'impacts': ['geo'],
                'description': f'AI bot rule {change_type}'
            }
        
        # Sitemap changes
        if 'sitemap:' in line_lower:
            return {
                'line': line,
                'type': change_type,
                'category': 'sitemap',
                'impacts': ['seo'],
                'description': f'Sitemap declaration {change_type}'
            }
        
        # Disallow/Allow changes
        if 'disallow:' in line_lower or 'allow:' in line_lower:
            # Check if it's a critical path
            critical_paths = ['/', '/checkout', '/cart', '/account', '/admin']
            if any(path in line_lower for path in critical_paths):
                return {
                    'line': line,
                    'type': change_type,
                    'category': 'critical_path',
                    'impacts': ['both'],
                    'description': f'Critical path rule {change_type}'
                }
            else:
                return {
                    'line': line,
                    'type': change_type,
                    'category': 'path_rule',
                    'impacts': ['seo'],
                    'description': f'Path rule {change_type}'
                }
        
        return {
            'line': line,
            'type': change_type,
            'category': 'other',
            'impacts': ['seo'],
            'description': f'Other directive {change_type}'
        }


class RiskImpactClassification:
    """
    Classifies alerts and issues by risk impact (SEO/GEO/Both).
    """
    
    SEO_ALERTS = [
        'robots_inaccessible',
        'robots_not_found',
        'disallow_all',
        'critical_pattern_blocked',
        'no_sitemap_declared',
        'sitemap_removed',
        'sitemap_url_drop',
        'sitemap_empty'
    ]
    
    GEO_ALERTS = [
        'ai_bot_blocked',
        'ai_specific_rules',
        'business_url_blocked'
    ]
    
    BOTH_ALERTS = [
        'homepage_blocked',
        'high_priority_url_blocked',
        'sitemap_url_blocked',
        'robots_status_changed'
    ]
    
    @staticmethod
    def classify_alert(alert_type: str) -> str:
        """
        Classify an alert by its risk impact.
        
        Args:
            alert_type: Type of alert
        
        Returns:
            Impact classification: 'seo', 'geo', or 'both'
        """
        if alert_type in RiskImpactClassification.SEO_ALERTS:
            return 'seo'
        elif alert_type in RiskImpactClassification.GEO_ALERTS:
            return 'geo'
        elif alert_type in RiskImpactClassification.BOTH_ALERTS:
            return 'both'
        else:
            return 'seo'  # Default to SEO for unknown types
    
    @staticmethod
    def classify_alerts(alerts: List[Dict]) -> Dict:
        """
        Classify multiple alerts and generate impact summary.
        
        Args:
            alerts: List of alert dictionaries
        
        Returns:
            Dictionary with impact classification summary
        """
        classification = {'seo': [], 'geo': [], 'both': []}
        
        for alert in alerts:
            alert_type = alert.get('alert_type', 'unknown')
            impact = RiskImpactClassification.classify_alert(alert_type)
            classification[impact].append(alert)
        
        return {
            'classification': classification,
            'counts': {
                'seo': len(classification['seo']),
                'geo': len(classification['geo']),
                'both': len(classification['both'])
            },
            'primary_impact': RiskImpactClassification._get_primary_impact(classification)
        }
    
    @staticmethod
    def _get_primary_impact(classification: Dict) -> str:
        """Determine the primary impact based on alert counts."""
        counts = {
            'seo': len(classification['seo']),
            'geo': len(classification['geo']),
            'both': len(classification['both'])
        }
        
        if counts['both'] > 0:
            return 'both'
        elif counts['seo'] >= counts['geo']:
            return 'seo'
        else:
            return 'geo'
