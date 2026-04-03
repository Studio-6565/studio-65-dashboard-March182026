import React from 'react';
import ClientInbox from '@/components/studio/ClientInbox';
import OnboardingInbox from '@/components/studio/OnboardingInbox';

export default function InboxPage({ projects, contacts }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ClientInbox projects={projects} contacts={contacts} />
      <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: 32 }}>
        <OnboardingInbox />
      </div>
    </div>
  );
}