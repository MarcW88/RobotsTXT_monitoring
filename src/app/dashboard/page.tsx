import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

async function getDashboardData() {
  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('is_active', true);

  const { data: checks } = await supabase
    .from('checks')
    .select('*, alerts(severity)');

  const { data: alerts } = await supabase
    .from('alerts')
    .select('severity, site_id');

  return { sites, checks, alerts };
}

export default async function Dashboard() {
  const { sites, checks, alerts } = await getDashboardData();

  const totalSites = sites?.length || 0;
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
  const warningSites = checks?.filter(c => c.crawl_policy_status === 'Warning').length || 0;
  const lastChecks = checks?.slice(-5) || [];

  const alertsBySeverity = {
    critical: alerts?.filter(a => a.severity === 'critical').length || 0,
    high: alerts?.filter(a => a.severity === 'high').length || 0,
    medium: alerts?.filter(a => a.severity === 'medium').length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Sites</CardTitle>
              <CardDescription>Active sites in portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalSites}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>Requires immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{criticalAlerts}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Warning Sites</CardTitle>
              <CardDescription>Sites with warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{warningSites}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Last Checks</CardTitle>
              <CardDescription>Recent monitoring runs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{checks?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts by Severity Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Alerts by Severity</CardTitle>
            <CardDescription>Distribution of alert types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">Critical</div>
                <div className="h-8 bg-red-500 rounded" style={{ width: `${(alertsBySeverity.critical / (alerts?.length || 1)) * 100}%` }}></div>
                <div className="text-sm font-semibold mt-1">{alertsBySeverity.critical}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">High</div>
                <div className="h-8 bg-orange-500 rounded" style={{ width: `${(alertsBySeverity.high / (alerts?.length || 1)) * 100}%` }}></div>
                <div className="text-sm font-semibold mt-1">{alertsBySeverity.high}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">Medium</div>
                <div className="h-8 bg-yellow-500 rounded" style={{ width: `${(alertsBySeverity.medium / (alerts?.length || 1)) * 100}%` }}></div>
                <div className="text-sm font-semibold mt-1">{alertsBySeverity.medium}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest Sites Table */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Sites</CardTitle>
            <CardDescription>Recent monitoring results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Site Name</th>
                    <th className="text-left p-3">Base URL</th>
                    <th className="text-left p-3">Crawl Policy Status</th>
                    <th className="text-left p-3">Last Check</th>
                    <th className="text-left p-3">Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {sites?.map((site) => {
                    const siteChecks = checks?.filter(c => c.site_id === site.id);
                    const latestCheck = siteChecks?.[siteChecks.length - 1];
                    const alertCount = alerts?.filter(a => a.site_id === site.id).length || 0;
                    
                    return (
                      <tr key={site.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{site.name}</td>
                        <td className="p-3 text-sm text-gray-600">{site.base_url}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            latestCheck?.crawl_policy_status === 'Critical' ? 'bg-red-100 text-red-800' :
                            latestCheck?.crawl_policy_status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {latestCheck?.crawl_policy_status || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {latestCheck?.checked_at ? new Date(latestCheck.checked_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="p-3 font-semibold">{alertCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
