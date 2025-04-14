import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const UrlDetail = ({ url }) => {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [pageSize, setPageSize] = useState(10); // Default page size
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allStatuses, setAllStatuses] = useState([]); // Store all statuses for pagination

  // Update displayed statuses based on pagination - wrap in useCallback
  const updateDisplayedStatuses = useCallback((allData, page, size) => {
    // Calculate total pages
    const total = Math.ceil(allData.length / size);
    setTotalPages(total > 0 ? total : 1);
    
    // Adjust current page if needed
    const adjustedPage = page > total ? total : page;
    if (adjustedPage !== page) {
      setCurrentPage(adjustedPage > 0 ? adjustedPage : 1);
    }
    
    // Get the statuses for the current page
    const startIndex = (adjustedPage - 1) * size;
    const endIndex = startIndex + size;
    setStatuses(allData.slice(startIndex, endIndex));
  }, []);

  // Function to fetch status data - wrap in useCallback to prevent infinite loop
  const fetchStatusData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/urls/${url.id}/status`);
      setAllStatuses(response.data);
      updateDisplayedStatuses(response.data, currentPage, pageSize);
      setError(null);
    } catch (err) {
      setError('Failed to fetch status data');
      console.error('Error fetching status data:', err);
    } finally {
      setLoading(false);
    }
  }, [url.id, currentPage, pageSize, updateDisplayedStatuses]); // Added updateDisplayedStatuses to dependencies
  
  // Handle page size change
  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    updateDisplayedStatuses(allStatuses, 1, newSize); // Reset to first page
    setCurrentPage(1);
  };
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    updateDisplayedStatuses(allStatuses, page, pageSize);
  };

  // Set up initial data fetch and refresh interval
  useEffect(() => {
    // Fetch data immediately
    fetchStatusData();
    
    let intervalId = null;
    
    // Set up refresh interval if URL is active
    if (url && url.is_active) {
      // Ensure minimum refresh rate of 10 seconds to avoid overwhelming the server
      const refreshRate = Math.max(url.check_frequency * 1000, 10000);
      intervalId = setInterval(fetchStatusData, refreshRate);
      setRefreshInterval(intervalId);
    }
    
    // Clean up interval on component unmount or URL change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [url?.id, url?.is_active, url?.check_frequency, fetchStatusData]);
  
  // Separate effect for refreshInterval cleanup
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    };
  }, [refreshInterval]);
  
  // Update displayed statuses when page size or current page changes
  useEffect(() => {
    if (allStatuses.length > 0) {
      updateDisplayedStatuses(allStatuses, currentPage, pageSize);
    }
  }, [pageSize, currentPage, allStatuses, updateDisplayedStatuses]);

  // Prepare chart data
  const chartData = {
    labels: statuses.slice().reverse().map(status => {
      const date = new Date(status.timestamp);
      return date.toLocaleTimeString();
    }),
    datasets: [
      {
        label: 'Response Time (ms)',
        data: statuses.slice().reverse().map(status => status.response_time * 1000), // Convert to milliseconds
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Response Time History',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Response Time (ms)',
        }
      }
    }
  };

  // Get current status
  const currentStatus = allStatuses.length > 0 ? allStatuses[0] : null;
  
  if (loading) {
    return <div className="py-4 text-center">Loading status data...</div>;
  }
  
  if (error) {
    return <div className="py-4 text-center text-red-500">{error}</div>;
  }
  
  if (allStatuses.length === 0) {
    return <div className="py-4 text-center text-gray-500">No status data available yet.</div>;
  }

  // Generate pagination buttons
  const renderPaginationButtons = () => {
    const buttons = [];
    
    // Previous button
    buttons.push(
      <button
        key="prev"
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
      >
        Previous
      </button>
    );
    
    // Page buttons - show current page, first, last and some neighbors
    const pageNumbers = [];
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Show ellipsis if current page is more than 3
      if (currentPage > 3) {
        pageNumbers.push('...');
      }
      
      // Show neighbor pages
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Show ellipsis if current page is less than totalPages - 2
      if (currentPage < totalPages - 2) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      pageNumbers.push(totalPages);
    }
    
    // Add page number buttons
    pageNumbers.forEach((pageNumber, index) => {
      if (pageNumber === '...') {
        buttons.push(
          <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
            ...
          </span>
        );
      } else {
        buttons.push(
          <button
            key={`page-${pageNumber}`}
            onClick={() => handlePageChange(pageNumber)}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
              currentPage === pageNumber
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {pageNumber}
          </button>
        );
      }
    });
    
    // Next button
    buttons.push(
      <button
        key="next"
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
      >
        Next
      </button>
    );
    
    return buttons;
  };

  return (
    <div>
      {/* Current Status */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Status</dt>
            <dd className="mt-1 flex items-center">
              <span className={`px-2 py-1 text-sm rounded-full ${
                currentStatus.is_up ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {currentStatus.is_up ? 'Up' : 'Down'}
              </span>
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Status Code</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {currentStatus.status_code || 'N/A'}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Response Time</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {(currentStatus.response_time * 1000).toFixed(2)} ms
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Last Checked</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(currentStatus.timestamp).toLocaleString()}
            </dd>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <Line options={chartOptions} data={chartData} />
      </div>
      
      {/* Error Message */}
      {currentStatus.error_message && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {currentStatus.error_message}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Status History Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Status History</h3>
          <div className="flex items-center">
            <label htmlFor="pageSize" className="mr-2 text-sm text-gray-700">Rows per page:</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {statuses.map(status => (
            <li key={status.id} className="px-4 py-4 sm:px-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    status.is_up ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {status.is_up ? 'Up' : 'Down'}
                  </span>
                </div>
                <div className="text-sm text-gray-900">
                  Status: {status.status_code || 'N/A'}
                </div>
                <div className="text-sm text-gray-900">
                  Time: {(status.response_time * 1000).toFixed(2)} ms
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(status.timestamp).toLocaleString()}
                </div>
              </div>
              {status.error_message && (
                <div className="mt-2 text-sm text-red-500">
                  Error: {status.error_message}
                </div>
              )}
            </li>
          ))}
        </ul>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, allStatuses.length)}
                  </span>{' '}
                  of <span className="font-medium">{allStatuses.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {renderPaginationButtons()}
                </nav>
              </div>
            </div>
            <div className="flex sm:hidden">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrlDetail;