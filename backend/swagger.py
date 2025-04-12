from apispec import APISpec
from apispec.ext.marshmallow import MarshmallowPlugin
from flask import jsonify, json, url_for
from marshmallow import Schema, fields

# Create an APISpec
spec = APISpec(
    title="URL Monitor API",
    version="1.0.0",
    openapi_version="3.0.2",
    info=dict(
        description="API for monitoring URLs and tracking their status",
        contact=dict(email="support@urlmonitor.example")
    ),
    plugins=[MarshmallowPlugin()],
)

# Define schemas for OpenAPI documentation
class URLStatusSchema(Schema):
    id = fields.Int(dump_only=True)
    status_code = fields.Int()
    response_time = fields.Float(description="Response time in seconds")
    is_up = fields.Bool(description="Whether the URL is up")
    timestamp = fields.DateTime()
    error_message = fields.Str(allow_none=True)

class SubsequentRequestSchema(Schema):
    id = fields.Int(dump_only=True)
    target_url = fields.Str()
    ip_address = fields.Str()
    resource_type = fields.Str()
    state_type = fields.Str()
    protocol = fields.Str()
    timestamp = fields.DateTime()

class URLSchema(Schema):
    id = fields.Int(dump_only=True)
    url = fields.Str(required=True)
    name = fields.Str()
    is_active = fields.Bool()
    check_frequency = fields.Int(description="Check frequency in seconds")
    is_one_time = fields.Bool()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class URLCreateSchema(Schema):
    url = fields.Str(required=True)
    name = fields.Str()
    check_frequency = fields.Int()
    is_active = fields.Bool()
    one_time = fields.Bool()

class URLUpdateSchema(Schema):
    name = fields.Str()
    check_frequency = fields.Int()
    is_active = fields.Bool()

class URLDeleteResponseSchema(Schema):
    message = fields.Str()
    details = fields.Dict()

# Register schemas with spec
spec.components.schema("URL", schema=URLSchema)
spec.components.schema("URLCreate", schema=URLCreateSchema)
spec.components.schema("URLUpdate", schema=URLUpdateSchema)
spec.components.schema("URLStatus", schema=URLStatusSchema)
spec.components.schema("SubsequentRequest", schema=SubsequentRequestSchema)
spec.components.schema("URLDeleteResponse", schema=URLDeleteResponseSchema)

# Define paths/operations
def add_paths_to_spec(app):
    """Add all API paths to the spec."""
    
    # GET /api/urls
    with app.test_request_context():
        spec.path(
            path="/api/urls",
            operations={
                "get": {
                    "summary": "Get all URLs being monitored",
                    "description": "Returns a list of all URLs being monitored based on type",
                    "parameters": [
                        {
                            "name": "type",
                            "in": "query",
                            "description": "Type of URLs to return (monitored, one-time, all)",
                            "schema": {"type": "string", "enum": ["monitored", "one-time", "all"]},
                            "required": False
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "A list of URL objects",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/URL"}
                                    }
                                }
                            }
                        }
                    }
                },
                "post": {
                    "summary": "Add a new URL to monitor",
                    "description": "Creates a new URL for monitoring or performs a one-time check",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/URLCreate"}
                            }
                        }
                    },
                    "responses": {
                        "201": {
                            "description": "URL created successfully",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/URL"}
                                }
                            }
                        },
                        "400": {
                            "description": "Invalid request data"
                        },
                        "409": {
                            "description": "URL already exists"
                        }
                    }
                }
            }
        )
        
        # Operations for specific URLs
        spec.path(
            path="/api/urls/{url_id}",
            operations={
                "get": {
                    "summary": "Get URL by ID",
                    "parameters": [
                        {
                            "name": "url_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "URL object",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/URL"}
                                }
                            }
                        },
                        "404": {
                            "description": "URL not found"
                        }
                    }
                },
                "put": {
                    "summary": "Update URL monitoring settings",
                    "parameters": [
                        {
                            "name": "url_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"}
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/URLUpdate"}
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Updated URL object",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/URL"}
                                }
                            }
                        },
                        "404": {
                            "description": "URL not found"
                        }
                    }
                },
                "delete": {
                    "summary": "Delete a URL from monitoring",
                    "description": "Deletes a URL and all related data (statuses, subsequent requests)",
                    "parameters": [
                        {
                            "name": "url_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "URL deleted successfully",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/URLDeleteResponse"}
                                }
                            }
                        },
                        "404": {
                            "description": "URL not found"
                        },
                        "500": {
                            "description": "Server error during deletion"
                        }
                    }
                }
            }
        )
        
        # URL status endpoint
        spec.path(
            path="/api/urls/{url_id}/status",
            operations={
                "get": {
                    "summary": "Get status history for a URL",
                    "description": "Returns the status history for a specific URL",
                    "parameters": [
                        {
                            "name": "url_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Status history",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/URLStatus"}
                                    }
                                }
                            }
                        },
                        "404": {
                            "description": "URL not found"
                        }
                    }
                }
            }
        )
        
        # Subsequent requests endpoint
        spec.path(
            path="/api/urls/{url_id}/subsequent-requests",
            operations={
                "get": {
                    "summary": "Get subsequent requests for a URL",
                    "description": "Returns the subsequent requests made after accessing a URL",
                    "parameters": [
                        {
                            "name": "url_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "integer"}
                        },
                        {
                            "name": "resource_type",
                            "in": "query",
                            "schema": {"type": "string"},
                            "required": False
                        },
                        {
                            "name": "state_type",
                            "in": "query",
                            "schema": {"type": "string"},
                            "required": False
                        },
                        {
                            "name": "protocol",
                            "in": "query",
                            "schema": {"type": "string"},
                            "required": False
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "List of subsequent requests",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/SubsequentRequest"}
                                    }
                                }
                            }
                        },
                        "404": {
                            "description": "URL not found"
                        }
                    }
                }
            }
        )
        
        # Filter options endpoint
        spec.path(
            path="/api/subsequent-requests/filters",
            operations={
                "get": {
                    "summary": "Get filter options for subsequent requests",
                    "description": "Returns available filter options for subsequent requests",
                    "responses": {
                        "200": {
                            "description": "Filter options",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "resource_types": {
                                                "type": "array",
                                                "items": {"type": "string"}
                                            },
                                            "state_types": {
                                                "type": "array",
                                                "items": {"type": "string"}
                                            },
                                            "protocols": {
                                                "type": "array",
                                                "items": {"type": "string"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        )

def get_swagger_dict(app):
    """
    Returns the Swagger specification as a dict.
    """
    add_paths_to_spec(app)
    return json.loads(json.dumps(spec.to_dict()))