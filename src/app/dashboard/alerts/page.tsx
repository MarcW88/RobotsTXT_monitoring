'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold mb-2" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.06em' }}>
          Alerts
        </h1>
        <p className="text-lg" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
          Monitor and manage alerts across your sites
        </p>
      </motion.div>

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
                    <div className="flex items-center gap-2" style={{ color: 'var(--tweed)' }}>
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Site ID: {alert.site_id}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
