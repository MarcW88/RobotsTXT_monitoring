'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";

export default function SitemapsPage() {
  const [sitemaps, setSitemaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: sitemapsData } = await supabase
        .from('sitemap_details')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setSitemaps(sitemapsData || []);
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
          Sitemaps
        </h1>
        <p className="text-lg" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
          Monitor sitemap health and availability
        </p>
      </motion.div>

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
    </div>
  );
}
