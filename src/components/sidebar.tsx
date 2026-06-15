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
  { name: 'Sites', href: '/sites', icon: Globe },
  { name: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle },
  { name: 'Sitemaps', href: '/dashboard/sitemaps', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -200 }}
      animate={{ x: 0 }}
      className="w-16 min-h-screen p-3 border-r flex flex-col items-center"
      style={{
        background: 'var(--paper-deep)',
        borderColor: 'var(--line)'
      }}
    >
      <div className="mb-6">
        <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: '1px solid var(--line)' }}>
          <Image 
            src="/noctua-logo.png" 
            alt="Noctua Logo" 
            width={40}
            height={40}
            className="object-cover"
          />
        </div>
      </div>

      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center justify-center p-3 rounded-lg transition-colors relative group"
                style={{
                  backgroundColor: isActive ? 'var(--petrol)' : 'transparent',
                  color: isActive ? 'var(--cream)' : 'var(--tweed)'
                }}
                title={item.name}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute left-14 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                  style={{
                    background: 'var(--petrol)',
                    color: 'var(--cream)',
                    fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
                  }}
                >
                  {item.name}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
