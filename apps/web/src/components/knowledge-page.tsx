'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, Brain } from 'lucide-react';
import { MemoryPage } from './memory-page';
import { ContactsPage } from './contacts-page';
import type { UserMemory, Contact } from '@/types';

interface KnowledgePageProps {
  memories: UserMemory[];
  contacts: Contact[];
  userId: string;
}

export function KnowledgePage({ memories, contacts, userId }: KnowledgePageProps) {
  const searchParams = useSearchParams();
  // Default to contacts tab (more prominent)
  const initialTab = searchParams.get('tab') === 'memory' ? 'memory' : 'contacts';
  const [activeTab, setActiveTab] = useState<'memory' | 'contacts'>(initialTab);

  const tabs = [
    {
      id: 'contacts' as const,
      label: 'Contacts',
      icon: Users,
      count: contacts.length,
    },
    {
      id: 'memory' as const,
      label: 'Memory',
      icon: Brain,
      count: memories.length,
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 24px 0' }}>
      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#37352F', margin: 0 }}>Knowledge</h1>
        <p style={{ fontSize: 14, color: '#787774', marginTop: 4 }}>
          Your contacts and what the AI has learned about you.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid #E3E2DE',
        marginBottom: 0,
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#37352F' : '#787774',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #2383E2' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 120ms ease',
              }}
            >
              <tab.icon style={{ height: 16, width: 16, color: isActive ? '#2383E2' : '#787774' }} />
              <span>{tab.label}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: isActive ? '#2383E2' : '#B4B4B0',
                backgroundColor: isActive ? 'rgba(35,131,226,0.08)' : '#F7F6F3',
                padding: '1px 6px',
                borderRadius: 4,
                minWidth: 20,
                textAlign: 'center',
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: 0 }}>
        {activeTab === 'contacts' ? (
          <ContactsPage contacts={contacts} userId={userId} />
        ) : (
          <MemoryPage memories={memories} userId={userId} />
        )}
      </div>
    </div>
  );
}
