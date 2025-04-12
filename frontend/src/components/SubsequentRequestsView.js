import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SubsequentRequestsView = ({ url, oneTimeResult }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    resource_type: '',
    state_type: '',
    protocol: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    resource_types: [],
    state_types: [],
    protocols: []
  });
  const [expandedUrl, setExpandedUrl] = useState(null);

  // Fetch subsequent requests data
  const fetchRequests = async () => {
    // If we have a one-time result, use that instead of fetching
    if (oneTimeResult && oneTimeResult.subsequent_requests) {
      setRequests(oneTimeResult.subsequent_requests);
      setLoading(false);
      return;
    }
    
    // Regular URL with ID - fetch from API
    if (url && url.id) {
      try {
        setLoading(true);
        let endpoint = `/api/urls/${url.id}/subsequent-requests`;
        
        // Add query parameters for filtering
        const queryParams = [];
        if (filters.resource_type) {
          queryParams.push(`resource_type=${encodeURIComponent(filters.resource_type)}`);
        }
        if (filters.state_type) {
          queryParams.push(`state_type=${encodeURIComponent(filters.state_type)}`);
        }
        if (filters.protocol) {
          queryParams.push(`protocol=${encodeURIComponent(filters.protocol)}`);
        }
        
        if (queryParams.length > 0) {
          endpoint += `?${queryParams.join('&')}`;
        }
        
        const response = await axios.get(endpoint);
        
        // Deduplicate results based on target_url to show each unique URL only once
        const uniqueRequests = [];
        const seenUrls = new Set();
        
        response.data.forEach(req => {
          if (!seenUrls.has(req.target_url)) {
            seenUrls.add(req.target_url);
            uniqueRequests.push(req);
          }
        });
        
        setRequests(uniqueRequests);
        setError(null);
      } catch (err) {
        setError('Failed to fetch subsequent requests data');
        console.error('Error fetching subsequent requests:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      // Only fetch filter options for regular URLs, not one-time checks
      if (!oneTimeResult) {
        const response = await axios.get('/api/subsequent-requests/filters');
        setFilterOptions(response.data);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (oneTimeResult || (url && url.id)) {
      fetchRequests();
      fetchFilterOptions();
    }
  }, [url, oneTimeResult, fetchRequests, fetchFilterOptions]); // Added missing dependencies

  // Re-fetch when filters change
  useEffect(() => {
    if (url && url.id) {
      fetchRequests();
    }
  }, [filters, fetchRequests, url]); // Added missing dependencies

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      resource_type: '',
      state_type: '',
      protocol: ''
    });
  };
  
  // Toggle expanded URL view
  const toggleUrlExpand = (id) => {
    if (expandedUrl === id) {
      setExpandedUrl(null);
    } else {
      setExpandedUrl(id);
    }
  };

  if (loading) {
    return <div className="py-4 text-center">Loading subsequent requests data...</div>;
  }
  
  if (error) {
    return <div className="py-4 text-center text-red-500">{error}</div>;
  }
  
  if (!requests || requests.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-medium mb-4">Subsequent URL Requests</h2>
        <div className="py-4 text-center text-gray-500">
          No subsequent requests detected. This could be because:
          <ul className="list-disc list-inside mt-2">
            <li>The URL doesn't generate any subsequent requests</li>
            <li>Packet capture failed (requires admin privileges)</li>
            <li>Filtering excluded all results</li>
          </ul>
          {!oneTimeResult && (filters.resource_type || filters.state_type || filters.protocol) && (
            <button 
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">Subsequent URL Requests</h2>
      
      {/* Filter Controls - only show for regular URLs, not one-time checks */}
      {!oneTimeResult && (
        <div className="bg-gray-50 p-4 mb-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Filter Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Resource Type Filter */}
            <div>
              <label htmlFor="resource_type" className="block text-xs font-medium text-gray-700">
                Resource Type
              </label>
              <select
                id="resource_type"
                name="resource_type"
                value={filters.resource_type}
                onChange={handleFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Types</option>
                {filterOptions.resource_types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* State Type Filter */}
            <div>
              <label htmlFor="state_type" className="block text-xs font-medium text-gray-700">
                State Type
              </label>
              <select
                id="state_type"
                name="state_type"
                value={filters.state_type}
                onChange={handleFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All States</option>
                {filterOptions.state_types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* Protocol Filter */}
            <div>
              <label htmlFor="protocol" className="block text-xs font-medium text-gray-700">
                Protocol
              </label>
              <select
                id="protocol"
                name="protocol"
                value={filters.protocol}
                onChange={handleFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Protocols</option>
                {filterOptions.protocols.map(protocol => (
                  <option key={protocol} value={protocol}>{protocol}</option>
                ))}
              </select>
            </div>
          </div>
          
          {(filters.resource_type || filters.state_type || filters.protocol) && (
            <div className="mt-2 text-right">
              <button 
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Requests Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target URL
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                State Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Protocol
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((req, index) => (
              <tr key={req.id || `one-time-${index}`}>
                <td className="px-6 py-4 whitespace-normal">
                  <div 
                    className={`text-sm text-gray-900 ${expandedUrl === (req.id || `one-time-${index}`) ? '' : 'truncate max-w-[200px] cursor-pointer'}`}
                    title={expandedUrl === (req.id || `one-time-${index}`) ? '' : req.target_url}
                    onClick={() => toggleUrlExpand(req.id || `one-time-${index}`)}
                  >
                    {req.target_url}
                    {req.target_url && req.target_url.length > 30 && (
                      <button 
                        className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUrlExpand(req.id || `one-time-${index}`);
                        }}
                      >
                        {expandedUrl === (req.id || `one-time-${index}`) ? 'Collapse' : 'Expand'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {req.ip_address}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {req.resource_type}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    req.state_type === 'Stateful' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {req.state_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {req.protocol}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(req.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubsequentRequestsView;