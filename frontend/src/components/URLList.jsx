import React, { useState, useEffect } from 'react';
import axios from 'axios';

function URLList() {
  const [monitoredUrls, setMonitoredUrls] = useState([]);
  const [oneTimeUrls, setOneTimeUrls] = useState([]);
  const [activeTab, setActiveTab] = useState('monitored');

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      const monitoredResponse = await axios.get('/api/urls?type=monitored');
      const oneTimeResponse = await axios.get('/api/urls?type=one-time');
      
      setMonitoredUrls(monitoredResponse.data);
      setOneTimeUrls(oneTimeResponse.data);
    } catch (error) {
      console.error('Error fetching URLs:', error);
    }
  };

  const renderUrlTable = (urls) => {
    if (urls.length === 0) {
      return <p>No URLs found.</p>;
    }

    return (
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">URL</th>
            <th className="px-4 py-2 text-left">Status</th>
            {activeTab === 'monitored' && (
              <>
                <th className="px-4 py-2 text-left">Frequency</th>
                <th className="px-4 py-2 text-left">Active</th>
              </>
            )}
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {urls.map(url => (
            <tr key={url.id}>
              <td className="px-4 py-2">{url.name}</td>
              <td className="px-4 py-2">{url.url}</td>
              <td className="px-4 py-2">
                <button 
                  onClick={() => viewStatus(url.id)} 
                  className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                >
                  View Status
                </button>
              </td>
              {activeTab === 'monitored' && (
                <>
                  <td className="px-4 py-2">{url.check_frequency}s</td>
                  <td className="px-4 py-2">{url.is_active ? 'Yes' : 'No'}</td>
                </>
              )}
              <td className="px-4 py-2">
                <button 
                  onClick={() => viewDetails(url.id)} 
                  className="bg-green-500 text-white px-2 py-1 rounded text-sm mr-2"
                >
                  Details
                </button>
                {activeTab === 'monitored' && (
                  <button 
                    onClick={() => deleteUrl(url.id)} 
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const viewStatus = (id) => {
    // Implementation to view status
  };

  const viewDetails = (id) => {
    // Implementation to view details
  };

  const deleteUrl = async (id) => {
    try {
      await axios.delete(`/api/urls/${id}`);
      fetchUrls();
    } catch (error) {
      console.error('Error deleting URL:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex border-b mb-4">
        <button 
          className={`px-4 py-2 ${activeTab === 'monitored' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('monitored')}
        >
          Monitored URLs
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'one-time' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('one-time')}
        >
          One-time URL Checks
        </button>
      </div>
      
      {activeTab === 'monitored' ? renderUrlTable(monitoredUrls) : renderUrlTable(oneTimeUrls)}
    </div>
  );
}

export default URLList;
