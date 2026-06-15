'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Globe, AlertTriangle, FileText, Activity, Clock, TrendingUp, Shield, Bot } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";

export default function SiteDetail({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [site, setSite] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sitemaps, setSitemaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const { data: siteData } = await supabase
        .from('sites')
        .select('*')
        .eq('id', params.id)
        .single();

      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .eq('site_id', params.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: sitemapsData } = await supabase
        .from('sitemap_details')
        .select('*')
        .eq('site_id', params.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setSite(siteData);
      setAlerts(alertsData || []);
      setSitemaps(sitemapsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!site) {
    return <div className="p-8">Site not found</div>;
  }

  const siteAlerts = alerts.length;
  const siteStatus = siteAlerts > 0 ? (siteAlerts > 3 ? 'Critical' : 'Warning') : 'OK';
  const crawlPolicyStatus = siteAlerts > 0 ? 'Warning' : 'OK';
  const crawlPolicySummary = siteAlerts > 0 ? `${siteAlerts} alerts detected` : 'No issues detected';

  return (
    <div className="p-8 space-y-8">
      {/* Visual Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-8 h-8" style={{ color: 'var(--copper)' }} />
              <h1 className="text-4xl font-bold" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.06em' }}>
                {site.name}
              </h1>
            </div>
            <p className="text-lg" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{site.base_url}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg font-semibold" style={{
              background: siteStatus === 'OK' ? 'var(--petrol)' :
                         siteStatus === 'Warning' ? 'var(--copper)' :
                         '#c44',
              color: 'var(--cream)'
            }}>
              {siteStatus}
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <Card style={{
          background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.12), transparent 28%), rgba(255, 248, 234, 0.68)',
          border: '1px solid var(--line)',
          boxShadow: '0 18px 46px var(--shadow)'
        }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Shield className="w-6 h-6" style={{ color: 'var(--copper)' }} />
              <div>
                <div className="font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                  Crawl Policy Status: {crawlPolicyStatus}
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                  {crawlPolicySummary}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2" style={{ color: 'var(--tweed)' }}>
                <Clock className="w-4 h-4" />
                <span className="text-sm">{site.updated_at ? new Date(site.updated_at).toLocaleString() : 'Unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList activeTab={activeTab} setActiveTab={setActiveTab}>
          <TabsTrigger value="overview" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="alerts" isActive={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')}>
            Alerts
          </TabsTrigger>
          <TabsTrigger value="sitemaps" isActive={activeTab === 'sitemaps'} onClick={() => setActiveTab('sitemaps')}>
            Sitemaps
          </TabsTrigger>
          <TabsTrigger value="important-urls" isActive={activeTab === 'important-urls'} onClick={() => setActiveTab('important-urls')}>
            Important URLs
          </TabsTrigger>
          <TabsTrigger value="robots-txt" isActive={activeTab === 'robots-txt'} onClick={() => setActiveTab('robots-txt')}>
            Robots.txt
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" isActive={activeTab === 'overview'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sitemap Evolution Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card style={{
                background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
                border: '1px solid var(--line)',
                boxShadow: '0 18px 46px var(--shadow)'
              }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--petrol)', fontFamily: 'Georgia, serif' }}>
                    <TrendingUp className="w-5 h-5" style={{ color: 'var(--copper)' }} />
                    Sitemap URL Evolution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end gap-2">
                    {[1200, 1250, 1300, 1280, 1320, 1350, 1400, 1380, 1420, 1450].map((count, index) => (
                      <motion.div
                        key={index}
                        initial={{ height: 0 }}
                        animate={{ height: `${(count / 1500) * 100}%` }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div className="w-full rounded-t" style={{ background: 'linear-gradient(180deg, var(--petrol), var(--petrol-deep))' }} />
                        <div className="text-xs mt-2" style={{ color: 'var(--tweed)' }}>{index + 1}</div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-center text-sm mt-4" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>Last 10 checks</div>
                </CardContent>
              </Card>
            </motion.div>

            {/* User-Agent Access Heatmap */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card style={{
                background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
                border: '1px solid var(--line)',
                boxShadow: '0 18px 46px var(--shadow)'
              }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--petrol)', fontFamily: 'Georgia, serif' }}>
                    <Bot className="w-5 h-5" style={{ color: 'var(--copper)' }} />
                    User-Agent Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { agent: 'Googlebot', access: 95, color: 'var(--petrol)' },
                      { agent: 'Bingbot', access: 88, color: 'var(--petrol)' },
                      { agent: 'Slurp', access: 72, color: 'var(--copper)' },
                      { agent: 'DuckDuckBot', access: 65, color: 'var(--copper)' },
                      { agent: 'Baiduspider', access: 45, color: 'var(--tweed)' },
                    ].map((item, index) => (
                      <motion.div
                        key={item.agent}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm w-24" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{item.agent}</span>
                          <div className="flex-1 rounded-full h-2" style={{ background: 'var(--line)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.access}%` }}
                              transition={{ delay: 0.5 + index * 0.1 }}
                              className="h-2 rounded-full"
                              style={{ background: item.color }}
                            />
                          </div>
                          <span className="text-sm w-12 text-right" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{item.access}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" isActive={activeTab === 'alerts'}>
          <div className="space-y-4">
            {alerts.map((alert: any, index: number) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card style={{
                  background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
                  border: `1px solid ${alert.severity === 'critical' ? 'var(--copper)' : alert.severity === 'high' ? 'var(--tweed)' : 'var(--line)'}`,
                  boxShadow: '0 18px 46px var(--shadow)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg" style={{
                        background: alert.severity === 'critical' ? 'var(--copper)' :
                                   alert.severity === 'high' ? 'var(--tweed)' :
                                   'var(--petrol)'
                      }}>
                        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--cream)' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 rounded text-xs font-semibold uppercase" style={{
                            background: alert.severity === 'critical' ? 'var(--copper)' :
                                         alert.severity === 'high' ? 'var(--tweed)' :
                                         'var(--petrol)',
                            color: 'var(--cream)',
                            letterSpacing: '0.1em'
                          }}>
                            {alert.severity}
                          </span>
                          <span className="font-medium" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{alert.alert_type}</span>
                          <span className="text-sm ml-auto" style={{ color: 'var(--tweed)' }}>{alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Unknown'}</span>
                        </div>
                        <p className="mb-3" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{alert.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Sitemaps Tab */}
        <TabsContent value="sitemaps" isActive={activeTab === 'sitemaps'}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sitemaps.map((sitemap: any, index: number) => (
              <motion.div
                key={sitemap.url}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
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
                        <CardTitle className="text-lg" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{sitemap.type || 'Sitemap'}</CardTitle>
                        <div className="text-sm mt-1 truncate" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{sitemap.url}</div>
                      </div>
                      <div className="w-3 h-3 rounded-full" style={{
                        background: sitemap.status_code === 200 ? 'var(--petrol)' :
                                   sitemap.status_code >= 400 ? 'var(--copper)' :
                                   '#c44'
                      }} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>URL Count</span>
                        <span className="font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{sitemap.url_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>Last Crawled</span>
                        <span className="text-sm" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{sitemap.created_at ? new Date(sitemap.created_at).toLocaleString() : 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>Status</span>
                        <span className="font-semibold" style={{
                          color: sitemap.status_code === 200 ? 'var(--petrol)' :
                                 sitemap.status_code >= 400 ? 'var(--copper)' :
                                 '#c44',
                          fontFamily: 'Georgia, serif'
                        }}>
                          {sitemap.status_code || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Important URLs Tab */}
        <TabsContent value="important-urls" isActive={activeTab === 'important-urls'}>
          <Card style={{
            background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
            border: '1px solid var(--line)',
            boxShadow: '0 18px 46px var(--shadow)'
          }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>Important URLs Access Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((item: any, index: number) => (
                  <motion.div
                    key={item.url}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-opacity-80 transition-colors"
                    style={{ background: 'rgba(255, 248, 234, 0.3)' }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{
                      background: item.status === 'Allowed' ? 'var(--petrol)' : 'var(--copper)'
                    }} />
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{item.url || 'No URL'}</div>
                      <div className="text-sm mt-1" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                        {item.alert_type || 'Alert'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 rounded text-sm font-semibold" style={{
                        background: item.severity === 'critical' ? 'var(--copper)' : 'var(--petrol)',
                        color: 'var(--cream)',
                        fontFamily: 'Georgia, serif'
                      }}>
                        {item.severity || 'Unknown'}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Robots.txt Tab */}
        <TabsContent value="robots-txt" isActive={activeTab === 'robots-txt'}>
          <Card style={{
            background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
            border: '1px solid var(--line)',
            boxShadow: '0 18px 46px var(--shadow)'
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--petrol)', fontFamily: 'Georgia, serif' }}>
                <FileText className="w-5 h-5" style={{ color: 'var(--copper)' }} />
                robots.txt Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg p-6 font-mono text-sm" style={{ background: 'var(--paper-deep)' }}>
                <pre style={{ color: 'var(--ink)' }}>
{`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /private

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Crawl-delay: 10
Sitemap: https://example.com/sitemap.xml`}
                </pre>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm" style={{ color: 'var(--tweed)' }}>
                <Activity className="w-4 h-4" />
                <span style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>Last updated: 2 days ago</span>
                <span className="ml-auto" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>2 rules detected</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
