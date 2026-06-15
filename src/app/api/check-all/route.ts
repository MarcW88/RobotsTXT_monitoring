import { NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";

export async function POST() {
  try {
    // Get all sites
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('*');

    if (sitesError) throw sitesError;

    if (!sites || sites.length === 0) {
      return NextResponse.json({ message: 'No sites to check' }, { status: 200 });
    }

    // In a real implementation, this would trigger the Python monitor script
    // For now, we'll just update the last_check timestamp
    const { error: updateError } = await supabase
      .from('sites')
      .update({ updated_at: new Date().toISOString() })
      .in('id', sites.map(s => s.id));

    if (updateError) throw updateError;

    return NextResponse.json({ 
      message: 'Check initiated for all sites',
      sites_count: sites.length 
    });
  } catch (error) {
    console.error('Error checking all sites:', error);
    return NextResponse.json(
      { error: 'Failed to check sites' },
      { status: 500 }
    );
  }
}
