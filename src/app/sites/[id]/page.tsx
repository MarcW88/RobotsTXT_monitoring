import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

async function getSiteData(id: string) {
  const { data: site } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();

  const { data: checks } = await supabase
    .from('checks')
    .select('*')
    .eq('site_id', id)
    .order('checked_at', { ascending: false })
    .limit(10);

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('site_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: sitemapDetails } = await supabase
    .from('sitemap_details')
    .select('*')
    .eq('site_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return { site, checks, alerts, sitemapDetails };
}

export default async function SiteDetail({ params }: { params: { id: string } }) {
  const { site, checks, alerts, sitemapDetails } = await getSiteData(params.id);

  if (!site) {
    return <div className="p-8">Site not found</div>;
  }

  const latestCheck = checks?.[0];
  const sitemapUrlCounts = sitemapDetails?.map(d => ({
    date: new Date(d.created_at).toLocaleDateString(),
    count: d.url_count || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
          <p className="text-gray-600">{site.base_url}</p>
        </div>

        {/* Crawl Policy Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Crawl Policy Status</CardTitle>
            <CardDescription>Current robots.txt analysis status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg text-lg font-semibold ${
                latestCheck?.crawl_policy_status === 'Critical' ? 'bg-red-100 text-red-800' :
                latestCheck?.crawl_policy_status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {latestCheck?.crawl_policy_status || 'Unknown'}
              </div>
              <div className="text-sm text-gray-600">
                {latestCheck?.crawl_policy_summary || 'No summary available'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sitemap URL Evolution Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sitemap URL Evolution</CardTitle>
            <CardDescription>URL count changes over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {sitemapUrlCounts.slice(-10).map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${Math.min((item.count / 1000) * 100, 100)}%` }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-2">{item.date}</div>
                  <div className="text-xs font-semibold">{item.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Recent alerts for this site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts?.map((alert) => (
                <div key={alert.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="text-sm text-gray-600">{alert.alert_type}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{alert.message}</p>
                  {alert.url && (
                    <a href={alert.url} className="text-sm text-blue-600 hover:underline mt-1 block">
                      {alert.url}
                    </a>
                  )}
                </div>
              ))}
              {(!alerts || alerts.length === 0) && (
                <p className="text-gray-500 text-center py-4">No alerts</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sitemap Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sitemap Details</CardTitle>
            <CardDescription>Recent sitemap crawl results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">URL</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">URL Count</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {sitemapDetails?.map((detail) => (
                    <tr key={detail.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">{detail.url}</td>
                      <td className="p-3 text-sm">{detail.type}</td>
                      <td className="p-3 text-sm">{detail.url_count}</td>
                      <td className="p-3 text-sm">{detail.status_code}</td>
                      <td className="p-3 text-sm text-red-600">{detail.error}</td>
                    </tr>
                  ))}
                  {(!sitemapDetails || sitemapDetails.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        No sitemap details
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
