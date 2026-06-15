'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, AlertTriangle, Clock, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import Link from 'next/link';

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState<{[key: string]: 'pending' | 'checking' | 'done' | 'error'}>({});

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
    setChecking(true);
    // Initialize progress for all sites
    const initialProgress: {[key: string]: 'pending' | 'checking' | 'done' | 'error'} = {};
    sites.forEach(site => {
      initialProgress[site.id] = 'pending';
    });
    setCheckProgress(initialProgress);

    try {
      const response = await fetch('/api/check-all', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Check completed:', data);
        
        // Update progress based on results
        const newProgress = { ...initialProgress };
        if (data.results) {
          data.results.forEach((result: any) => {
            newProgress[result.site_id] = result.status === 'checked' ? 'done' : 'error';
          });
        }
        setCheckProgress(newProgress);
        
        // Refresh data after check
        await fetchData();
      } else {
        console.error('Failed to check sites');
        // Mark all as error
        const errorProgress: {[key: string]: 'pending' | 'checking' | 'done' | 'error'} = {};
        sites.forEach(site => {
          errorProgress[site.id] = 'error';
        });
        setCheckProgress(errorProgress);
      }
    } catch (error) {
      console.error('Error checking sites:', error);
      // Mark all as error
      const errorProgress: {[key: string]: 'pending' | 'checking' | 'done' | 'error'} = {};
      sites.forEach(site => {
        errorProgress[site.id] = 'error';
      });
      setCheckProgress(errorProgress);
    } finally {
      setChecking(false);
    }
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
          {checking ? 'Checking...' : 'Check All Sites'}
        </motion.button>
      </motion.div>

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
                    
                    {/* Progress indicator */}
                    {checking && checkProgress[site.id] && (
                      <div className="flex items-center gap-2 p-2 rounded" style={{ background: 'rgba(255, 248, 234, 0.5)' }}>
                        {checkProgress[site.id] === 'pending' && (
                          <>
                            <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'var(--tweed)' }} />
                            <span className="text-xs" style={{ color: 'var(--tweed)' }}>Pending</span>
                          </>
                        )}
                        {checkProgress[site.id] === 'checking' && (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--petrol)' }} />
                            <span className="text-xs" style={{ color: 'var(--petrol)' }}>Checking...</span>
                          </>
                        )}
                        {checkProgress[site.id] === 'done' && (
                          <>
                            <CheckCircle className="w-4 h-4" style={{ color: 'var(--petrol)' }} />
                            <span className="text-xs" style={{ color: 'var(--petrol)' }}>Done</span>
                          </>
                        )}
                        {checkProgress[site.id] === 'error' && (
                          <>
                            <XCircle className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                            <span className="text-xs" style={{ color: 'var(--copper)' }}>Error</span>
                          </>
                        )}
                      </div>
                    )}
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
