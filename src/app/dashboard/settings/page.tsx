'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-8">
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

      <Card style={{
        background: 'radial-gradient(circle at 18% 12%, rgba(194, 145, 93, 0.08), transparent 28%), rgba(255, 248, 234, 0.56)',
        border: '1px solid var(--line)',
        boxShadow: '0 18px 46px var(--shadow)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--copper)' }} />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
            Settings configuration coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
