<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# URL Monitor Project

This is a URL monitoring application with a Flask backend and React frontend.

## Project Structure
- `backend/` - Python Flask API for URL monitoring
- `frontend/` - React application for the web UI

## Technologies Used
- Backend: Flask, SQLAlchemy, APScheduler, python-dotenv
- Frontend: React, ChartJS, TailwindCSS
- Database: SQLite
- Notifications: Slack Webhooks
- Network Analysis: tcpdump/tshark (for subsequent requests capture)

## Features
- URL monitoring with configurable check frequencies
- Response time and status code tracking
- Performance visualization with charts
- Slack alerting for website downtime
- Recovery notifications when websites come back online
- One-time URL checks without continuous monitoring
- Analysis of subsequent network requests made by websites
- Resource categorization (JavaScript, CSS, Images, HTML)
- Filtering of subsequent requests by type, protocol, and state

## Important Files
### Backend
- `app.py` - Main Flask application with API endpoints
- `models.py` - Database models including the URL model with alert fields
- `network_monitor.py` - URL monitoring functionality
- `alert_manager.py` - Slack alerting system
- `migrate_alerts.py` - Database migration for alert functionality
- `swagger.py` - API documentation with Swagger UI
- `database.py` - Database connection management
- `reset_db.py` - Database initialization utility

### Frontend
- `src/components/AlertSettings.jsx` - React component for configuring alerts
- `src/components/UrlDetail.js` - URL detail view that includes the AlertSettings component
- `src/components/SubsequentRequestsView.js` - Component for viewing network requests
- `src/components/URLList.jsx` - Component for listing monitored and one-time URLs
- `src/App.js` - Main application component with routing and state management

## API Endpoints
- GET `/api/urls` - List all URLs (with optional type filter for 'monitored', 'one-time', or 'all')
- POST `/api/urls` - Add a new URL (with support for one-time checks)
- PUT `/api/urls/<id>` - Update URL settings
- DELETE `/api/urls/<id>` - Delete URL and associated data
- PUT `/api/urls/<id>/alerts` - Update alert settings for a URL
- GET `/api/urls/<id>/status` - Get status history of a URL
- GET `/api/urls/<id>/subsequent-requests` - Get subsequent requests for a URL
- GET `/api/docs` - Swagger UI API documentation