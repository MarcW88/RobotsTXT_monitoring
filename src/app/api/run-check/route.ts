import { NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";

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

    // Insert check_run record with status 'queued'
    const { data: checkRun, error: insertError } = await supabase
      .from('check_runs')
      .insert({
        status: 'queued',
        started_at: null,
        completed_at: null,
        error_message: null
      })
      .select()
      .single();

    if (insertError || !checkRun) {
      console.error('Error inserting check_run:', insertError);
      return NextResponse.json(
        { error: 'Failed to create check run' },
        { status: 500 }
      );
    }

    // Trigger GitHub Actions workflow with check_run_id
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
            check_run_id: checkRun.id,
            reason: 'Manual trigger from dashboard'
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', errorText);
      
      // Update check_run status to failed
      await supabase
        .from('check_runs')
        .update({ 
          status: 'failed',
          error_message: 'Failed to trigger GitHub Actions workflow',
          completed_at: new Date().toISOString()
        })
        .eq('id', checkRun.id);
      
      return NextResponse.json(
        { error: 'Failed to trigger GitHub Actions workflow' },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      message: 'Check launched successfully',
      check_run_id: checkRun.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('Error triggering check:', error);
    return NextResponse.json(
      { error: 'Failed to trigger check' },
      { status: 500 }
    );
  }
}
