'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Globe, 
  AlertTriangle, 
  FileText, 
  Settings
} from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sites', href: '/dashboard/sites', icon: Globe },
  { name: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle },
  { name: 'Sitemaps', href: '/dashboard/sitemaps', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="w-64 min-h-screen p-6 border-r"
      style={{
        background: 'var(--paper-deep)',
        borderColor: 'var(--line)'
      }}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            <Image 
              src="/noctua-logo.png" 
              alt="Noctua Logo" 
              width={48}
              height={48}
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--petrol)', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '0.18em' }}>
              NOCTUA
            </h1>
            <p className="text-xs" style={{ color: 'var(--tweed)', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>
              Robots.txt Monitor
            </p>
          </div>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-opacity-50'
                    : ''
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--petrol)' : 'transparent',
                  color: isActive ? 'var(--cream)' : 'var(--tweed)'
                }}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium" style={{ fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif' }}>{item.name}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
