'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Bot, Link2, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";

const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'CCBot'];

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
        .limit(500);

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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = now.getDate();
  const daysElapsed = Array.from({ length: today }, (_, index) => index + 1);
  const monthlyChecks = checks.filter(check => {
    if (!check.checked_at) return false;
    const date = new Date(check.checked_at);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
  const monthlyAlerts = alerts.filter(alert => {
    if (!alert.created_at) return false;
    const date = new Date(alert.created_at);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
  const latestChecksBySite = sites.map(site => {
    const siteChecks = checks.filter(check => check.site_id === site.id);
    const latestCheck = siteChecks[0];
    const siteAlerts = alerts.filter(alert => alert.site_id === site.id);
    const criticalAlerts = siteAlerts.filter(alert => alert.severity === 'critical');
    const highAlerts = siteAlerts.filter(alert => alert.severity === 'high');
    const mediumAlerts = siteAlerts.filter(alert => alert.severity === 'medium');
    const rawScore = latestCheck?.robots_intelligence_score?.score ?? latestCheck?.robots_intelligence_score?.overall_score;
    const score = typeof rawScore === 'number'
      ? Math.round(rawScore > 1 && rawScore <= 100 ? rawScore : rawScore * 100)
      : Math.max(0, 100 - criticalAlerts.length * 25 - highAlerts.length * 15 - mediumAlerts.length * 7);
    const aiScoreRaw = latestCheck?.ai_accessibility?.score ?? latestCheck?.ai_accessibility?.accessibility_score;
    const aiScore = typeof aiScoreRaw === 'number'
      ? Math.round(aiScoreRaw > 1 && aiScoreRaw <= 100 ? aiScoreRaw : aiScoreRaw * 100)
      : null;
    const impactedUrls = latestCheck?.robots_diff?.changes?.filter((change: any) => change.impacts?.length || change.line?.toLowerCase().includes('disallow'))?.length || 0;

    return {
      ...site,
      latestCheck,
      score,
      aiScore,
      impactedUrls,
      alertCount: siteAlerts.length,
      criticalAlerts,
      lastIssue: siteAlerts[0]?.message || 'No major issue detected'
    };
  });
  const activeSites = latestChecksBySite.filter(site => site.latestCheck);
  const crawlHealthScore = activeSites.length ? Math.round(activeSites.reduce((sum, site) => sum + site.score, 0) / activeSites.length) : 0;
  const criticalRisks = alerts.filter(alert => alert.severity === 'critical').length;
  const aiScores = activeSites.map(site => site.aiScore).filter((score): score is number => typeof score === 'number');
  const aiAccessibilityScore = aiScores.length ? Math.round(aiScores.reduce((sum, score) => sum + score, 0) / aiScores.length) : 0;
  const urlsImpacted = activeSites.reduce((sum, site) => sum + site.impactedUrls, 0);
  const scoreForCheck = (check: any) => {
    const rawScore = check?.robots_intelligence_score?.score ?? check?.robots_intelligence_score?.overall_score;
    if (typeof rawScore === 'number') return Math.round(rawScore > 1 && rawScore <= 100 ? rawScore : rawScore * 100);
    const checkAlerts = Array.isArray(check?.alerts) ? check.alerts : [];
    return Math.max(0, 100 - checkAlerts.filter((alert: any) => alert.severity === 'critical').length * 25 - checkAlerts.filter((alert: any) => alert.severity === 'high').length * 15 - checkAlerts.filter((alert: any) => alert.severity === 'medium').length * 7);
  };
  const scoreByDay = daysElapsed.map(day => {
    const dayChecks = monthlyChecks.filter(check => new Date(check.checked_at).getDate() === day);
    if (!dayChecks.length) return null;
    return Math.round(dayChecks.reduce((sum, check) => sum + scoreForCheck(check), 0) / dayChecks.length);
  });
  const availableScores = scoreByDay.filter((score): score is number => typeof score === 'number');
  const chartWidth = 720;
  const chartHeight = 240;
  const chartPadding = 32;
  const minScore = Math.max(0, Math.min(70, ...availableScores));
  const maxScore = Math.min(100, Math.max(100, ...availableScores));
  const xForDay = (index: number) => daysElapsed.length === 1
    ? chartPadding
    : chartPadding + (index / (daysElapsed.length - 1)) * (chartWidth - chartPadding * 2);
  const yForScore = (score: number) => chartHeight - chartPadding - ((score - minScore) / Math.max(1, maxScore - minScore)) * (chartHeight - chartPadding * 2);
  const scorePoints = scoreByDay.map((score, index) => typeof score === 'number' ? `${xForDay(index)},${yForScore(score)}` : null).filter(Boolean).join(' ');
  const prioritySites = [...latestChecksBySite]
    .filter(site => site.alertCount > 0 || site.score < 90)
    .sort((a, b) => a.score - b.score || b.criticalAlerts.length - a.criticalAlerts.length);
  const scoreColor = (score: number) => score >= 90 ? 'var(--petrol)' : score >= 70 ? 'var(--copper)' : '#c44';

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
            Risk, AI accessibility and crawl policy evolution across your portfolio
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Crawl Health Score', value: `${crawlHealthScore}/100`, description: 'Portfolio crawl policy quality', icon: ShieldCheck, color: scoreColor(crawlHealthScore) },
          { title: 'Critical Risks', value: criticalRisks, description: 'Open critical crawl issues', icon: AlertTriangle, color: criticalRisks > 0 ? '#c44' : 'var(--petrol)' },
          { title: 'AI Accessibility Score', value: `${aiAccessibilityScore}%`, description: AI_BOTS.join(', '), icon: Bot, color: scoreColor(aiAccessibilityScore) },
          { title: 'URLs Impacted', value: urlsImpacted, description: 'URLs changed by latest robots diffs', icon: Link2, color: urlsImpacted > 0 ? 'var(--copper)' : 'var(--petrol)' },
        ].map((kpi, index) => {
          const Icon = kpi.icon;

          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -4 }}
            >
              <Card style={{
                background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
                border: '1px solid var(--line)',
                boxShadow: '0 18px 46px var(--shadow)'
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <Icon className="w-8 h-8" style={{ color: kpi.color }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: kpi.color }} />
                  </div>
                  <div className="text-4xl font-bold mb-1" style={{ color: kpi.color, fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{kpi.value}</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{kpi.title}</div>
                  <div className="text-xs mt-2" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{kpi.description}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card style={{
          background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
          border: '1px solid var(--line)',
          boxShadow: '0 18px 46px var(--shadow)'
        }}>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
              <Activity className="w-8 h-8" style={{ color: 'var(--copper)' }} />
              Crawl Health Evolution
            </CardTitle>
            <p className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
              Overall crawl policy score over the current month. Empty days mean no analysis was performed.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative h-80 w-full">
                <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                  {[0, 25, 50, 75, 100].map(value => (
                    <line
                      key={value}
                      x1="0"
                      y1={yForScore(value)}
                      x2={chartWidth}
                      y2={yForScore(value)}
                      stroke="var(--line)"
                      strokeWidth="1"
                      strokeDasharray="5"
                    />
                  ))}
                  {scorePoints && (
                    <motion.polyline
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.1, ease: 'easeOut' }}
                      points={scorePoints}
                      fill="none"
                      stroke="var(--petrol)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {scoreByDay.map((score, index) => typeof score === 'number' ? (
                    <motion.circle
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.25 + index * 0.03 }}
                      cx={xForDay(index)}
                      cy={yForScore(score)}
                      r="5"
                      fill={scoreColor(score)}
                    />
                  ) : null)}
                </svg>
                <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                  {daysElapsed.map(day => (
                    <span key={day} className={day % 2 === 0 ? 'hidden sm:inline' : ''}>{day}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: 'var(--petrol)' }} />
                  <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    90-100 healthy
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: 'var(--copper)' }} />
                  <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    70-89 watch
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: '#c44' }} />
                  <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Below 70 risky
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {prioritySites.map((site, index) => (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.06 }}
              whileHover={{ y: -4 }}
            >
              <Card style={{
                background: 'rgba(255, 248, 234, 0.56)',
                border: `1px solid ${scoreColor(site.score)}`,
                boxShadow: '0 18px 46px var(--shadow)'
              }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: scoreColor(site.score) }} />
                      <h3 className="font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                        {site.name}
                      </h3>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: scoreColor(site.score), fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                      {site.score}/100
                    </div>
                  </div>
                  <p className="text-sm mb-3 truncate" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    {site.base_url}
                  </p>
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--copper)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    Last issue
                  </div>
                  <p className="text-sm" style={{ color: 'var(--ink)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                    {site.lastIssue}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
        ))}
      </div>

    </div>
  );
}
