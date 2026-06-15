import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER || 'MarcW88';
    const repoName = process.env.GITHUB_REPO_NAME || 'RobotsTXT_monitoring';

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN not configured' },
        { status: 500 }
      );
    }

    // Trigger GitHub Actions workflow
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/run-monitor.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            reason: 'Manual trigger from dashboard'
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to trigger GitHub Actions workflow' },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      message: 'Check launched successfully',
      status: 'triggered'
    });
  } catch (error) {
    console.error('Error triggering check:', error);
    return NextResponse.json(
      { error: 'Failed to trigger check' },
      { status: 500 }
    );
  }
}
