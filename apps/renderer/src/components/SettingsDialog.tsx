import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  Cog6ToothIcon,
  CircleStackIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

import { useTheme } from "../contexts/ThemeContext";

import {
  ApplicationSettings,
  ConnectionsSettings,
  AIEnginesSettings,
  TipsSettings,
} from "./settings";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "application" | "connections" | "ai-engines" | "tips";

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("application");

  // Listen for tab change events
  useEffect(() => {
    const handleTabChange = (event: CustomEvent<{ tab: SettingsTab }>) => {
      if (event.detail?.tab) {
        setActiveTab(event.detail.tab);
      }
    };

    document.addEventListener(
      "settings-tab-change",
      handleTabChange as EventListener
    );

    return () => {
      document.removeEventListener(
        "settings-tab-change",
        handleTabChange as EventListener
      );
    };
  }, []);

  const tabs = [
    {
      id: "application" as const,
      name: "Application",
      icon: Cog6ToothIcon,
      component: ApplicationSettings,
    },
    {
      id: "connections" as const,
      name: "Connections",
      icon: CircleStackIcon,
      component: ConnectionsSettings,
    },
    {
      id: "ai-engines" as const,
      name: "AI Engines",
      icon: CpuChipIcon,
      component: AIEnginesSettings,
    },
    {
      id: "tips" as const,
      name: "Tips",
      icon: ({ className }: { className?: string }) => (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      component: TipsSettings,
    },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component || ApplicationSettings;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-[3000] opacity-100"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[3000]" aria-hidden="true" />

      {/* Panel container */}
      <div className="fixed inset-0 z-[3010] flex items-center justify-center p-4 opacity-100">
        <Dialog.Panel
          className="relative w-full max-w-6xl max-h-[90vh] rounded-lg bg-modal text-modal-foreground shadow-2xl border border-border dark:border-white/10 opacity-100 isolate mix-blend-normal overflow-hidden"
          style={{ backgroundColor: theme === "dark" ? "#111318" : "#ffffff" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: theme === "dark" ? "#111318" : "#ffffff",
            }}
          />
          <div className="relative">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Settings
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex h-[600px]">
              {/* Sidebar with tabs */}
              <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="p-4 space-y-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.id
                          ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"
                      }`}
                    >
                      <tab.icon className="h-5 w-5 mr-3" />
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main content area */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <ActiveComponent />
                </div>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default SettingsDialog;
