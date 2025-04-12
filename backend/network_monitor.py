import requests
import time
from datetime import datetime
import socket
import subprocess
import json
import re
import threading
from urllib.parse import urlparse, urljoin
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from models import URL, URLStatus, SubsequentRequest

class NetworkMonitor:
    """Class for monitoring URLs and recording their statuses."""
    def __init__(self, db: Session):
        self.db = db
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()
        self.jobs = {}

    def _url_exists_for_monitor(self, url_id, target_url):
        """Check if a subsequent request URL already exists for this monitored URL."""
        existing = self.db.query(SubsequentRequest).filter(
            SubsequentRequest.url_id == url_id,
            SubsequentRequest.target_url == target_url
        ).first()
        return existing is not None

    def check_url(self, url_id: int, url: str):
        """Check if a URL is up and record its status."""
        try:
            # Try to use tcpdump capture in a separate thread
            try:
                capture_thread = threading.Thread(
                    target=self.capture_subsequent_requests,
                    args=(url_id, url)
                )
                capture_thread.start()
                
                # Wait briefly to ensure tcpdump starts
                time.sleep(0.5)
            except Exception as e:
                print(f"Could not start packet capture: {str(e)}. Will use fallback method.")
                # Use alternative method that doesn't require tcpdump
                fallback_thread = threading.Thread(
                    target=self.fallback_capture_method,
                    args=(url_id, url)
                )
                fallback_thread.start()
            
            # Make the actual request
            start_time = time.time()
            response = requests.get(url, timeout=10)
            response_time = time.time() - start_time
            
            status = URLStatus(
                url_id=url_id,
                status_code=response.status_code,
                response_time=response_time,
                is_up=response.status_code < 400,
            )
            
            # Wait a bit longer to capture subsequent requests
            time.sleep(2)
            
            # Capture thread will end itself
        except Exception as e:
            status = URLStatus(
                url_id=url_id,
                status_code=0,
                response_time=0,
                is_up=False,
                error_message=str(e)
            )
        
        self.db.add(status)
        self.db.commit()
        return status

    def fallback_capture_method(self, url_id, url):
        """
        Fallback method to capture subsequent requests without tcpdump.
        Uses Python's requests library with session to track requests.
        This won't capture all subsequent requests but provides basic functionality.
        """
        try:
            from bs4 import BeautifulSoup
            
            # Handle URLs without scheme
            if url and isinstance(url, str):
                if not url.startswith(('http://', 'https://')):
                    url = 'http://' + url
            
            # Parse the URL properly
            parsed_url = urlparse(url)
            if not parsed_url.netloc:
                print(f"Invalid URL format even after fixing: {url}")
                # Still create a placeholder entry
                if not self._url_exists_for_monitor(url_id, url):
                    placeholder_req = SubsequentRequest(
                        url_id=url_id,
                        target_url=url,
                        ip_address="Invalid URL",
                        resource_type="Unknown",
                        state_type="Unknown",
                        protocol="Unknown",
                        timestamp=datetime.now()
                    )
                    self.db.add(placeholder_req)
                    self.db.commit()
                return
                
            hostname = parsed_url.netloc
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            # Create a session to maintain cookies
            session = requests.Session()
            
            try:
                # Make the initial request with timeout and proper error handling
                response = session.get(url, timeout=10)
                content_type = response.headers.get('Content-Type', '').lower()
                
                if 'text/html' in content_type:
                    # Parse the HTML content
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Find all resources in the HTML
                    resources = []
                    
                    # Scripts
                    for script in soup.find_all('script', src=True):
                        try:
                            script_url = urljoin(base_url, script['src'])
                            resources.append({
                                'url': script_url,
                                'resource_type': 'JavaScript',
                                'state_type': 'Stateless',
                                'protocol': 'TCP'
                            })
                        except Exception as e:
                            print(f"Error processing script: {str(e)}")
                    
                    # Stylesheets
                    for link in soup.find_all('link', rel='stylesheet'):
                        try:
                            if link.get('href'):
                                css_url = urljoin(base_url, link['href'])
                                resources.append({
                                    'url': css_url,
                                    'resource_type': 'Stylesheet',
                                    'state_type': 'Stateless',
                                    'protocol': 'TCP'
                                })
                        except Exception as e:
                            print(f"Error processing stylesheet: {str(e)}")
                    
                    # Images
                    for img in soup.find_all('img', src=True):
                        try:
                            img_url = urljoin(base_url, img['src'])
                            resources.append({
                                'url': img_url,
                                'resource_type': 'Image',
                                'state_type': 'Stateless',
                                'protocol': 'TCP'
                            })
                        except Exception as e:
                            print(f"Error processing image: {str(e)}")
                    
                    # If no resources found, add at least the main URL
                    if not resources:
                        resources.append({
                            'url': url,
                            'resource_type': 'HTML',
                            'state_type': 'Stateful',
                            'protocol': 'TCP'
                        })
                    
                    # Track how many new resources were actually added
                    new_resources_count = 0
                    
                    # Save all found resources to database if they don't already exist
                    for resource in resources:
                        try:
                            # Skip if this URL already exists for this monitored URL
                            if self._url_exists_for_monitor(url_id, resource['url']):
                                continue
                                
                            # Get IP address
                            resource_url = urlparse(resource['url'])
                            resource_hostname = resource_url.netloc
                            try:
                                ip_address = socket.gethostbyname(resource_hostname) if resource_hostname else 'Unknown'
                            except:
                                ip_address = 'Unknown'
                            
                            # Create database entry
                            subsequent_req = SubsequentRequest(
                                url_id=url_id,
                                target_url=resource['url'],
                                ip_address=ip_address,
                                resource_type=resource['resource_type'],
                                state_type=resource['state_type'],
                                protocol=resource['protocol'],
                                timestamp=datetime.now()
                            )
                            self.db.add(subsequent_req)
                            new_resources_count += 1
                        except Exception as e:
                            print(f"Error processing resource {resource['url']}: {str(e)}")
                    
                    if new_resources_count > 0:
                        self.db.commit()
                        print(f"Fallback method found {len(resources)} resources, added {new_resources_count} new ones")
                    else:
                        print(f"Fallback method found {len(resources)} resources, all already existed")
                else:
                    # Not HTML content, just add the main URL if it doesn't already exist
                    if not self._url_exists_for_monitor(url_id, url):
                        subsequent_req = SubsequentRequest(
                            url_id=url_id,
                            target_url=url,
                            ip_address="Unknown",
                            resource_type=self._guess_resource_type(url, content_type),
                            state_type="Unknown",
                            protocol="TCP",
                            timestamp=datetime.now()
                        )
                        self.db.add(subsequent_req)
                        self.db.commit()
            except requests.RequestException as e:
                print(f"Request failed in fallback method: {str(e)}")
                # Add a placeholder entry if it doesn't already exist
                if not self._url_exists_for_monitor(url_id, url):
                    subsequent_req = SubsequentRequest(
                        url_id=url_id,
                        target_url=url,
                        ip_address="Request Failed",
                        resource_type="Unknown",
                        state_type="Unknown",
                        protocol="Unknown",
                        timestamp=datetime.now()
                    )
                    self.db.add(subsequent_req)
                    self.db.commit()
                
        except ImportError:
            print("BeautifulSoup not installed. Install with 'pip install beautifulsoup4' for fallback method.")
            # Create a placeholder entry anyway if it doesn't already exist
            try:
                if not self._url_exists_for_monitor(url_id, url):
                    subsequent_req = SubsequentRequest(
                        url_id=url_id,
                        target_url=url,
                        ip_address="Dependencies Missing",
                        resource_type="Unknown",
                        state_type="Unknown",
                        protocol="Unknown",
                        timestamp=datetime.now()
                    )
                    self.db.add(subsequent_req)
                    self.db.commit()
            except:
                pass
        except Exception as e:
            print(f"Error in fallback capture method: {str(e)}")
            # Create a placeholder entry if it doesn't already exist
            try:
                if not self._url_exists_for_monitor(url_id, url):
                    subsequent_req = SubsequentRequest(
                        url_id=url_id,
                        target_url=url,
                        ip_address="Error",
                        resource_type="Unknown",
                        state_type="Unknown",
                        protocol="Unknown",
                        timestamp=datetime.now()
                    )
                    self.db.add(subsequent_req)
                    self.db.commit()
            except:
                pass
                
    def _guess_resource_type(self, url, content_type):
        """Helper method to guess resource type from URL and content-type."""
        url_lower = url.lower()
        
        # First check content type
        if content_type:
            if 'javascript' in content_type:
                return 'JavaScript'
            elif 'css' in content_type:
                return 'Stylesheet'
            elif 'image/' in content_type:
                return 'Image'
            elif 'html' in content_type:
                return 'HTML'
        
        # Then check URL extension
        if url_lower.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            return 'Image'
        elif url_lower.endswith('.css'):
            return 'Stylesheet'
        elif url_lower.endswith('.js'):
            return 'JavaScript'
        elif url_lower.endswith(('.html', '.htm')):
            return 'HTML'
            
        return 'Other'

    def capture_subsequent_requests(self, url_id, url):
        """Capture and record subsequent requests made after accessing a URL."""
        try:
            # Validate the URL first
            if not url or not isinstance(url, str):
                print(f"Invalid URL type provided: {type(url)}")
                raise ValueError("Invalid URL provided")
            
            # Use urlparse for reliable URL parsing
            parsed_url = urlparse(url)
            
            # Ensure the URL has a scheme and netloc
            if not parsed_url.scheme or not parsed_url.netloc:
                print(f"Invalid URL format (missing scheme or netloc): {url}")
                # Instead of raising, go directly to fallback
                self.fallback_capture_method(url_id, url)
                return
            
            hostname = parsed_url.netloc
            
            # Try to get IP address, but don't fail if we can't
            try:
                ip_address = socket.gethostbyname(hostname)
            except socket.gaierror as e:
                print(f"Could not resolve hostname '{hostname}': {str(e)}")
                # Go to fallback method instead of failing
                self.fallback_capture_method(url_id, url)
                return
            
            # Create temporary file using tempfile module
            import os, tempfile
            temp_dir = tempfile.gettempdir()  # Get system's temp directory
            output_file = os.path.join(temp_dir, f"tcpdump_{url_id}_{int(time.time())}.pcap")
            
            # Check if tcpdump is available (this is common source of errors)
            try:
                which_result = subprocess.run(["which", "tcpdump"], capture_output=True, text=True)
                if which_result.returncode != 0:
                    print("tcpdump not found in PATH, using fallback method")
                    self.fallback_capture_method(url_id, url)
                    return
            except Exception:
                print("Could not check for tcpdump, using fallback method")
                self.fallback_capture_method(url_id, url) 
                return
                
            # Run tcpdump to capture network traffic
            cmd = [
                "tcpdump", 
                "-n", "-i", "any",
                "-c", "50",  # Limit to 50 packets
                "-A",        # ASCII output
                f"host {ip_address}", 
                "-w", output_file
            ]
            
            try:
                # Run tcpdump for a short time
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                time.sleep(3)  # Capture for 3 seconds
                process.terminate()
                
                # Check if the output file exists and is not empty
                if not os.path.exists(output_file) or os.path.getsize(output_file) == 0:
                    print(f"tcpdump did not create valid output file at {output_file}")
                    self.fallback_capture_method(url_id, url)
                    return
                    
                # Process the captured data
                parsed_requests = self.parse_capture_file(output_file)
                
                # If no requests were parsed, use fallback
                if not parsed_requests:
                    print("No requests parsed from tcpdump output, using fallback")
                    self.fallback_capture_method(url_id, url)
                    return
                
                # Count new entries
                new_records_count = 0
                
                # Store in database (only if not already exists)
                for req in parsed_requests:
                    target_url = req.get('url', 'Unknown')
                    # Skip if this URL already exists for this monitored URL
                    if self._url_exists_for_monitor(url_id, target_url):
                        continue
                        
                    subsequent_req = SubsequentRequest(
                        url_id=url_id,
                        target_url=target_url,
                        ip_address=req.get('ip', 'Unknown'),
                        resource_type=req.get('resource_type', 'Unknown'),
                        state_type=req.get('state_type', 'Unknown'),
                        protocol=req.get('protocol', 'Unknown'),
                        timestamp=datetime.now()
                    )
                    self.db.add(subsequent_req)
                    new_records_count += 1
                
                # Only commit if we added new records
                if new_records_count > 0:
                    self.db.commit()
                    print(f"Successfully captured {len(parsed_requests)} subsequent requests, added {new_records_count} new ones")
                else:
                    print(f"Found {len(parsed_requests)} subsequent requests, but all already existed")
                
            except Exception as e:
                print(f"Error during tcpdump capture: {str(e)}")
                # Cleanup any partial output file
                try:
                    if os.path.exists(output_file):
                        os.remove(output_file)
                except:
                    pass
                # Use fallback method
                self.fallback_capture_method(url_id, url)
                
        except Exception as e:
            print(f"Error in capture_subsequent_requests: {str(e)}")
            # Use fallback instead of re-raising
            try:
                self.fallback_capture_method(url_id, url)
            except Exception as fallback_error:
                print(f"Fallback method also failed: {str(fallback_error)}")
                # Create at least one entry to avoid empty results
                try:
                    fallback_req = SubsequentRequest(
                        url_id=url_id,
                        target_url=url,
                        ip_address="Could not determine",
                        resource_type="Unknown",
                        state_type="Unknown",
                        protocol="Unknown",
                        timestamp=datetime.now()
                    )
                    self.db.add(fallback_req)
                    self.db.commit()
                except:
                    pass

    def parse_capture_file(self, capture_file):
        """Parse tcpdump output file to extract subsequent requests."""
        # This is a simplified implementation
        # In a real-world scenario, you'd use a packet analysis library
        requests_data = []
        
        try:
            # Check if the file exists
            import os
            if not os.path.exists(capture_file):
                print(f"Capture file not found: {capture_file}")
                return requests_data
            
            # Use tshark to parse the pcap file
            cmd = [
                "tshark", 
                "-r", capture_file,
                "-T", "json"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.stdout:
                try:
                    packets = json.loads(result.stdout)
                    
                    for packet in packets:
                        req_data = {}
                        
                        # Extract protocol
                        if "_ws.col.Protocol" in packet:
                            req_data['protocol'] = packet["_ws.col.Protocol"]
                        elif "layers" in packet and "frame" in packet["layers"]:
                            if "ip" in packet["layers"]:
                                ip_layer = packet["layers"]["ip"]
                                req_data['ip'] = ip_layer.get("ip.dst", "Unknown")
                                
                                if "tcp" in packet["layers"]:
                                    req_data['protocol'] = "TCP"
                                    req_data['state_type'] = "Stateful"
                                elif "udp" in packet["layers"]:
                                    req_data['protocol'] = "UDP"
                                    req_data['state_type'] = "Stateless"
                            
                            # Try to extract URLs from HTTP requests
                            if "http" in packet["layers"]:
                                http = packet["layers"]["http"]
                                if "http.request.full_uri" in http:
                                    req_data['url'] = http["http.request.full_uri"]
                                    
                                    # Try to determine resource type from URL
                                    if req_data['url'].endswith(('.jpg', '.jpeg', '.png', '.gif')):
                                        req_data['resource_type'] = 'Image'
                                    elif req_data['url'].endswith(('.css')):
                                        req_data['resource_type'] = 'Stylesheet'
                                    elif req_data['url'].endswith(('.js')):
                                        req_data['resource_type'] = 'JavaScript'
                                    elif req_data['url'].endswith(('.html', '.htm')):
                                        req_data['resource_type'] = 'HTML'
                                    else:
                                        req_data['resource_type'] = 'Other'
                                        
                        # Add default values if missing
                        if 'url' not in req_data:
                            req_data['url'] = 'Unknown'
                        if 'ip' not in req_data:
                            req_data['ip'] = 'Unknown'
                        if 'resource_type' not in req_data:
                            req_data['resource_type'] = 'Unknown'
                        if 'state_type' not in req_data:
                            req_data['state_type'] = 'Unknown'
                        if 'protocol' not in req_data:
                            req_data['protocol'] = 'Unknown'
                            
                        requests_data.append(req_data)
                except json.JSONDecodeError:
                    print("Could not parse tshark JSON output")
            
            # Fallback to simple regex parsing if tshark didn't work
            if not requests_data:
                try:
                    with open(capture_file, 'rb') as f:  # Use binary mode to handle non-text content
                        content = f.read().decode('utf-8', errors='ignore')
                        
                        # Extract HTTP requests
                        http_matches = re.findall(r'(GET|POST|PUT|DELETE) ([^\s]+) HTTP/[0-9.]+', content)
                        for method, path in http_matches:
                            req_data = {
                                'url': path,
                                'ip': 'Unknown',
                                'protocol': 'TCP',
                                'state_type': 'Stateful',
                                'resource_type': 'HTML'
                            }
                            
                            # Try to determine resource type
                            if path.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                                req_data['resource_type'] = 'Image'
                            elif path.endswith('.css'):
                                req_data['resource_type'] = 'Stylesheet'
                            elif path.endswith('.js'):
                                req_data['resource_type'] = 'JavaScript'
                                
                            requests_data.append(req_data)
                except Exception as e:
                    print(f"Error in fallback parsing: {str(e)}")
            
            # Cleanup the temporary capture file
            try:
                os.remove(capture_file)
            except Exception as e:
                print(f"Error removing capture file: {str(e)}")
                
        except Exception as e:
            print(f"Error parsing capture file: {str(e)}")
            
        return requests_data

    def start_monitoring(self, url_obj: URL):
        """Start monitoring a URL at the specified frequency."""
        if url_obj.id in self.jobs:
            # Update existing job
            self.jobs[url_obj.id].remove()
        
        # Create a new job
        job = self.scheduler.add_job(
            self.check_url,
            'interval',
            seconds=url_obj.check_frequency,
            args=[url_obj.id, url_obj.url]
        )
        self.jobs[url_obj.id] = job
        
        # Run an initial check
        self.check_url(url_obj.id, url_obj.url)

    def stop_monitoring(self, url_id: int):
        """Stop monitoring a URL."""
        if url_id in self.jobs:
            self.jobs[url_id].remove()
            del self.jobs[url_id]
            return True
        return False

    def update_frequency(self, url_obj: URL):
        """Update the check frequency for a URL."""
        if url_obj.id in self.jobs:
            self.stop_monitoring(url_obj.id)
            self.start_monitoring(url_obj)
            return True
        return False