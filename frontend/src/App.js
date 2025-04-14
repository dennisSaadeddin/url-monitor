import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import UrlForm from './components/UrlForm';
import UrlList from './components/UrlList';
import UrlDetail from './components/UrlDetail';
import SubsequentRequestsView from './components/SubsequentRequestsView';
import Footer from './components/Footer';

function App() {
  const [urls, setUrls] = useState([]);
  const [oneTimeUrls, setOneTimeUrls] = useState([]); // Store one-time URLs separately
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('status'); // 'status' or 'requests'
  const [urlListTab, setUrlListTab] = useState('monitored'); // 'monitored' or 'one-time'
  const [oneTimeCheckResult, setOneTimeCheckResult] = useState(null); // One-time check results
  const [oneTimeActiveTab, setOneTimeActiveTab] = useState('status'); // Tab for one-time check results
  const [fetchingInProgress, setFetchingInProgress] = useState(false); // Prevent duplicate fetches
  const [lastFetchTime, setLastFetchTime] = useState(0); // Timestamp of last fetch

  // Function to fetch all URLs with debouncing
  const fetchUrls = useCallback(async () => {
    // Prevent multiple concurrent fetches and limit frequency
    const now = Date.now();
    if (fetchingInProgress || (now - lastFetchTime < 2000)) {
      return; // Skip if a fetch is already in progress or if we fetched recently
    }
    
    try {
      setFetchingInProgress(true);
      setLoading(true);
      
      // Fetch both monitored and one-time URLs
      const [regularResponse, oneTimeResponse] = await Promise.all([
        axios.get('/api/urls?type=monitored'),
        axios.get('/api/urls?type=one-time')
      ]);
      
      setUrls(regularResponse.data);
      setOneTimeUrls(oneTimeResponse.data);
      setError(null);
      setLastFetchTime(Date.now());
    } catch (err) {
      setError('Failed to fetch URLs. Please try again later.');
      console.error('Error fetching URLs:', err);
    } finally {
      setLoading(false);
      setFetchingInProgress(false);
    }
  }, [fetchingInProgress, lastFetchTime]);

  // Fetch all URLs on component mount
  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  // Function to add a new URL or perform one-time check
  const addUrl = async (urlData) => {
    try {
      // Clear any previous one-time check results
      setOneTimeCheckResult(null);
      
      const response = await axios.post('/api/urls', urlData);
      
      // Check if this was a one-time check
      if (urlData.one_time) {
        // For one-time checks, store the complete result including subsequent requests
        setOneTimeCheckResult({
          url: urlData.url,
          name: urlData.name || urlData.url,
          status: response.data.status,
          subsequent_requests: response.data.subsequent_requests
        });
        setOneTimeActiveTab('status'); // Reset to status tab
        
        // Also update the one-time URLs list
        fetchUrls();
      } else {
        // For regular URL monitoring, add to the URLs list
        setUrls([...urls, response.data]);
      }
      return { success: true };
    } catch (err) {
      console.error('Error adding URL:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to add URL - already under monitoring' 
      };
    }
  };

  // Function to update a URL
  const updateUrl = async (id, urlData) => {
    try {
      const response = await axios.put(`/api/urls/${id}`, urlData);
      
      // Update the correct list based on whether it's a one-time URL or not
      if (response.data.is_one_time) {
        setOneTimeUrls(oneTimeUrls.map(url => url.id === id ? response.data : url));
      } else {
        setUrls(urls.map(url => url.id === id ? response.data : url));
      }
      
      // If the selectedUrl is being updated, update it too
      if (selectedUrl && selectedUrl.id === id) {
        setSelectedUrl(response.data);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error updating URL:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to update URL' 
      };
    }
  };

  // Function to delete a URL
  const deleteUrl = async (id) => {
    try {
      setLoading(true); // Show loading state during deletion
      
      const response = await axios.delete(`/api/urls/${id}`);
      
      // Remove from the appropriate list
      const urlInMonitored = urls.find(url => url.id === id);
      if (urlInMonitored) {
        setUrls(urls.filter(url => url.id !== id));
      } else {
        setOneTimeUrls(oneTimeUrls.filter(url => url.id !== id));
      }
      
      // If the selectedUrl is being deleted, clear it
      if (selectedUrl && selectedUrl.id === id) {
        setSelectedUrl(null);
      }

      // Show a success toast or notification if you have a notification system
      console.log(`URL deleted successfully: ${response.data.message}`);
      console.log(`Cleaned up ${response.data.details.deleted_status_records} status records and ${response.data.details.deleted_subsequent_requests} subsequent requests`);
      
      return { 
        success: true,
        message: response.data.message,
        details: response.data.details
      };
    } catch (err) {
      console.error('Error deleting URL:', err);
      
      // Show error message to user
      const errorMsg = err.response?.data?.error || 'Failed to delete URL';
      setError(errorMsg);
      
      return { 
        success: false, 
        error: errorMsg
      };
    } finally {
      setLoading(false);
    }
  };

  // Function to select a URL for detailed view
  const selectUrl = (url) => {
    setSelectedUrl(url);
    setActiveTab('status'); // Reset to status tab when selecting a new URL
  };

  // Function to switch between tabs
  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  // Function to switch between URL list tabs (monitored vs one-time)
  const switchUrlListTab = (tab) => {
    setUrlListTab(tab);
    setSelectedUrl(null); // Clear selection when switching tabs
  };

  // Function to switch tabs for one-time check result
  const switchOneTimeTab = (tab) => {
    setOneTimeActiveTab(tab);
  };

  // Function to clear one-time check result
  const clearOneTimeResult = () => {
    setOneTimeCheckResult(null);
  };

  // Determine which URLs to show based on active tab
  const displayedUrls = urlListTab === 'monitored' ? urls : oneTimeUrls;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">URL Monitor</h1>
        </div>
      </header>
      
      <main className="flex-grow max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* URL Add Form */}
            <div className="md:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">Add New URL</h2>
                <UrlForm onSubmit={addUrl} />
                
                {/* One-time check result */}
                {oneTimeCheckResult && (
                  <div className="mt-6 border-t pt-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium">One-Time Check Result</h3>
                      <button 
                        onClick={clearOneTimeResult}
                        className="text-gray-400 hover:text-gray-500"
                        aria-label="Close"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    <p className="text-sm font-medium mt-2">
                      {oneTimeCheckResult.name}
                    </p>
                    
                    {/* Tabs for one-time check result */}
                    <div className="mt-4 border-b border-gray-200">
                      <nav className="-mb-px flex">
                        <button
                          className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-xs ${
                            oneTimeActiveTab === 'status'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                          onClick={() => switchOneTimeTab('status')}
                        >
                          URL Status
                        </button>
                        <button
                          className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-xs ${
                            oneTimeActiveTab === 'requests'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                          onClick={() => switchOneTimeTab('requests')}
                        >
                          Subsequent URL Calls
                        </button>
                      </nav>
                    </div>
                    
                    {/* Tab content */}
                    <div className="mt-4">
                      {oneTimeActiveTab === 'status' ? (
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              oneTimeCheckResult.status.is_up 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {oneTimeCheckResult.status.is_up ? 'UP' : 'DOWN'}
                            </span>
                            {oneTimeCheckResult.status.status_code && (
                              <span className="text-sm text-gray-500">
                                HTTP {oneTimeCheckResult.status.status_code}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            Response time: {oneTimeCheckResult.status.response_time} ms
                          </div>
                          {oneTimeCheckResult.status.error_message && (
                            <div className="mt-1 text-sm text-red-500">
                              {oneTimeCheckResult.status.error_message}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-gray-400">
                            Checked at: {new Date(oneTimeCheckResult.status.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <SubsequentRequestsView oneTimeResult={oneTimeCheckResult} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* URL List */}
            <div className="md:col-span-2">
              <div className="bg-white shadow rounded-lg p-6">
                {/* URL List Tabs */}
                <div className="flex border-b mb-4">
                  <button 
                    className={`px-4 py-2 font-medium ${urlListTab === 'monitored' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => switchUrlListTab('monitored')}
                  >
                    Monitored URLs
                  </button>
                  <button 
                    className={`px-4 py-2 font-medium ${urlListTab === 'one-time' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => switchUrlListTab('one-time')}
                  >
                    One-time URL Checks
                  </button>
                </div>
                
                <h2 className="text-lg font-medium mb-4">
                  {urlListTab === 'monitored' ? 'Monitored URLs' : 'One-time URL Checks'}
                </h2>
                
                {loading ? (
                  <p>Loading URLs...</p>
                ) : error ? (
                  <p className="text-red-500">{error}</p>
                ) : (
                  <UrlList 
                    urls={displayedUrls} 
                    onSelect={selectUrl} 
                    onDelete={deleteUrl} 
                    onUpdate={updateUrl} 
                    selectedUrlId={selectedUrl?.id}
                    isOneTime={urlListTab === 'one-time'}
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* URL Detail View with Tabs */}
          {selectedUrl && (
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                  <button
                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'status'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => switchTab('status')}
                  >
                    URL Status
                  </button>
                  <button
                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'requests'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => switchTab('requests')}
                  >
                    Subsequent URL Calls
                  </button>
                </nav>
              </div>
              <div className="p-6">
                <h2 className="text-lg font-medium mb-4">
                  {selectedUrl.name} 
                  <span className="ml-2 text-sm text-gray-500">
                    ({activeTab === 'status' ? 'Status' : 'Subsequent Requests'})
                  </span>
                </h2>
                
                {activeTab === 'status' ? (
                  <UrlDetail url={selectedUrl} />
                ) : (
                  <SubsequentRequestsView url={selectedUrl} />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;