'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
}

interface TabsListProps {
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  isActive: boolean;
}

export function Tabs({ defaultValue, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { activeTab, setActiveTab });
        }
        return child;
      })}
    </div>
  );
}

export function TabsList({ children, activeTab, setActiveTab }: any) {
  return (
    <div className="flex mb-6" style={{ borderBottom: '1px solid var(--line)' }}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { 
            activeTab, 
            setActiveTab,
            isActive: (child as any).props.value === activeTab 
          });
        }
        return child;
      })}
    </div>
  );
}

export function TabsTrigger({ value, children, isActive, onClick }: TabsTriggerProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="px-6 py-3 text-sm font-medium transition-colors relative"
      style={{
        color: isActive ? 'var(--petrol)' : 'var(--tweed)',
        fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif'
      }}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: 'var(--copper)' }}
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

export function TabsContent({ value, children, isActive }: TabsContentProps) {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
