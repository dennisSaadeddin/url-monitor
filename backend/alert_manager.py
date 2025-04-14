import os
import json
import requests
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import URL, URLStatus
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AlertManager:
    """Manager for handling alerts to various channels like Slack"""
    
    def __init__(self, db: Session):
        self.db = db
        self.slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/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")
        self.failure_threshold = int(os.getenv("ALERT_FAILURE_THRESHOLD", "2"))
        self.cooldown_minutes = int(os.getenv("ALERT_COOLDOWN_MINUTES", "15"))
    
    def process_status_for_alerts(self, url_id: int, status: URLStatus):
        """Process a new status check result for potential alerts"""
        url = self.db.query(URL).filter(URL.id == url_id).first()
        if not url or not url.alert_enabled or url.is_one_time:
            return
            
        if status.is_up:
            # Site is up - check if we need to send recovery alert
            if url.consecutive_failures >= self.failure_threshold and url.alert_recovery:
                self.send_recovery_alert(url)
            # Reset the failure counter
            url.consecutive_failures = 0
        else:
            # Site is down - increment counter
            url.consecutive_failures += 1
            
            # Send alert if threshold reached and cooldown period passed
            if url.consecutive_failures == self.failure_threshold:
                self.send_failure_alert(url, status)
        
        # Update the URL record
        self.db.commit()
    
    def send_failure_alert(self, url: URL, status: URLStatus):
        """Send an alert that the URL is down"""
        if not self.slack_webhook_url:
            print("No Slack webhook URL configured. Skipping alert.")
            return False
            
        # Check if we're in cooldown period
        if url.last_alerted_at and datetime.now() - url.last_alerted_at < timedelta(minutes=self.cooldown_minutes):
            return False
            
        message = {
            "text": "⚠️ URL Monitor Alert: Website Down",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "⚠️ Website Down Alert",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Website:*\n<{url.url}|{url.name}>"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Status:*\n❌ Down"
                        }
                    ]
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Status Code:*\n{status.status_code or 'N/A'}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Error:*\n{status.error_message or 'No error message'}"
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"The website has been down for {url.consecutive_failures} consecutive checks."
                        }
                    ]
                }
            ]
        }
        
        try:
            response = requests.post(
                self.slack_webhook_url,
                data=json.dumps(message),
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            
            # Update last alerted time
            url.last_alerted_at = datetime.now()
            self.db.commit()
            
            print(f"Alert sent for {url.name} ({url.id})")
            return True
        except Exception as e:
            print(f"Error sending alert: {str(e)}")
            return False
    
    def send_recovery_alert(self, url: URL):
        """Send an alert that the URL has recovered"""
        if not self.slack_webhook_url:
            return False
            
        message = {
            "text": "✅ URL Monitor Recovery: Website Back Online",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ Website Recovered",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Website:*\n<{url.url}|{url.name}>"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Status:*\n✅ Online"
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"The website is now online after previous downtime."
                        }
                    ]
                }
            ]
        }
        
        try:
            response = requests.post(
                self.slack_webhook_url,
                data=json.dumps(message),
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            print(f"Recovery alert sent for {url.name} ({url.id})")
            return True
        except Exception as e:
            print(f"Error sending recovery alert: {str(e)}")
            return False