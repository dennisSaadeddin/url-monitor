from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import URL, URLStatus, SubsequentRequest
from network_monitor import NetworkMonitor
from datetime import datetime
from flask_swagger_ui import get_swaggerui_blueprint
from swagger import get_swagger_dict

# Create the database tables
Base.metadata.create_all(bind=engine)

# Initialize Flask app
app = Flask(__name__, static_folder='static/build')
CORS(app)  # Enable CORS for all routes

# Configure Swagger UI
SWAGGER_URL = '/api/docs'  # URL for exposing Swagger UI
API_URL = '/api/swagger.json'  # Our API url (can be any arbitrary URL)

# Call factory function to create our blueprint
swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
        'app_name': "URL Monitor API",
        'validatorUrl': None,  # Disable Swagger validator
    }
)

# Register the Swagger UI blueprint
app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

# Create NetworkMonitor instance
db = SessionLocal()
monitor = NetworkMonitor(db)

@app.route(API_URL)
def swagger_json():
    """Return the Swagger specification."""
    return jsonify(get_swagger_dict(app))

@app.route('/api/urls', methods=['GET'])
def get_urls():
    """Get all URLs being monitored."""
    db = SessionLocal()
    
    # Get query parameters for filtering
    url_type = request.args.get('type', 'monitored')  # 'monitored', 'one-time', or 'all'
    
    # Build the query - handle the case where is_one_time might not exist yet
    query = db.query(URL)
    try:
        if url_type == 'monitored':
            query = query.filter(URL.is_one_time == False)
        elif url_type == 'one-time':
            query = query.filter(URL.is_one_time == True)
        # If 'all', no filter needed
    except Exception as e:
        # If column doesn't exist yet, return all URLs for now
        pass
    
    urls = query.all()
    
    # Format the URL data, handling the case where is_one_time might not exist
    url_list = []
    for url in urls:
        url_dict = {
            'id': url.id,
            'url': url.url,
            'name': url.name,
            'is_active': url.is_active,
            'check_frequency': url.check_frequency,
            'created_at': url.created_at,
            'updated_at': url.updated_at
        }
        # Try to include is_one_time if it exists
        try:
            url_dict['is_one_time'] = url.is_one_time
        except:
            url_dict['is_one_time'] = False  # Default value
        
        url_list.append(url_dict)
    
    return jsonify(url_list)

@app.route('/api/urls', methods=['POST'])
def add_url():
    """Add a new URL to monitor."""
    data = request.json
    if not data or not data.get('url'):
        return jsonify({'error': 'URL is required'}), 400
    
    db = SessionLocal()
    try:
        # Check if one_time flag is present
        one_time = data.get('one_time', False)
        
        # Check if URL already exists in monitoring (only for non-one-time checks)
        if not one_time:
            existing_url = db.query(URL).filter(
                URL.url == data['url'],
                URL.is_one_time == False
            ).first()
            
            if existing_url:
                return jsonify({
                    'error': 'This URL is already being monitored',
                    'existing_url_id': existing_url.id
                }), 409  # 409 Conflict status code
        
        # Create the URL record (now we store all URLs including one-time checks)
        url = URL(
            url=data['url'],
            name=data.get('name', data['url']),
            is_active=not one_time,  # One-time URLs are not actively monitored
            check_frequency=data.get('check_frequency', 60),
            is_one_time=one_time
        )
        db.add(url)
        db.commit()
        db.refresh(url)
        
        # Immediately check the URL
        status = monitor.check_url(url.id, url.url)
        
        # For one-time checks, we return the results immediately
        if one_time:
            # Wait a moment to let subsequent request processing complete
            import time
            time.sleep(2)
            
            # Get the subsequent requests associated with this check
            subsequent_requests = db.query(SubsequentRequest).filter(
                SubsequentRequest.url_id == url.id
            ).all()
            
            # Get the status we just created
            latest_status = db.query(URLStatus).filter(
                URLStatus.url_id == url.id
            ).order_by(URLStatus.timestamp.desc()).first()
            
            # Return the results
            return jsonify({
                'id': url.id,
                'url': url.url,
                'name': url.name,
                'is_one_time': url.is_one_time,
                'status': {
                    'status_code': latest_status.status_code,
                    'response_time': latest_status.response_time,
                    'is_up': latest_status.is_up,
                    'error_message': latest_status.error_message,
                    'timestamp': latest_status.timestamp.isoformat() if latest_status.timestamp else datetime.now().isoformat()
                },
                'subsequent_requests': [{
                    'id': req.id,
                    'target_url': req.target_url,
                    'ip_address': req.ip_address,
                    'resource_type': req.resource_type,
                    'state_type': req.state_type,
                    'protocol': req.protocol,
                    'timestamp': req.timestamp.isoformat() if req.timestamp else None
                } for req in subsequent_requests]
            })
        
        # For regular monitoring, start monitoring if URL is active
        if url.is_active:
            monitor.start_monitoring(url)
            
        return jsonify({
            'id': url.id,
            'url': url.url,
            'name': url.name,
            'is_active': url.is_active,
            'check_frequency': url.check_frequency,
            'is_one_time': url.is_one_time,
            'created_at': url.created_at,
            'updated_at': url.updated_at
        }), 201
    finally:
        db.close()

