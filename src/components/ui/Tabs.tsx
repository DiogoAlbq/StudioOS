import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex items-center space-x-6 border-b border-zinc-800/60 overflow-x-auto custom-scrollbar", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative pb-3 pt-1 text-sm font-medium transition-colors outline-none whitespace-nowrap",
            activeTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full"
              initial={false}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
