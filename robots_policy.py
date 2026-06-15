from io import StringIO
from urllib import robotparser

import pandas as pd


ROBOTS_USER_AGENTS = [
    "Googlebot",
    "Googlebot-Image",
    "Bingbot",
    "GPTBot",
    "ClaudeBot",
    "PerplexityBot",
    "CCBot",
]
AI_USER_AGENTS = {"GPTBot", "ClaudeBot", "PerplexityBot", "CCBot"}


def can_fetch_url(robots_content, user_agent, url):
    parser = robotparser.RobotFileParser()
    parser.parse(robots_content.splitlines())
    return parser.can_fetch(user_agent, url)


def extract_rules(robots_content):
    if not robots_content.strip():
        return pd.DataFrame()

    try:
        import advertools as adv
        return adv.robotstxt_to_df(StringIO(robots_content))
    except Exception as error:
        return pd.DataFrame([{"error": "robots_rules_parse_error", "message": str(error)}])


def analyze_user_agents(robots_content, urls, user_agents=None):
    user_agents = user_agents or ROBOTS_USER_AGENTS
    rows = []

    for url in urls:
        row = {"url": url}
        for user_agent in user_agents:
            row[user_agent] = can_fetch_url(robots_content, user_agent, url)
        rows.append(row)

    return pd.DataFrame(rows)


def detect_policy_risks(policy_df):
    risks = []
    if policy_df.empty:
        return risks

    for _, row in policy_df.iterrows():
        url = row.get("url")
        googlebot_allowed = row.get("Googlebot") is True
        blocked_agents = [
            agent
            for agent in ROBOTS_USER_AGENTS
            if row.get(agent) is False
        ]
        blocked_ai_agents = [agent for agent in blocked_agents if agent in AI_USER_AGENTS]

        if googlebot_allowed and blocked_ai_agents:
            risks.append(
                {
                    "url": url,
                    "risk": "medium",
                    "reason": f"Googlebot allowed but AI bots blocked: {', '.join(blocked_ai_agents)}",
                }
            )
        elif blocked_agents:
            risks.append(
                {
                    "url": url,
                    "risk": "high",
                    "reason": f"Blocked for: {', '.join(blocked_agents)}",
                }
            )

    return risks
