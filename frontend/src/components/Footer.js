import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import './MarkdownStyles.css';

const Footer = () => {
  const [readmeContent, setReadmeContent] = useState(null);
  const [showReadmeModal, setShowReadmeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const openSwaggerDocs = () => {
    // Updated to explicitly use the full URL for Swagger docs
    window.open('http://localhost:5000/api/docs/', '_blank');
  };

  const openDocumentation = async () => {
    try {
      setLoading(true);
      // Fetch README.md content from public directory
      const response = await axios.get('/README.md');
      setReadmeContent(response.data);
      setShowReadmeModal(true);
    } catch (error) {
      console.error('Error loading documentation:', error);
      // Fallback - provide a link to the GitHub repo README
      window.open('https://github.com/yourusername/url-monitor/blob/main/README.md', '_blank');
    } finally {
      setLoading(false);
    }
  };

  const closeReadmeModal = () => {
    setShowReadmeModal(false);
  };

  return (
    <>
      <footer className="bg-gray-800 text-white p-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex space-x-4 mb-4 md:mb-0">
            <button
              onClick={openSwaggerDocs}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-150"
            >
              Swagger docs
            </button>
            <button
              onClick={openDocumentation}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition duration-150"
            >
              Documentation
            </button>
          </div>
          <div className="text-center md:text-right">
            <p>Made with ❤️ by Webninja Software Creation</p>
          </div>
        </div>
      </footer>

      {/* README.md Modal */}
      {showReadmeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-5xl w-full h-4/5 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
              <h2 className="text-xl font-bold">URL Monitor Documentation</h2>
              <button
                onClick={closeReadmeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="markdown-content">
              {loading ? (
                <div className="flex justify-center my-8">
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {readmeContent || 'Failed to load documentation'}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;