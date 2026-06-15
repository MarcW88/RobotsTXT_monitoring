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

    // Simulate checking each site individually
    const results = [];
    for (const site of sites) {
      try {
        // Simulate check by updating the site's updated_at
        const { error: updateError } = await supabase
          .from('sites')
          .update({ 
            updated_at: new Date().toISOString(),
            status: Math.random() > 0.3 ? 'OK' : 'Warning' // Simulate random status
          })
          .eq('id', site.id);

        if (updateError) throw updateError;

        results.push({
          site_id: site.id,
          site_name: site.name,
          status: 'checked',
          timestamp: new Date().toISOString()
        });

        // Small delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          site_id: site.id,
          site_name: site.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ 
      message: 'Check completed for all sites',
      sites_count: sites.length,
      results
    });
  } catch (error) {
    console.error('Error checking all sites:', error);
    return NextResponse.json(
      { error: 'Failed to check sites' },
      { status: 500 }
    );
  }
}
