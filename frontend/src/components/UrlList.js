import React, { useState } from 'react';
import UrlForm from './UrlForm';

const UrlList = ({ urls, onSelect, onDelete, onUpdate, selectedUrlId, isOneTime = false }) => {
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState({
    isShowing: false,
    urlToDelete: null,
    isDeleting: false
  });

  // Handle edit button click
  const handleEdit = (url) => {
    setEditingId(url.id);
  };

  // Handle update submission
  const handleUpdate = async (data) => {
    if (!editingId) return { success: false };
    
    const result = await onUpdate(editingId, data);
    if (result.success) {
      setEditingId(null);
    }
    return result;
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Handle delete button click - show confirmation dialog
  const showDeleteConfirmation = (e, url) => {
    e.stopPropagation(); // Prevent row selection
    setDeleteConfirmState({
      isShowing: true,
      urlToDelete: url,
      isDeleting: false
    });
  };

  // Handle delete confirmation
  const confirmDelete = async () => {
    if (!deleteConfirmState.urlToDelete) return;
    
    try {
      setDeleteConfirmState(prev => ({ ...prev, isDeleting: true }));
      
      const result = await onDelete(deleteConfirmState.urlToDelete.id);
      
      if (result.success) {
        // Close dialog on success
        setDeleteConfirmState({
          isShowing: false,
          urlToDelete: null,
          isDeleting: false
        });
      } else {
        // Keep dialog open but update state on error
        setDeleteConfirmState(prev => ({
          ...prev,
          isDeleting: false,
          error: result.error
        }));
      }
    } catch (error) {
      setDeleteConfirmState(prev => ({
        ...prev,
        isDeleting: false,
        error: 'An unexpected error occurred'
      }));
    }
  };

  // Handle cancel delete
  const cancelDelete = () => {
    setDeleteConfirmState({
      isShowing: false,
      urlToDelete: null,
      isDeleting: false
    });
  };

  // If no URLs to display
  if (urls.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        {isOneTime 
          ? "No one-time URL checks have been performed yet."
          : "No URLs being monitored. Add one to get started!"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              URL
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {isOneTime ? "Check Date" : "Status"}
            </th>
            {!isOneTime && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequency
              </th>
            )}
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {urls.map((url) => (
            <React.Fragment key={url.id}>
              {editingId === url.id ? (
                <tr className="bg-blue-50">
                  <td colSpan={isOneTime ? "4" : "5"} className="px-6 py-4">
                    <div className="mb-2 flex justify-between">
                      <h3 className="font-medium">Edit URL</h3>
                      <button 
                        onClick={handleCancelEdit}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                    <UrlForm 
                      onSubmit={handleUpdate}
                      initialData={url}
                    />
                  </td>
                </tr>
              ) : (
                <tr 
                  className={`hover:bg-gray-50 cursor-pointer ${selectedUrlId === url.id ? 'bg-blue-50' : ''}`}
                  onClick={() => onSelect(url)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {url.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 truncate max-w-[200px]">
                      {url.url}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isOneTime ? (
                      <div className="text-sm text-gray-500">
                        {new Date(url.created_at).toLocaleString()}
                      </div>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        url.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {url.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  {!isOneTime && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {url.check_frequency}s
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* For one-time URLs, we don't allow editing */}
                    {!isOneTime && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(url);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={(e) => showDeleteConfirmation(e, url)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmState.isShowing && deleteConfirmState.urlToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete "{deleteConfirmState.urlToDelete.name}"?
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">This will permanently delete:</p>
                <ul className="list-disc list-inside text-xs text-gray-600">
                  <li>The URL configuration</li>
                  <li>All status history records</li>
                  <li>All subsequent request data</li>
                </ul>
              </div>
              {deleteConfirmState.error && (
                <div className="mt-3 p-2 bg-red-50 text-red-600 text-sm rounded">
                  {deleteConfirmState.error}
                </div>
              )}
            </div>
            
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                disabled={deleteConfirmState.isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmState.isDeleting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none disabled:opacity-50"
              >
                {deleteConfirmState.isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete URL'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlList;