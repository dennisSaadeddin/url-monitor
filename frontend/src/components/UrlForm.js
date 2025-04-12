import React, { useState } from 'react';

const UrlForm = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    url: initialData.url || '',
    name: initialData.name || '',
    check_frequency: initialData.check_frequency || 60,
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
    one_time: false // New field for one-time URL check
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for one_time checkbox
    if (name === 'one_time') {
      setFormData({
        ...formData,
        one_time: checked,
        // If one_time is checked, disable is_active (they are mutually exclusive)
        is_active: checked ? false : formData.is_active
      });
    } else if (name === 'is_active' && checked && formData.one_time) {
      // If is_active is checked, disable one_time
      setFormData({
        ...formData,
        is_active: checked,
        one_time: false
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const validateForm = () => {
    // Simple URL validation
    try {
      new URL(formData.url); // Will throw if invalid
      return true;
    } catch (e) {
      setError('Please enter a valid URL (include http:// or https://)');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    const result = await onSubmit({
      url: formData.url,
      name: formData.name || formData.url,
      check_frequency: parseInt(formData.check_frequency, 10),
      is_active: formData.one_time ? false : formData.is_active,
      one_time: formData.one_time // Include the one_time flag in the submission
    });

    setLoading(false);

    if (result.success) {
      // Reset form if it's an add form (no initialData)
      if (!initialData.url) {
        setFormData({
          url: '',
          name: '',
          check_frequency: 60,
          is_active: true,
          one_time: false
        });
      }
    } else {
      setError(result.error || 'An error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">URL *</label>
        <input
          type="text"
          name="url"
          id="url"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="https://example.com"
          value={formData.url}
          onChange={handleChange}
          required
          disabled={initialData.url} // URL cannot be changed if editing
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Display Name</label>
        <input
          type="text"
          name="name"
          id="name"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="My Website"
          value={formData.name}
          onChange={handleChange}
        />
        <p className="mt-1 text-xs text-gray-500">Leave empty to use URL as name</p>
      </div>

      <div>
        <label htmlFor="check_frequency" className="block text-sm font-medium text-gray-700">
          Check Frequency (seconds)
        </label>
        <input
          type="number"
          name="check_frequency"
          id="check_frequency"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          min="10"
          max="3600"
          value={formData.check_frequency}
          onChange={handleChange}
          disabled={formData.one_time} // Disable when one_time is checked
        />
      </div>

      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={formData.is_active}
            onChange={handleChange}
            disabled={formData.one_time} // Disable when one_time is checked
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
            Active (continuously monitor this URL)
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            id="one_time"
            name="one_time"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={formData.one_time}
            onChange={handleChange}
            disabled={initialData.url} // Can't change to one-time if editing an existing URL
          />
          <label htmlFor="one_time" className="ml-2 block text-sm text-gray-900">
            Check URL one time (don't save for continuous monitoring)
          </label>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : formData.one_time ? 'Check URL' : (initialData.url ? 'Update URL' : 'Add URL')}
        </button>
      </div>
    </form>
  );
};

export default UrlForm;