import React, { useState } from 'react';
import axios from 'axios';

const AlertSettings = ({ url, onUpdate }) => {
  const [alertConfig, setAlertConfig] = useState({
    alert_enabled: url.alert_enabled || false,
    alert_recovery: url.alert_recovery !== false // Default to true if not set
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setAlertConfig({
      ...alertConfig,
      [name]: checked
    });
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Update just the alert-related fields
      const response = await axios.put(`/api/urls/${url.id}/alerts`, alertConfig);
      setSuccess(true);
      
      // Notify parent component of the update
      if (onUpdate) {
        onUpdate(response.data);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save alert settings');
      console.error('Error saving alert settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
      <h3 className="text-lg font-medium mb-4">Alert Settings</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded border border-green-200">
          Alert settings saved successfully!
        </div>
      )}
      
      <form onSubmit={saveSettings}>
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="alert_enabled"
              checked={alertConfig.alert_enabled}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Enable downtime alerts for this URL</span>
          </label>
          <p className="mt-1 text-sm text-gray-500">
            Receive Slack alerts when this website is down for 2 consecutive checks
          </p>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="alert_recovery"
              checked={alertConfig.alert_recovery}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Send recovery notifications</span>
          </label>
          <p className="mt-1 text-sm text-gray-500">
            Also notify when the website comes back online after downtime
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Alert Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AlertSettings;