import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";

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

interface TipFormData {
  title: string;
  content: string;
  category: string;
  priority: number;
  isActive: boolean;
}

export const TipsSettings: React.FC = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TipFormData>({
    title: "",
    content: "",
    category: "general",
    priority: 0,
    isActive: true,
  });

  const categories = [
    "general",
    "query",
    "connection",
    "ai",
    "performance",
    "shortcuts",
  ];

  useEffect(() => {
    loadTips();
  }, []);

  const loadTips = async () => {
    try {
      setLoading(true);
      const allTips = await window.electronAPI.database.getTips(
        undefined,
        false
      ); // Get all tips, including inactive
      setTips(allTips);
    } catch (error) {
      console.error("Failed to load tips:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      category: "general",
      priority: 0,
      isActive: true,
    });
    setEditingTip(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTip) {
        // Update existing tip
        await window.electronAPI.database.updateTip(editingTip.id, formData);
      } else {
        // Create new tip
        await window.electronAPI.database.createTip(formData);
      }

      await loadTips(); // Refresh the list
      resetForm();
    } catch (error) {
      console.error("Failed to save tip:", error);
      alert("Failed to save tip. Please try again.");
    }
  };

  const handleEdit = (tip: Tip) => {
    setFormData({
      title: tip.title,
      content: tip.content,
      category: tip.category,
      priority: tip.priority,
      isActive: tip.isActive,
    });
    setEditingTip(tip);
    setShowForm(true);
  };

  const handleDelete = async (tip: Tip) => {
    if (!confirm(`Are you sure you want to delete "${tip.title}"?`)) {
      return;
    }

    try {
      await window.electronAPI.database.deleteTip(tip.id);
      await loadTips(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete tip:", error);
      alert("Failed to delete tip. Please try again.");
    }
  };

  const handleToggleActive = async (tip: Tip) => {
    try {
      await window.electronAPI.database.updateTip(tip.id, {
        isActive: !tip.isActive,
      });
      await loadTips(); // Refresh the list
    } catch (error) {
      console.error("Failed to update tip:", error);
      alert("Failed to update tip. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LightBulbIcon className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Tips Management
          </h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Tip</span>
        </button>
      </div>

      {/* Tips List */}
      <div className="space-y-4">
        {tips.length === 0 ? (
          <div className="text-center py-12">
            <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No tips created yet. Add your first tip to get started!
            </p>
          </div>
        ) : (
          tips.map(tip => (
            <div
              key={tip.id}
              className={`border rounded-lg p-4 ${
                tip.isActive
                  ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                      {tip.title}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {tip.category}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Priority: {tip.priority}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Shown: {tip.showCount} times
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
                    {tip.content}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {new Date(tip.createdAt).toLocaleDateString()}
                    {tip.updatedAt !== tip.createdAt && (
                      <span className="ml-4">
                        Updated: {new Date(tip.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(tip)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      tip.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {tip.isActive ? "Active" : "Inactive"}
                  </button>

                  <button
                    onClick={() => handleEdit(tip)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit tip"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(tip)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete tip"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Tip Form */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {editingTip ? "Edit Tip" : "Add New Tip"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={e =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={e =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority (higher shows first)
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          priority: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={e =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Active (tip will be shown to users)
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingTip ? "Update Tip" : "Create Tip"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
