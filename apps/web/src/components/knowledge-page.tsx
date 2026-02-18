'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Brain, Users } from 'lucide-react';
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
  const initialTab = searchParams.get('tab') === 'contacts' ? 'contacts' : 'memory';
  const [activeTab, setActiveTab] = useState<'memory' | 'contacts'>(initialTab);

  const tabs = [
    {
      id: 'memory' as const,
      label: 'Memory',
      icon: Brain,
      count: memories.length,
      description: 'What the AI knows about you',
    },
    {
      id: 'contacts' as const,
      label: 'Contacts',
      icon: Users,
      count: contacts.length,
      description: 'Your phone book',
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 24px 0' }}>
      {/* Tabs — replace child component headers */}
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
                borderBottom: isActive ? '2px solid #37352F' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 120ms ease',
              }}
            >
              <tab.icon style={{ height: 16, width: 16 }} />
              <span>{tab.label}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: isActive ? '#37352F' : '#B4B4B0',
                backgroundColor: isActive ? '#EFEFEF' : '#F7F6F3',
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

      {/* Tab Content — rendered in full */}
      <div style={{ marginTop: 0 }}>
        {activeTab === 'memory' ? (
          <MemoryPage memories={memories} userId={userId} />
        ) : (
          <ContactsPage contacts={contacts} userId={userId} />
        )}
      </div>
    </div>
  );
}
