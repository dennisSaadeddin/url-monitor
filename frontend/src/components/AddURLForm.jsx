import React, { useState } from 'react';
import axios from 'axios';

function AddURLForm({ onURLAdded }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [checkFrequency, setCheckFrequency] = useState(60);
  const [isOneTime, setIsOneTime] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('/api/urls', {
        url,
        name: name || url,
        check_frequency: checkFrequency,
        one_time: isOneTime
      });
      
      // Clear form
      setUrl('');
      setName('');
      setCheckFrequency(60);
      setIsOneTime(false);
      
      // Notify parent component
      if (onURLAdded) {
        onURLAdded(response.data);
      }
    } catch (error) {
      console.error('Error adding URL:', error);
      alert('Failed to add URL. Please try again.');
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add New URL to Monitor</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="https://example.com"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="My Website"
          />
        </div>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isOneTime}
              onChange={(e) => setIsOneTime(e.target.checked)}
              className="mr-2"
            />
            <span className="text-gray-700">One-time check only</span>
          </label>
        </div>
        
        {!isOneTime && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Check Frequency (seconds)</label>
            <input
              type="number"
              value={checkFrequency}
              onChange={(e) => setCheckFrequency(parseInt(e.target.value))}
              min="5"
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}
        
        <button 
          type="submit" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {isOneTime ? 'Run One-Time Check' : 'Add URL for Monitoring'}
        </button>
      </form>
    </div>
  );
}

export default AddURLForm;
