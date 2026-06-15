'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, AlertTriangle, Clock, Play, Home, Settings, FileText, LayoutDashboard, Plus, X, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import Link from 'next/link';
import { Sidebar } from "@/components/sidebar";

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [currentSiteIndex, setCurrentSiteIndex] = useState(0);
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');

  useEffect(() => {
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
        .order('created_at', { ascending: false });

      setSites(sitesData || []);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAllSites = async () => {
    console.log('Starting check...');
    setChecking(true);
    setCheckStatus('running');
    setCurrentSiteIndex(0);

    try {
      console.log('Calling /api/run-check...');
      const response = await fetch('/api/run-check', {
        method: 'POST',
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Check launched:', data);
        
        // Simulate site checking progress
        const totalSites = sites.length;
        const timePerSite = 60000 / totalSites; // Distribute 1 minute across sites
        
        for (let i = 0; i < totalSites; i++) {
          setCurrentSiteIndex(i);
          await new Promise(resolve => setTimeout(resolve, timePerSite));
        }
        
        await fetchData();
        setCheckStatus('completed');
        setTimeout(() => {
          setChecking(false);
          setCheckStatus('idle');
          setCurrentSiteIndex(0);
        }, 3000);
      } else {
        console.error('Failed to launch check');
        setCheckStatus('failed');
        setChecking(false);
      }
    } catch (error) {
      console.error('Error launching check:', error);
      setCheckStatus('failed');
      setChecking(false);
    }
  };

  const addSite = async () => {
    if (!newSiteName || !newSiteUrl) return;

    try {
      const { error } = await supabase
        .from('sites')
        .insert({
          name: newSiteName,
          base_url: newSiteUrl,
          critical_patterns: ['/'],
          known_sitemaps: []
        });

      if (error) {
        console.error('Error adding site:', error);
        alert('Failed to add site');
        return;
      }

      setNewSiteName('');
      setNewSiteUrl('');
      setShowAddSite(false);
      fetchData();
    } catch (error) {
      console.error('Error adding site:', error);
      alert('Failed to add site');
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
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (alertsError) {
        console.error('Error deleting alerts:', alertsError);
        alert('Failed to delete alerts');
        return;
      }

      // Delete all checks
      const { error: checksError } = await supabase
        .from('checks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (checksError) {
        console.error('Error deleting checks:', checksError);
        alert('Failed to delete checks');
        return;
      }

      // Delete sitemap details
      const { error: sitemapError } = await supabase
        .from('sitemap_details')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (sitemapError) {
        console.error('Error deleting sitemap details:', sitemapError);
        alert('Failed to delete sitemap details');
        return;
      }

      alert('All analysis data deleted successfully');
      
      // Force refresh and reset KPIs
      setAlerts([]);
      setSites([]);
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Error deleting analysis data:', error);
      alert('Failed to delete analysis data');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const sitesWithAlerts = sites.map(site => ({
    ...site,
    alerts: alerts.filter(a => a.site_id === site.id).length,
    lastCheck: site.updated_at ? new Date(site.updated_at).toLocaleString() : 'Unknown'
  }));

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-5xl font-bold mb-2" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.06em' }}>
            Sites
          </h1>
          <p className="text-lg" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
            Manage and monitor your websites
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={checkAllSites}
          disabled={checking}
          className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          style={{
            background: checking ? 'var(--tweed)' : 'var(--petrol)',
            color: 'var(--cream)',
            fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
          }}
        >
          <Play className="w-5 h-5" />
          {checkStatus === 'idle' && 'Check All Sites'}
          {checkStatus === 'running' && 'Check running...'}
          {checkStatus === 'completed' && 'Check completed'}
          {checkStatus === 'failed' && 'Check failed'}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddSite(!showAddSite)}
          className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          style={{
            background: 'var(--copper)',
            color: 'var(--cream)',
            fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
          }}
        >
          <Plus className="w-5 h-5" />
          Add Site
        </motion.button>
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

      {/* Check status indicator */}
      {checking && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg"
          style={{
            background: 'rgba(255, 248, 234, 0.8)',
            border: '1px solid var(--line)'
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-deep)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentSiteIndex + 1) / sites.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full"
                  style={{ background: 'var(--petrol)' }}
                />
              </div>
              <span className="text-sm whitespace-nowrap" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                {currentSiteIndex + 1}/{sites.length}
              </span>
            </div>
            {sites[currentSiteIndex] && (
              <div className="text-sm" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif', color: 'var(--tweed)' }}>
                Checking: {sites[currentSiteIndex].name}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Add site form */}
      {showAddSite && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-lg"
          style={{
            background: 'rgba(255, 248, 234, 0.8)',
            border: '1px solid var(--line)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
              Add New Site
            </h3>
            <button
              onClick={() => setShowAddSite(false)}
              className="p-2 rounded-full hover:bg-white/50"
            >
              <X className="w-5 h-5" style={{ color: 'var(--tweed)' }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                Site Name
              </label>
              <input
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="e.g., My Website"
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  background: 'var(--cream)',
                  borderColor: 'var(--line)',
                  fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                Base URL
              </label>
              <input
                type="url"
                value={newSiteUrl}
                onChange={(e) => setNewSiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  background: 'var(--cream)',
                  borderColor: 'var(--line)',
                  fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                }}
              />
            </div>
            <button
              onClick={addSite}
              className="w-full px-4 py-2 rounded-lg font-semibold"
              style={{
                background: 'var(--petrol)',
                color: 'var(--cream)',
                fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
              }}
            >
              Add Site
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sitesWithAlerts.map((site: any, index: number) => {
          const statusColors = {
            OK: 'var(--petrol)',
            Warning: 'var(--copper)',
            Critical: '#c44',
          };
          const siteStatus = site.alerts > 0 ? (site.alerts > 3 ? 'Critical' : 'Warning') : 'OK';

          return (
            <Link key={site.id} href={`/sites/${site.id}`}>
              <motion.div
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
                        <CardTitle style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{site.name}</CardTitle>
                        <div className="text-sm mt-1" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{site.base_url}</div>
                      </div>
                      <div className="w-3 h-3 rounded-full" style={{ background: statusColors[siteStatus as keyof typeof statusColors] }} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
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
            </Link>
          );
        })}
      </div>
      </div>
    </div>
  );
}
