import { useState } from 'react';
import Header from '@/components/layout/header';
import { AutomationPanel } from '@/components/automations/automation-panel';

export default function AutomationPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Automatisations" />

        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <AutomationPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
