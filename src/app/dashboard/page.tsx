'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Globe, TrendingDown, TrendingUp, Clock, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";

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
    <div className="p-8 space-y-8">
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

      {/* Robots Intelligence Score */}
      {checks.length > 0 && checks[0].robots_intelligence_score && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card style={{
            background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
            border: '1px solid var(--line)'
          }}>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--petrol)' }}>
                Robots Intelligence Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2" style={{ 
                    color: checks[0].robots_intelligence_score.overall_score >= 80 ? 'var(--petrol)' : 
                           checks[0].robots_intelligence_score.overall_score >= 60 ? 'var(--copper)' : '#c44',
                    fontFamily: 'var(--font-fraunces), Georgia, serif'
                  }}>
                    {checks[0].robots_intelligence_score.overall_score}/100
                  </div>
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Grade: {checks[0].robots_intelligence_score.grade}
                  </div>
                </div>
                <div className="flex-1 ml-8 space-y-2">
                  {Object.entries(checks[0].robots_intelligence_score.component_scores).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 rounded-full" style={{ background: 'var(--paper-deep)' }}>
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${Number(value)}%`,
                              background: Number(value) >= 15 ? 'var(--petrol)' : Number(value) >= 10 ? 'var(--copper)' : '#c44'
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                          {Number(value)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Accessibility Matrix */}
      {checks.length > 0 && checks[0].ai_accessibility && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card style={{
            background: 'rgba(255, 248, 234, 0.56)',
            border: '1px solid var(--line)'
          }}>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--petrol)' }}>
                AI Accessibility Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-1" style={{ 
                    color: checks[0].ai_accessibility.ai_accessibility_score >= 80 ? 'var(--petrol)' : 
                           checks[0].ai_accessibility.ai_accessibility_score >= 50 ? 'var(--copper)' : '#c44',
                    fontFamily: 'var(--font-fraunces), Georgia, serif'
                  }}>
                    {checks[0].ai_accessibility.ai_accessibility_score}%
                  </div>
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Risk: {checks[0].ai_accessibility.risk_level}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                      {checks[0].ai_accessibility.accessible_bots.length}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                      Accessible
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: '#c44', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                      {checks[0].ai_accessibility.blocked_bots.length}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                      Blocked
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(checks[0].ai_accessibility.ai_accessibility_matrix).map(([bot, data]: [string, any]) => (
                  <div key={bot} className="p-2 rounded text-center" style={{
                    background: data.accessibility_percentage >= 80 ? 'rgba(52, 131, 78, 0.1)' : 
                           data.accessibility_percentage >= 50 ? 'rgba(194, 145, 93, 0.1)' : 'rgba(196, 68, 68, 0.1)',
                    border: '1px solid var(--line)'
                  }}>
                    <div className="text-xs font-medium mb-1" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                      {bot}
                    </div>
                    <div className="text-lg font-bold" style={{ 
                      color: data.accessibility_percentage >= 80 ? 'var(--petrol)' : 
                             data.accessibility_percentage >= 50 ? 'var(--copper)' : '#c44',
                      fontFamily: 'var(--font-fraunces), Georgia, serif'
                    }}>
                      {data.accessibility_percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Risk Impact Classification */}
      {checks.length > 0 && checks[0].risk_classification && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card style={{
            background: 'rgba(255, 248, 234, 0.56)',
            border: '1px solid var(--line)'
          }}>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--petrol)' }}>
                Risk Impact Classification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded" style={{ background: 'rgba(52, 131, 78, 0.1)' }}>
                  <div className="text-3xl font-bold mb-1" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                    {checks[0].risk_classification.counts.seo}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    SEO Alerts
                  </div>
                </div>
                <div className="text-center p-4 rounded" style={{ background: 'rgba(194, 145, 93, 0.1)' }}>
                  <div className="text-3xl font-bold mb-1" style={{ color: 'var(--copper)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                    {checks[0].risk_classification.counts.geo}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    GEO Alerts
                  </div>
                </div>
                <div className="text-center p-4 rounded" style={{ background: 'rgba(196, 68, 68, 0.1)' }}>
                  <div className="text-3xl font-bold mb-1" style={{ color: '#c44', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                    {checks[0].risk_classification.counts.both}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Both Impact
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                  Primary Impact: <strong>{checks[0].risk_classification.primary_impact.toUpperCase()}</strong>
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Hero Status Panel */}
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
              Crawl Policy Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
              Overall system status: <span className="font-bold" style={{ color: 'var(--petrol)' }}>Healthy</span>
            </div>
            <div className="text-sm mt-2" style={{ color: 'var(--tweed)' }}>
              Last full scan completed 2 hours ago
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
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-lg" style={{ background: kpi.color }}>
                      <Icon className="w-6 h-6" style={{ color: 'var(--cream)' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--copper)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{kpi.trend}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{kpi.value}</div>
                  <div className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{kpi.title}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Severity Donut */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card style={{
            background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
            border: '1px solid var(--line)',
            boxShadow: '0 18px 46px var(--shadow)'
          }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>Alert Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" strokeWidth="10" />
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="var(--copper)" 
                      strokeWidth="10"
                      strokeDasharray={`${(alertCounts.critical / (alertCounts.critical + alertCounts.high + alertCounts.medium + alertCounts.low || 1)) * 251.2} 251.2`}
                      className="transition-all duration-1000"
                    />
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="var(--tweed)" 
                      strokeWidth="10"
                      strokeDasharray={`${(alertCounts.high / (alertCounts.critical + alertCounts.high + alertCounts.medium + alertCounts.low || 1)) * 251.2} 251.2`}
                      strokeDashoffset={-((alertCounts.critical / (alertCounts.critical + alertCounts.high + alertCounts.medium + alertCounts.low || 1)) * 251.2)}
                      className="transition-all duration-1000"
                    />
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="var(--petrol)" 
                      strokeWidth="10"
                      strokeDasharray={`${(alertCounts.medium / (alertCounts.critical + alertCounts.high + alertCounts.medium + alertCounts.low || 1)) * 251.2} 251.2`}
                      strokeDashoffset={-((alertCounts.critical + alertCounts.high) / (alertCounts.critical + alertCounts.high + alertCounts.medium + alertCounts.low || 1) * 251.2)}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{alertCounts.critical + alertCounts.high + alertCounts.medium}</div>
                      <div className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>Total Alerts</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Critical', value: alertCounts.critical, color: 'var(--copper)' },
                    { label: 'High', value: alertCounts.high, color: 'var(--tweed)' },
                    { label: 'Medium', value: alertCounts.medium, color: 'var(--petrol)' },
                    { label: 'Low', value: alertCounts.low, color: 'var(--tweed-deep)' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                      <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{item.label}</span>
                      <span className="font-semibold ml-auto" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alert Timeline */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card style={{
            background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
            border: '1px solid var(--line)',
            boxShadow: '0 18px 46px var(--shadow)'
          }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>Alert Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: '2h ago', severity: 'critical', message: 'robots.txt blocks Googlebot' },
                  { time: '4h ago', severity: 'high', message: 'Sitemap unreachable' },
                  { time: '6h ago', severity: 'medium', message: 'Crawl delay increased' },
                  { time: '8h ago', severity: 'low', message: 'Sitemap size changed' },
                ].map((alert, index) => {
                  const severityColors = {
                    critical: 'var(--copper)',
                    high: 'var(--tweed)',
                    medium: 'var(--petrol)',
                    low: 'var(--tweed-deep)',
                  };

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-opacity-80 transition-colors"
                      style={{ background: 'rgba(255, 248, 234, 0.3)' }}
                    >
                      <div className="w-2 h-2 rounded-full mt-2" style={{ background: severityColors[alert.severity as keyof typeof severityColors] }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{alert.message}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{alert.time}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Site Health Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.06em' }}>Site Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sitesWithAlerts.map((site: any, index: number) => {
            const statusColors = {
              OK: 'var(--petrol)',
              Warning: 'var(--copper)',
              Critical: '#c44',
            };
            const siteStatus = site.alerts > 0 ? (site.alerts > 3 ? 'Critical' : 'Warning') : 'OK';

            return (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card style={{
                  background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
                  border: '1px solid var(--line)',
                  boxShadow: '0 18px 46px var(--shadow)'
                }} className="hover:shadow-lg transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{site.name}</CardTitle>
                        <div className="text-sm mt-1" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{site.base_url}</div>
                      </div>
                      <div className="w-3 h-3 rounded-full" style={{ background: statusColors[siteStatus as keyof typeof statusColors] }} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2" style={{ color: 'var(--tweed)' }}>
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{site.lastCheck}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" style={{ color: site.alerts > 0 ? 'var(--copper)' : 'var(--tweed-deep)' }} />
                        <span className="text-sm font-semibold" style={{ color: site.alerts > 0 ? 'var(--copper)' : 'var(--tweed-deep)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                          {site.alerts} alerts
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
