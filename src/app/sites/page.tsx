'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, AlertTriangle, Clock, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import Link from 'next/link';

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkRunId, setCheckRunId] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'queued' | 'running' | 'completed' | 'failed'>('idle');

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
    setCheckStatus('queued');

    try {
      console.log('Calling /api/run-check...');
      const response = await fetch('/api/run-check', {
        method: 'POST',
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Check launched:', data);
        
        if (data.check_run_id) {
          setCheckRunId(data.check_run_id);
          // Start polling for status
          pollCheckStatus(data.check_run_id);
        }
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

  const pollCheckStatus = async (checkRunId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: checkRun, error } = await supabase
          .from('check_runs')
          .select('*')
          .eq('id', checkRunId)
          .single();

        if (error || !checkRun) {
          console.error('Error polling check status:', error);
          clearInterval(pollInterval);
          setCheckStatus('failed');
          setChecking(false);
          return;
        }

        console.log('Check status:', checkRun.status);
        setCheckStatus(checkRun.status as any);

        // Stop polling when completed or failed
        if (checkRun.status === 'completed' || checkRun.status === 'failed') {
          clearInterval(pollInterval);
          
          // Refresh data after completion
          await fetchData();
          
          // Reset checking state after a delay
          setTimeout(() => {
            setChecking(false);
            setCheckStatus('idle');
          }, 2000);
        }
      } catch (error) {
        console.error('Error polling check status:', error);
        clearInterval(pollInterval);
        setCheckStatus('failed');
        setChecking(false);
      }
    }, 3000); // Poll every 3 seconds
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const sitesWithAlerts = sites.map(site => ({
    ...site,
    alerts: alerts.filter(a => a.site_id === site.id).length,
    lastCheck: site.updated_at ? new Date(site.updated_at).toLocaleString() : 'Unknown'
  }));

  return (
    <div className="p-8 space-y-8">
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
          {checkStatus === 'queued' && 'Check queued...'}
          {checkStatus === 'running' && 'Check running...'}
          {checkStatus === 'completed' && 'Check completed'}
          {checkStatus === 'failed' && 'Check failed'}
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
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ 
              background: checkStatus === 'queued' ? 'var(--tweed)' : 
                        checkStatus === 'running' ? 'var(--petrol)' : 
                        checkStatus === 'completed' ? 'var(--petrol)' : 'var(--copper)'
            }} />
            <span className="font-medium" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
              {checkStatus === 'queued' && 'Check queued - waiting for GitHub Actions to start...'}
              {checkStatus === 'running' && 'Check running - monitoring robots.txt files...'}
              {checkStatus === 'completed' && 'Check completed! Data refreshed.'}
              {checkStatus === 'failed' && 'Check failed - please check GitHub Actions for errors'}
            </span>
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
  );
}
