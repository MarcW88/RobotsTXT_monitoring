'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Globe, TrendingDown, TrendingUp, Clock, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: sitesData } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: checksData } = await supabase
        .from('checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(10);

      setSites(sitesData || []);
      setAlerts(alertsData || []);
      setChecks(checksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysisData = async () => {
    if (!confirm('Are you sure you want to delete all analysis data? This cannot be undone.')) {
      return;
    }

    try {
      // Delete all alerts
      const { error: alertsError } = await supabase
        .from('alerts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (alertsError) {
        console.error('Error deleting alerts:', alertsError);
        alert('Failed to delete alerts');
        return;
      }

      // Delete all checks
      const { error: checksError } = await supabase
        .from('checks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (checksError) {
        console.error('Error deleting checks:', checksError);
        alert('Failed to delete checks');
        return;
      }

      // Delete sitemap details
      const { error: sitemapError } = await supabase
        .from('sitemap_details')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (sitemapError) {
        console.error('Error deleting sitemap details:', sitemapError);
        alert('Failed to delete sitemap details');
        return;
      }

      alert('All analysis data deleted successfully');
      
      // Force refresh and reset KPIs
      setAlerts([]);
      setSites([]);
      setChecks([]);
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Error deleting analysis data:', error);
      alert('Failed to delete analysis data');
    }
  };

  if (!mounted) return null;

  const alertCounts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  };

  const sitesWithAlerts = sites.map(site => ({
    ...site,
    alerts: alerts.filter(a => a.site_id === site.id).length,
    lastCheck: site.updated_at ? new Date(site.updated_at).toLocaleString() : 'Unknown'
  }));

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-5xl font-bold mb-2" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.06em' }}>
            Dashboard
          </h1>
          <p className="text-lg" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
            Monitor your robots.txt and sitemap health
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={deleteAnalysisData}
          className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          style={{
            background: '#c44',
            color: 'var(--cream)',
            fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
          }}
        >
          <Trash2 className="w-5 h-5" />
          Delete Analysis
        </motion.button>
      </motion.div>

      {/* Robots Diff Intelligence */}
      {(() => {
        const checkWithDiff = checks.find(c => c.robots_diff && c.robots_diff.change_count > 0);
        if (!checkWithDiff) return null;
        const diffData = checkWithDiff.robots_diff;
        
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card style={{
              background: 'rgba(255, 248, 234, 0.56)',
              border: '1px solid var(--line)'
            }}>
              <CardHeader>
                <CardTitle style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--petrol)' }}>
                  Robots.txt Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Overall Impact: <strong style={{ 
                      color: diffData.overall_impact === 'High' ? '#c44' : 
                             diffData.overall_impact === 'Medium' ? 'var(--copper)' : 'var(--petrol)'
                    }}>{diffData.overall_impact}</strong>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    {diffData.change_count} changes detected
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-2 rounded" style={{ background: 'rgba(52, 131, 78, 0.1)' }}>
                    <div className="text-xl font-bold" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                      {diffData.impact_summary?.seo || 0}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                      SEO Impact
                    </div>
                  </div>
                  <div className="text-center p-2 rounded" style={{ background: 'rgba(194, 145, 93, 0.1)' }}>
                    <div className="text-xl font-bold" style={{ color: 'var(--copper)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                      {diffData.impact_summary?.geo || 0}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                      GEO Impact
                    </div>
                  </div>
                  <div className="text-center p-2 rounded" style={{ background: 'rgba(196, 68, 68, 0.1)' }}>
                    <div className="text-xl font-bold" style={{ color: '#c44', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                      {diffData.impact_summary?.both || 0}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                      Both Impact
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {diffData.changes && diffData.changes.slice(0, 10).map((change: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded text-sm" style={{
                      background: change.type === 'added' ? 'rgba(52, 131, 78, 0.1)' : 'rgba(196, 68, 68, 0.1)',
                      border: '1px solid var(--line)'
                    }}>
                      <div className="flex-1 truncate" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif', color: 'var(--ink)' }}>
                        {change.line}
                      </div>
                      <div className="ml-2 flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs" style={{
                          background: change.type === 'added' ? 'var(--petrol)' : '#c44',
                          color: 'var(--cream)',
                          fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                        }}>
                          {change.type}
                        </span>
                        <span className="px-2 py-1 rounded text-xs" style={{
                          background: change.impacts && change.impacts.includes('both') ? '#c44' : 
                                 change.impacts && change.impacts.includes('geo') ? 'var(--copper)' : 'var(--petrol)',
                          color: 'var(--cream)',
                          fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                        }}>
                          {change.impacts && change.impacts[0] ? change.impacts[0].toUpperCase() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* Checks & Alerts History Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card style={{
          background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
          border: '1px solid var(--line)',
          boxShadow: '0 18px 46px var(--shadow)'
        }}>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
              <Activity className="w-8 h-8" style={{ color: 'var(--copper)' }} />
              Checks & Alerts History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simple SVG Line Chart */}
              <div className="relative h-48 w-full">
                <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={i}
                      x1="0"
                      y1={i * 30}
                      x2="400"
                      y2={i * 30}
                      stroke="var(--line)"
                      strokeWidth="1"
                      strokeDasharray="4"
                    />
                  ))}
                  
                  {/* Checks line */}
                  <polyline
                    points="0,120 80,100 160,80 240,60 320,40 400,30"
                    fill="none"
                    stroke="var(--petrol)"
                    strokeWidth="3"
                  />
                  
                  {/* Alerts line */}
                  <polyline
                    points="0,140 80,130 160,110 240,90 320,70 400,50"
                    fill="none"
                    stroke="#c44"
                    strokeWidth="3"
                  />
                  
                  {/* Dots for checks */}
                  {[0, 80, 160, 240, 320, 400].map((x, i) => (
                    <circle
                      key={`check-${i}`}
                      cx={x}
                      cy={[120, 100, 80, 60, 40, 30][i]}
                      r="4"
                      fill="var(--petrol)"
                    />
                  ))}
                  
                  {/* Dots for alerts */}
                  {[0, 80, 160, 240, 320, 400].map((x, i) => (
                    <circle
                      key={`alert-${i}`}
                      cx={x}
                      cy={[140, 130, 110, 90, 70, 50][i]}
                      r="4"
                      fill="#c44"
                    />
                  ))}
                </svg>
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: 'var(--petrol)' }} />
                  <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Checks per day
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#c44' }} />
                  <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Alerts per day
                  </span>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                    {checks.length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Total Checks
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: '#c44', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                    {alerts.length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Total Alerts
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: 'var(--copper)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                    {alerts.length > 0 ? Math.round((alerts.length / checks.length) * 10) / 10 : 0}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Avg Alerts/Check
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Monitored Sites', value: sites.length, icon: Globe, color: 'var(--petrol)', trend: '+2' },
          { title: 'Critical Alerts', value: alertCounts.critical, icon: AlertTriangle, color: 'var(--copper)', trend: '+1' },
          { title: 'AI Bot Blocks', value: 3, icon: TrendingDown, color: 'var(--tweed)', trend: '-1' },
          { title: 'Sitemap Drops', value: 7, icon: TrendingUp, color: 'var(--petrol-deep)', trend: '+3' },
        ].map((kpi, index) => {
          const Icon = kpi.icon;

          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card style={{
                background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
                border: '1px solid var(--line)',
                boxShadow: '0 18px 46px var(--shadow)'
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="w-8 h-8" style={{ color: kpi.color }} />
                    <span className="text-sm font-medium px-2 py-1 rounded" style={{ 
                      background: kpi.trend.startsWith('+') ? 'rgba(52, 131, 78, 0.1)' : 'rgba(196, 68, 68, 0.1)',
                      color: kpi.trend.startsWith('+') ? 'var(--petrol)' : '#c44',
                      fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                    }}>
                      {kpi.trend}
                    </span>
                  </div>
                  <div className="text-3xl font-bold mb-1" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{kpi.value}</div>
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{kpi.title}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Site Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sitesWithAlerts.map((site, index) => (
          <motion.div
            key={site.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
          >
            <Card style={{
              background: site.alertCount > 0 
                ? 'radial-gradient(circle at 18% 12%, rgba(196, 68, 68, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)'
                : 'radial-gradient(circle at 18% 12%, rgba(52, 131, 78, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
              border: '1px solid var(--line)',
              boxShadow: '0 18px 46px var(--shadow)'
            }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Globe className="w-6 h-6" style={{ color: site.alertCount > 0 ? '#c44' : 'var(--petrol)' }} />
                  {site.alertCount > 0 && (
                    <span className="text-xs font-medium px-2 py-1 rounded" style={{ 
                      background: 'rgba(196, 68, 68, 0.1)',
                      color: '#c44',
                      fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                    }}>
                      {site.alertCount} alert(s)
                    </span>
                  )}
                </div>
                <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--ink)' }}>
                  {site.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                  {site.base_url}
                </p>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                  <span>Last check: 2h ago</span>
                  <span style={{ color: site.alertCount > 0 ? '#c44' : 'var(--petrol)' }}>
                    {site.alertCount === 0 ? 'Healthy' : 'Issues detected'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
}
