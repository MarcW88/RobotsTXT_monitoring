'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Plus, Trash2, Globe } from 'lucide-react';
import { useState } from 'react';
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";

export default function SettingsPage() {
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [addingSite, setAddingSite] = useState(false);
  const [deletingAnalysis, setDeletingAnalysis] = useState(false);

  const addSite = async () => {
    if (!newSiteName || !newSiteUrl) return;
    
    setAddingSite(true);
    try {
      const { error } = await supabase
        .from('sites')
        .insert({
          name: newSiteName,
          base_url: newSiteUrl,
          is_active: true
        });
      
      if (error) throw error;
      
      setNewSiteName('');
      setNewSiteUrl('');
      alert('Site added successfully!');
    } catch (error) {
      console.error('Error adding site:', error);
      alert('Failed to add site');
    } finally {
      setAddingSite(false);
    }
  };

  const deleteAnalysis = async () => {
    if (!confirm('Are you sure you want to delete all analysis data? This cannot be undone.')) {
      return;
    }
    
    setDeletingAnalysis(true);
    try {
      const { error: alertsError } = await supabase
        .from('alerts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (alertsError) throw alertsError;

      const { error: checksError } = await supabase
        .from('checks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (checksError) throw checksError;

      const { error: sitemapsError } = await supabase
        .from('sitemap_details')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (sitemapsError) throw sitemapsError;

      alert('All analysis data deleted successfully');
    } catch (error) {
      console.error('Error deleting analysis data:', error);
      alert('Failed to delete analysis data');
    } finally {
      setDeletingAnalysis(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold mb-2" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.06em' }}>
          Settings
        </h1>
        <p className="text-lg" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
          Configure your monitoring preferences
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                <Plus className="w-5 h-5" style={{ color: 'var(--copper)' }} />
                Add New Site
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                  Site Name
                </label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="e.g., My Website"
                  className="w-full p-3 rounded-lg border"
                  style={{
                    background: 'var(--paper-deep)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                  Base URL
                </label>
                <input
                  type="url"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-3 rounded-lg border"
                  style={{
                    background: 'var(--paper-deep)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                  }}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addSite}
                disabled={addingSite || !newSiteName || !newSiteUrl}
                className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                style={{
                  background: addingSite || !newSiteName || !newSiteUrl ? 'var(--tweed)' : 'var(--petrol)',
                  color: 'var(--cream)',
                  fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif',
                  opacity: addingSite || !newSiteName || !newSiteUrl ? 0.5 : 1
                }}
              >
                <Globe className="w-5 h-5" />
                {addingSite ? 'Adding Site...' : 'Add Site'}
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card style={{
            background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
            border: '1px solid var(--line)',
            boxShadow: '0 18px 46px var(--shadow)'
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                <Settings className="w-5 h-5" style={{ color: 'var(--copper)' }} />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--ink)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                  Delete Analysis Data
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
                  Permanently delete all checks, alerts, and sitemap details. This action cannot be undone.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={deleteAnalysis}
                  disabled={deletingAnalysis}
                  className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: '#c44',
                    color: 'var(--cream)',
                    fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif',
                    opacity: deletingAnalysis ? 0.5 : 1
                  }}
                >
                  <Trash2 className="w-5 h-5" />
                  {deletingAnalysis ? 'Deleting...' : 'Delete All Analysis Data'}
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      </div>
    </div>
  );
}
