# URL Monitor

A web application for monitoring website availability and performance. The application allows you to add URLs to monitor, track their status, and view performance metrics over time.

## Quick Start Guide for New Users

If you've just cloned this repository and want to get started quickly:

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/yourusername/url-monitor.git
cd url-monitor

# 1. Set up the backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
cd backend
pip install -r requirements.txt
python reset_db.py  # When prompted, type 'y' to confirm

# Configure Slack alerts (optional)
# Create a .env file in the backend directory:
echo "SLACK_WEBHOOK_URL=your_slack_webhook_url" >> .env
echo "ALERT_FAILURE_THRESHOLD=2" >> .env
echo "ALERT_COOLDOWN_MINUTES=15" >> .env

# 2. Set up the frontend
cd ../frontend
npm install

# 3. Run the application (Development Mode - Two terminals needed)
# Terminal 1: Backend
cd /path/to/url-monitor/backend
source ../venv/bin/activate  # On Windows: ..\venv\Scripts\activate
python app.py

# Terminal 2: Frontend
cd /path/to/url-monitor/frontend
npm start

# Access the app at http://localhost:3000
```

For production deployment, build the frontend and serve it through the Flask backend:
```bash
cd frontend
npm run build
cd ../backend
python app.py
# Access at http://localhost:5000
```

## Technologies Used

- Backend: Flask, SQLAlchemy, APScheduler, Packet Capture (tcpdump/tshark)
- Frontend: React, ChartJS, Tailwind CSS
- Database: SQLite
- Documentation: Swagger UI with OpenAPI 3.0
- Notifications: Slack Webhooks

## Features

- Monitor multiple URLs with customizable check frequencies
- Track response times and status codes
- Visualize performance with charts
- Enable/disable monitoring for specific URLs
- View detailed status history
- Track and analyze subsequent requests made after accessing monitored URLs
- Filter subsequent requests by resource type, state type, and protocol
- Perform one-time URL checks without adding to continuous monitoring
- Toggle between monitored URLs and one-time URL checks
- API documentation with Swagger UI
- **Slack alerting** when websites are down for consecutive checks
- Configurable alert thresholds and cooldown periods
- Recovery notifications when websites come back online

## Project Structure

- `backend/` - Python Flask API for URL monitoring
  - `app.py` - Main Flask application
  - `database.py` - Database setup with SQLAlchemy
  - `models.py` - Database models
  - `network_monitor.py` - URL monitoring functionality
  - `alert_manager.py` - Slack alerting system
  - `migrate_alerts.py` - Alert system migration script
  - `swagger.py` - Swagger documentation setup
  - `reset_db.py` - Database reset utility
  - `requirements.txt` - Python dependencies

- `frontend/` - React application for the web UI
  - `src/` - React source code
  - `public/` - Static assets
  - `src/components/AlertSettings.jsx` - Slack alert configuration UI

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- For packet capture: admin privileges and tcpdump/tshark (optional, for subsequent requests feature)
- For alerting: Slack workspace with webhook URL

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Configure Slack alerts (optional):
   ```
   # Create a .env file with your Slack webhook URL
   echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL" > .env
   echo "ALERT_FAILURE_THRESHOLD=2" >> .env
   echo "ALERT_COOLDOWN_MINUTES=15" >> .env
   ```

5. Run the database migration script:
   ```
   python migrate_alerts.py
   ```

6. Run the Flask application:
   ```
   python app.py
   ```

The backend server will start at http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

The React development server will start at http://localhost:3000

### Building for Production

To build the frontend for production and have it served by the Flask backend:

1. Build the React application:
   ```
   cd frontend
   npm run build
   ```

2. The build output will be automatically copied to the backend's static/build directory.

3. Run the Flask application:
   ```
   cd ../backend
   python app.py
   ```

4. Access the application at http://localhost:5000

## Database Management

To reset the database and start with a clean slate:

```
./reset_database.sh
```

This will delete all existing data and create a new database with fresh tables.

## API Documentation

The API is documented using Swagger UI, which provides an interactive interface to explore and test the endpoints.

Access the documentation at: http://localhost:5000/api/docs

## How to Use

1. Start both the backend and frontend servers
2. Access the application in your browser
3. Add URLs to monitor using the form
   - Toggle "One-time check only" to perform a single URL check without continued monitoring
4. For regular monitored URLs:
   - Click on a URL in the list to see its detailed status information
   - Enable Slack alerts in the Alert Settings panel at the top of the URL detail page
   - Configure recovery notifications as needed
   - Switch to the "Subsequent URL Calls" tab to see all secondary requests made by the monitored URL
   - Filter the subsequent requests by resource type, state type, or protocol
   - Edit or delete URLs using the buttons in the URL list
5. For one-time checks:
   - View results immediately in the sidebar
   - Switch between "Monitored URLs" and "One-time URL Checks" tabs to see all checks
6. For API users and developers:
   - Use the Swagger UI documentation at `/api/docs` to explore available endpoints

## Slack Alerts

The URL Monitor includes a Slack alerting system that can notify you when monitored websites go down:

- **Alert Triggering**: Alerts are sent when a website is down for two consecutive checks (configurable)
- **Recovery Notifications**: Optional notifications when a website comes back online after downtime
- **Throttling**: Cooldown period between alerts to prevent notification spam (default: 15 minutes)
- **Per-URL Configuration**: Enable/disable alerts for each URL individually

To set up Slack alerts:

1. Create a Slack app at https://api.slack.com/apps
2. Enable Incoming Webhooks and create a webhook URL
3. Add the webhook URL to your `.env` file as `SLACK_WEBHOOK_URL`
4. Restart the backend server
5. Enable alerts for specific URLs through the web interface