@app.route('/api/urls/<int:url_id>', methods=['PUT'])
def update_url(url_id):
    """Update a URL's monitoring settings."""
    data = request.json
    db = SessionLocal()
    
    url = db.query(URL).filter(URL.id == url_id).first()
    if not url:
        return jsonify({'error': 'URL not found'}), 404
    
    # Update URL fields
    if 'name' in data:
        url.name = data['name']
    if 'check_frequency' in data:
        url.check_frequency = data['check_frequency']
    if 'is_active' in data:
        url.is_active = data['is_active']
    
    db.commit()
    db.refresh(url)
    
    # Update monitoring
    if url.is_active:
        monitor.update_frequency(url)
    else:
        monitor.stop_monitoring(url.id)
    
    return jsonify({
        'id': url.id,
        'url': url.url,
        'name': url.name,
        'is_active': url.is_active,
        'check_frequency': url.check_frequency,
        'created_at': url.created_at,
        'updated_at': url.updated_at
    })

@app.route('/api/urls/<int:url_id>', methods=['DELETE'])
def delete_url(url_id):
    """Delete a URL from monitoring and all related data."""
    db = SessionLocal()
    
    try:
        # Begin transaction
        url = db.query(URL).filter(URL.id == url_id).first()
        if not url:
            return jsonify({'error': 'URL not found'}), 404
        
        # Stop monitoring if it's an active URL
        monitor.stop_monitoring(url.id)
        
        # Get counts before deletion for reporting
        status_count = db.query(URLStatus).filter(URLStatus.url_id == url_id).count()
        subsequent_count = db.query(SubsequentRequest).filter(SubsequentRequest.url_id == url_id).count()
        
        # Delete all related data within a transaction
        db.query(URLStatus).filter(URLStatus.url_id == url_id).delete()
        db.query(SubsequentRequest).filter(SubsequentRequest.url_id == url_id).delete()
        
        # Delete the URL itself
        db.delete(url)
        
        # Commit all changes
        db.commit()
        
        return jsonify({
            'message': f'URL "{url.name}" deleted successfully',
            'details': {
                'url_id': url_id,
                'deleted_status_records': status_count,
                'deleted_subsequent_requests': subsequent_count
            }
        })
    except Exception as e:
        # Roll back in case of error
        db.rollback()
        return jsonify({'error': f'Failed to delete URL: {str(e)}'}), 500
    finally:
        # Always close the session
        db.close()

@app.route('/api/urls/<int:url_id>/status', methods=['GET'])
def get_url_status(url_id):
    """Get the status history of a URL."""
    db = SessionLocal()
    
    # Check if URL exists
    url = db.query(URL).filter(URL.id == url_id).first()
    if not url:
        return jsonify({'error': 'URL not found'}), 404
    
    # Get latest status
    statuses = db.query(URLStatus).filter(
        URLStatus.url_id == url_id
    ).order_by(URLStatus.timestamp.desc()).limit(100).all()
    
    return jsonify([{
        'id': status.id,
        'status_code': status.status_code,
        'response_time': status.response_time,
        'is_up': status.is_up,
        'timestamp': status.timestamp,
        'error_message': status.error_message
    } for status in statuses])

@app.route('/api/urls/<int:url_id>/subsequent-requests', methods=['GET'])
def get_subsequent_requests(url_id):
    """Get the subsequent requests made after accessing a URL."""
    db = SessionLocal()
    
    # Check if URL exists
    url = db.query(URL).filter(URL.id == url_id).first()
    if not url:
        return jsonify({'error': 'URL not found'}), 404
    
    # Get query parameters for filtering
    resource_type = request.args.get('resource_type')
    state_type = request.args.get('state_type')
    protocol = request.args.get('protocol')
    
    # Build the query
    query = db.query(SubsequentRequest).filter(SubsequentRequest.url_id == url_id)
    
    # Apply filters if provided
    if resource_type:
        query = query.filter(SubsequentRequest.resource_type == resource_type)
    if state_type:
        query = query.filter(SubsequentRequest.state_type == state_type)
    if protocol:
        query = query.filter(SubsequentRequest.protocol == protocol)
    
    # Execute the query
    requests = query.order_by(SubsequentRequest.timestamp.desc()).all()
    
    return jsonify([{
        'id': req.id,
        'target_url': req.target_url,
        'ip_address': req.ip_address,
        'resource_type': req.resource_type,
        'state_type': req.state_type,
        'protocol': req.protocol,
        'timestamp': req.timestamp
    } for req in requests])

@app.route('/api/subsequent-requests/filters', methods=['GET'])
def get_filter_options():
    """Get available filter options for subsequent requests."""
    db = SessionLocal()
    
    # Get distinct values for each filter category
    resource_types = [r[0] for r in db.query(SubsequentRequest.resource_type).distinct().all() if r[0] != 'Unknown']
    state_types = [s[0] for s in db.query(SubsequentRequest.state_type).distinct().all() if s[0] != 'Unknown']
    protocols = [p[0] for p in db.query(SubsequentRequest.protocol).distinct().all() if p[0] != 'Unknown']
    
    return jsonify({
        'resource_types': resource_types,
        'state_types': state_types,
        'protocols': protocols
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve the React frontend."""
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Initialize monitoring for all active URLs
    db = SessionLocal()
    active_urls = db.query(URL).filter(URL.is_active == True).all()
    for url in active_urls:
        monitor.start_monitoring(url)
    
    # Make sure Flask is listening on all interfaces with verbose output
    print("Starting Flask server on http://localhost:5000")
    print("API docs available at http://localhost:5000/api/docs")
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)