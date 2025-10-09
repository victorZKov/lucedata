import { X } from "lucide-react";

interface VersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// This will be populated at build time
export const VERSION_INFO = {
  major: 0,
  minor: 1,
  build: 1038,
  version: "0.1.1038",
  buildDate: "2025-10-09",
};

export default function VersionDialog({ isOpen, onClose }: VersionDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 border border-border rounded-lg p-6 w-96 max-w-[90vw] shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            About SQL Helper
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version:</span>
            <span className="font-mono text-foreground">
              {VERSION_INFO.version}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Major:</span>
            <span className="font-mono text-foreground">
              {VERSION_INFO.major}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Minor:</span>
            <span className="font-mono text-foreground">
              {VERSION_INFO.minor}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Build:</span>
            <span className="font-mono text-foreground">
              {VERSION_INFO.build}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Build Date:</span>
            <span className="font-mono text-foreground">
              {VERSION_INFO.buildDate}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Cross-platform AI-assisted SQL database desktop application
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
