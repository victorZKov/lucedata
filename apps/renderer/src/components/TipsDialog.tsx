import React, { useState, useEffect, useCallback } from "react";
import { Dialog } from "@headlessui/react";
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";

import { useTheme } from "../contexts/ThemeContext";

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: number;
  isActive: boolean;
  showCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TipsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TipsDialog: React.FC<TipsDialogProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [tips, setTips] = useState<Tip[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showAtStartup, setShowAtStartup] = useState(true);
  const [loading, setLoading] = useState(false);

  // Load random tips when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadRandomTips();
      loadStartupPreference();
    }
  }, [isOpen]);

  const loadRandomTips = async () => {
    setLoading(true);
    try {
      const randomTips = await window.electronAPI.database.getRandomTips(5);
      setTips(randomTips);
      setCurrentTipIndex(0);

      // Increment show count for the first tip
      if (randomTips.length > 0) {
        await window.electronAPI.database.incrementTipShowCount(
          randomTips[0].id
        );
      }
    } catch (error) {
      console.error("Failed to load tips:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStartupPreference = async () => {
    try {
      const value = await window.electronAPI.database.getSetting(
        "showTipsAtStartup",
        true
      );
      setShowAtStartup(value as boolean);
    } catch (error) {
      console.error("Failed to load startup preference:", error);
    }
  };

  const saveStartupPreference = async (show: boolean) => {
    try {
      await window.electronAPI.database.setSetting("showTipsAtStartup", show);
      setShowAtStartup(show);
    } catch (error) {
      console.error("Failed to save startup preference:", error);
    }
  };

  const goToPreviousTip = useCallback(async () => {
    if (tips.length === 0) return;

    const newIndex =
      currentTipIndex > 0 ? currentTipIndex - 1 : tips.length - 1;
    setCurrentTipIndex(newIndex);

    // Increment show count for the new tip
    await window.electronAPI.database.incrementTipShowCount(tips[newIndex].id);
  }, [currentTipIndex, tips]);

  const goToNextTip = useCallback(async () => {
    if (tips.length === 0) return;

    const newIndex =
      currentTipIndex < tips.length - 1 ? currentTipIndex + 1 : 0;
    setCurrentTipIndex(newIndex);

    // Increment show count for the new tip
    await window.electronAPI.database.incrementTipShowCount(tips[newIndex].id);
  }, [currentTipIndex, tips]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousTip();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextTip();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goToPreviousTip, goToNextTip, onClose]);

  const currentTip = tips[currentTipIndex];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[3000]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Panel container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          className="relative w-full max-w-2xl rounded-lg shadow-2xl border border-border overflow-hidden"
          style={{ backgroundColor: theme === "dark" ? "#111318" : "#ffffff" }}
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <LightBulbIcon className="h-6 w-6 text-yellow-500" />
                <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Tips & Tricks
                </Dialog.Title>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : currentTip ? (
              <div className="space-y-4">
                {/* Tip counter */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Tip {currentTipIndex + 1} of {tips.length}
                </div>

                {/* Tip content */}
                <div className="min-h-[200px]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {currentTip.title}
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {currentTip.content}
                  </div>

                  {/* Category badge */}
                  {currentTip.category && (
                    <div className="mt-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        {currentTip.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                {tips.length > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={goToPreviousTip}
                      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-2" />
                      Previous
                    </button>

                    <div className="flex space-x-2">
                      {tips.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentTipIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentTipIndex
                              ? "bg-blue-500"
                              : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={goToNextTip}
                      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No tips available. Add some tips in the settings to get
                  started!
                </p>
              </div>
            )}
          </div>

          {/* Footer with startup checkbox */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAtStartup}
                  onChange={e => saveStartupPreference(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span>Show tips at startup</span>
              </label>

              <button
                onClick={loadRandomTips}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Load new tips
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default TipsDialog;
