import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useTheme } from "../contexts/ThemeContext";

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export function UpdateNotification() {
  const { theme } = useTheme();
  const [_checking, setChecking] = useState(false);
  const [_updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.updates) return;

    // Set up event listeners
    window.electronAPI.updates.onUpdateChecking(() => {
      setChecking(true);
      setError(null);
    });

    window.electronAPI.updates.onUpdateAvailable(info => {
      setChecking(false);
      setUpdateAvailable(true);
      setUpdateInfo(info);
      setShowDialog(true);
    });

    window.electronAPI.updates.onUpdateNotAvailable(() => {
      setChecking(false);
      setUpdateAvailable(false);
    });

    window.electronAPI.updates.onUpdateError(info => {
      setChecking(false);
      setDownloading(false);
      setError(info.error);
      setShowDialog(true);
    });

    window.electronAPI.updates.onDownloadProgress(progress => {
      setDownloading(true);
      setDownloadProgress(progress);
    });

    window.electronAPI.updates.onUpdateDownloaded(info => {
      setDownloading(false);
      setDownloaded(true);
      setUpdateInfo(info);
      setShowDialog(true);
    });

    // Check for updates on mount
    window.electronAPI.updates.checkForUpdates();

    // Cleanup
    return () => {
      window.electronAPI?.updates?.removeAllListeners();
    };
  }, []);

  const handleDownload = async () => {
    try {
      setError(null);
      await window.electronAPI.updates.downloadUpdate();
    } catch (err) {
      setError("Failed to download update");
      console.error("Error downloading update:", err);
    }
  };

  const handleInstall = () => {
    window.electronAPI.updates.installUpdate();
  };

  const handleSkip = () => {
    setShowDialog(false);
    setUpdateAvailable(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + "/s";
  };

  if (!showDialog) return null;

  const dialogContent = (
    <Dialog
      open={showDialog}
      onClose={() => setShowDialog(false)}
      className="relative z-50"
    >
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          className={`mx-auto max-w-md w-full rounded-lg shadow-xl ${
            theme === "dark"
              ? "bg-gray-800 text-white"
              : "bg-white text-gray-900"
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                {error ? (
                  <>
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    Update Error
                  </>
                ) : downloaded ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    Update Ready
                  </>
                ) : downloading ? (
                  <>
                    <ArrowDownTrayIcon className="h-5 w-5 text-blue-500 animate-pulse" />
                    Downloading Update
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-5 w-5 text-blue-500" />
                    Update Available
                  </>
                )}
              </Dialog.Title>
              <button
                onClick={() => setShowDialog(false)}
                className={`rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Dialog.Description className="text-sm">
                {error ? (
                  <span className="text-red-500">{error}</span>
                ) : downloaded ? (
                  `Version ${updateInfo?.version} is ready to install. The app will restart to complete the installation.`
                ) : downloading ? (
                  `Downloading version ${updateInfo?.version}...`
                ) : (
                  `Version ${updateInfo?.version} is available. Would you like to download it now?`
                )}
              </Dialog.Description>

              {downloading && downloadProgress && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                  <div
                    className={`flex justify-between text-xs ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    <span>{Math.round(downloadProgress.percent)}%</span>
                    <span>
                      {formatBytes(downloadProgress.transferred)} /{" "}
                      {formatBytes(downloadProgress.total)}
                    </span>
                    <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
                  </div>
                </div>
              )}

              {updateInfo?.releaseNotes && !downloading && !downloaded && (
                <div
                  className={`max-h-32 overflow-y-auto rounded-md border p-3 text-sm ${
                    theme === "dark"
                      ? "border-gray-700 bg-gray-900"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <p className="font-medium mb-1">What's new:</p>
                  <div
                    className={`whitespace-pre-wrap ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              {error ? (
                <button
                  onClick={() => setShowDialog(false)}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Close
                </button>
              ) : downloaded ? (
                <>
                  <button
                    onClick={() => setShowDialog(false)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Install Later
                  </button>
                  <button
                    onClick={handleInstall}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Install & Restart
                  </button>
                </>
              ) : downloading ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 animate-pulse" />
                  Downloading...
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSkip}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Skip This Version
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download Update
                  </button>
                </>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );

  return createPortal(dialogContent, document.body);
}
