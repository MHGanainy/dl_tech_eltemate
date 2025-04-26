from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import os
import docx
import PyPDF2
import openai
import tempfile
import json
from werkzeug.utils import secure_filename
import httpx
import logging
from datetime import datetime
import threading
import queue

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a queue to store logs
log_queue = queue.Queue(maxsize=100)  # Limit to last 100 logs

# Custom logging handler to capture all logs in our queue
class QueueHandler(logging.Handler):
    def emit(self, record):
        log_entry = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'type': 'log',
            'level': record.levelname,
            'content': self.format(record),
            'model': 'n/a'  # Not an API call
        }
        log_queue.put(log_entry)

# Add our custom handler to the root logger
queue_handler = QueueHandler()
queue_handler.setFormatter(logging.Formatter('%(levelname)s - %(message)s'))
logging.getLogger().addHandler(queue_handler)

# Replace with your OpenAI API key or use environment variable
openai_api_key = os.environ.get("OPENAI_API_KEY")
# Create a client with the API key and explicitly set http_client without proxies
http_client = httpx.Client()
client = openai.OpenAI(
    api_key=openai_api_key,
    http_client=http_client
)

# Define the clauses we want to extract and label
CLAUSE_TYPES = [
    "licence scope", 
    "ownership", 
    "patents challenged", 
    "confidentiality term", 
    "liability cap", 
    "indemnity trigger", 
    "governing law", 
    "assignment rights"
]

# Custom OpenAI client that logs requests and responses
class LoggingOpenAIClient:
    def __init__(self, client):
        self.client = client
        self.chat = LoggingChatCompletions(client.chat)

class LoggingChatCompletions:
    def __init__(self, chat):
        self.chat = chat
        self.completions = LoggingCompletionsCreate(chat.completions)

class LoggingCompletionsCreate:
    def __init__(self, completions):
        self.completions = completions
    
    def create(self, **kwargs):
        # Log the request
        prompt = kwargs.get('messages', [])[0]['content'] if kwargs.get('messages') else None
        log_entry = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'type': 'request',
            'model': kwargs.get('model', 'unknown'),
            'prompt': prompt
        }
        log_queue.put(log_entry)
        logger.info(f"OpenAI Request: {prompt[:100]}...")
        
        # Make the actual API call
        response = self.completions.create(**kwargs)
        
        # Log the response
        content = response.choices[0].message.content if response.choices else None
        log_entry = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'type': 'response',
            'model': kwargs.get('model', 'unknown'),
            'content': content
        }
        log_queue.put(log_entry)
        logger.info(f"OpenAI Response: {content[:100] if content else 'None'}...")
        
        return response

# Replace the standard client with our logging client
logging_client = LoggingOpenAIClient(client)

# Add a simple index route
@app.route('/')
def index():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>DL Tech Contract Analyzer API</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            h1 {
                color: #3B82F6;
            }
            .endpoint {
                background-color: #f8f9fa;
                border-left: 4px solid #3B82F6;
                padding: 15px;
                margin-bottom: 20px;
            }
            code {
                background-color: #f1f1f1;
                padding: 2px 5px;
                border-radius: 3px;
                font-family: monospace;
            }
            .nav-links {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
            }
            .nav-links a {
                color: #3B82F6;
                font-weight: 600;
                text-decoration: none;
            }
            .nav-links a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <h1>DL Tech Contract Analyzer API</h1>
        
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/demo">Demo & Examples</a>
            <a href="/live-logs">Live Logs</a>
        </div>
        
        <p>This is the API server for the DL Tech Contract Analyzer. The API provides document comparison and analysis functionality.</p>
        
        <div class="endpoint">
            <h2>Available Endpoints:</h2>
            <p><strong>POST /api/compare</strong> - Compare template and draft contract documents</p>
            <p>This endpoint accepts two files: a template document and a draft document. It analyzes both documents, extracts key clauses, and compares them.</p>
            <p><em>Expected input:</em> multipart/form-data with 'template' and 'draft' files (PDF or DOCX)</p>
        </div>
        
        <p>To use this API, please connect through the frontend application or send requests directly to the endpoints.</p>
        <p>For a demonstration of the AI prompts and responses used in the backend, visit the <a href="/demo">Demo page</a>.</p>
        <p>To see real-time logs of OpenAI API calls as they happen, visit the <a href="/live-logs">Live Logs page</a>.</p>
        <p>Created by Mohamed Elganayni and Andreas Schultz for the Legal Tech Hackathon 2025.</p>
    </body>
    </html>
    """
    return render_template_string(html)

@app.route('/demo')
def demo():
    """Demo page showing the prompts and sample responses from OpenAI."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>DL Tech Contract Analyzer - Demo</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 1000px;
                margin: 0 auto;
                padding: 20px;
            }
            h1, h2, h3 {
                color: #3B82F6;
            }
            .card {
                background-color: #f8f9fa;
                border-left: 4px solid #3B82F6;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 4px;
            }
            .prompt {
                background-color: #f1f5f9;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 10px;
                font-family: monospace;
                white-space: pre-wrap;
                border-left: 4px solid #64748b;
            }
            .response {
                background-color: #ecfdf5;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
                font-family: monospace;
                white-space: pre-wrap;
                border-left: 4px solid #10b981;
            }
            .json {
                background-color: #eff6ff;
                overflow-x: auto;
            }
            .navbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #e5e7eb;
            }
            .navbar a {
                color: #3B82F6;
                text-decoration: none;
                font-weight: bold;
            }
            .navbar a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="navbar">
            <h1>DL Tech Contract Analyzer - Demo</h1>
            <a href="/">Back to Home</a>
        </div>
        
        <div class="card">
            <h2>Clause Classification</h2>
            <p>This demonstrates how the API extracts and classifies contract clauses using GPT-4o.</p>
            
            <h3>Prompt:</h3>
            <div class="prompt">Given the following contract excerpt, please identify and classify any of the following types of clauses:
licence scope, ownership, patents challenged, confidentiality term, liability cap, indemnity trigger, governing law, assignment rights

For each identified clause, provide:
1. The clause type
2. The relevant text
3. A confidence score (0-100)

Return your analysis as a JSON array of objects with these properties: 
{
  "clause_type": "&lt;type&gt;",
  "text": "&lt;extracted text&gt;",
  "confidence": &lt;number 0-100&gt;
}

If no clauses are found, return an empty array.

Contract excerpt:
The Licensee shall have the right to use the Software only for internal business purposes and may not sublicense, distribute, or modify the Software without written permission from the Licensor. The ownership of all intellectual property rights in the Software shall remain with the Licensor. This agreement shall be governed by the laws of the State of California.</div>
            
            <h3>Response:</h3>
            <div class="response json">{
  "clauses": [
    {
      "clause_type": "licence scope",
      "text": "The Licensee shall have the right to use the Software only for internal business purposes and may not sublicense, distribute, or modify the Software without written permission from the Licensor.",
      "confidence": 95
    },
    {
      "clause_type": "ownership",
      "text": "The ownership of all intellectual property rights in the Software shall remain with the Licensor.",
      "confidence": 98
    },
    {
      "clause_type": "governing law",
      "text": "This agreement shall be governed by the laws of the State of California.",
      "confidence": 99
    }
  ]
}</div>
        </div>
        
        <div class="card">
            <h2>Clause Comparison</h2>
            <p>This demonstrates how the API compares clauses between a template and draft contract.</p>
            
            <h3>Prompt:</h3>
            <div class="prompt">Compare these two versions of a liability cap clause:

TEMPLATE VERSION:
Liability under this Agreement shall be limited to direct damages not exceeding the amount paid by Licensee to Licensor during the twelve (12) months preceding the claim.

DRAFT VERSION:
Liability under this Agreement shall be limited to direct damages not exceeding fifty thousand dollars ($50,000), and in no event shall either party be liable for any indirect, special, incidental, or consequential damages.

Provide a brief analysis (under 80 words) in plain English of the key differences, any potential risks, 
and whether legal review is recommended. Then provide a risk score from 1-10 (10 being highest risk).
Format as JSON: {"analysis": "your analysis", "risk_score": number}</div>
            
            <h3>Response:</h3>
            <div class="response json">{
  "analysis": "The draft version sets a fixed liability cap of $50,000 instead of a variable cap based on fees paid. It also explicitly excludes indirect damages. This could be riskier if your fees exceed $50,000, but beneficial if they're lower. The exclusion of indirect damages provides additional protection. Legal review recommended.",
  "risk_score": 6
}</div>
        </div>
        
        <div class="card">
            <h2>How It Works</h2>
            <p>The Document Comparison Process:</p>
            <ol>
                <li>Upload template and draft documents (PDF or DOCX)</li>
                <li>Text extraction from documents</li>
                <li>Document chunking for efficient processing</li>
                <li>Clause classification using GPT-4o</li>
                <li>Clause comparison between template and draft</li>
                <li>Risk analysis and scoring</li>
                <li>Results presentation</li>
            </ol>
            <p>Try it yourself by using the <a href="/api/compare">API endpoint</a> or connecting through the frontend application.</p>
        </div>
    </body>
    </html>
    """
    return render_template_string(html)

@app.route('/live-logs')
def live_logs():
    """Real-time logging page that shows OpenAI API calls as they happen."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>DL Tech Contract Analyzer - Live Logs</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            h1, h2, h3 {
                color: #3B82F6;
            }
            .navbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #e5e7eb;
            }
            .navbar a {
                color: #3B82F6;
                text-decoration: none;
                font-weight: bold;
                margin-left: 15px;
            }
            .navbar a:hover {
                text-decoration: underline;
            }
            .log-container {
                background-color: #f8f9fa;
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 20px;
                min-height: 500px;
                max-height: 700px;
                overflow-y: auto;
                border: 1px solid #e5e7eb;
            }
            .log-entry {
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 4px;
                font-family: monospace;
                white-space: pre-wrap;
                word-break: break-word;
            }
            .request {
                background-color: #f1f5f9;
                border-left: 4px solid #64748b;
            }
            .response {
                background-color: #ecfdf5;
                border-left: 4px solid #10b981;
            }
            .log {
                background-color: #fff7ed;
                border-left: 4px solid #f59e0b;
            }
            .log.ERROR {
                background-color: #fee2e2;
                border-left: 4px solid #ef4444;
            }
            .log.WARNING {
                background-color: #fef9c3;
                border-left: 4px solid #eab308;
            }
            .log.INFO {
                background-color: #dbeafe;
                border-left: 4px solid #3b82f6;
            }
            .timestamp {
                font-size: 0.8em;
                color: #64748b;
                margin-bottom: 5px;
            }
            .model, .level {
                font-size: 0.8em;
                color: #0ea5e9;
                margin-bottom: 5px;
            }
            .controls {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            .filter-options {
                margin-bottom: 10px;
            }
            .filter-options label {
                margin-right: 10px;
            }
        </style>
        <script>
            // Function to fetch logs from the server
            function fetchLogs() {
                fetch('/api/logs')
                    .then(response => response.json())
                    .then(data => {
                        const logContainer = document.getElementById('logs');
                        logContainer.innerHTML = ''; // Clear existing logs
                        
                        // Apply filters
                        const showRequests = document.getElementById('show-requests').checked;
                        const showResponses = document.getElementById('show-responses').checked;
                        const showLogs = document.getElementById('show-logs').checked;
                        const showErrors = document.getElementById('show-errors').checked;
                        
                        data.logs.forEach(log => {
                            // Skip if filtered out
                            if (log.type === 'request' && !showRequests) return;
                            if (log.type === 'response' && !showResponses) return;
                            if (log.type === 'log' && !showLogs && log.level !== 'ERROR') return;
                            if (log.type === 'log' && log.level === 'ERROR' && !showErrors) return;
                            
                            const logEntry = document.createElement('div');
                            logEntry.className = `log-entry ${log.type}`;
                            
                            // Add level class for styling if it's a log
                            if (log.type === 'log' && log.level) {
                                logEntry.classList.add(log.level);
                            }
                            
                            const timestamp = document.createElement('div');
                            timestamp.className = 'timestamp';
                            timestamp.textContent = log.timestamp;
                            logEntry.appendChild(timestamp);
                            
                            if (log.type === 'log') {
                                const level = document.createElement('div');
                                level.className = 'level';
                                level.textContent = `Level: ${log.level || 'INFO'}`;
                                logEntry.appendChild(level);
                            } else {
                                const model = document.createElement('div');
                                model.className = 'model';
                                model.textContent = `Model: ${log.model}`;
                                logEntry.appendChild(model);
                            }
                            
                            const content = document.createElement('div');
                            if (log.type === 'request') {
                                content.textContent = log.prompt || 'No prompt content';
                            } else if (log.type === 'response') {
                                content.textContent = log.content || 'No response content';
                            } else {
                                content.textContent = log.content || 'No log content';
                            }
                            logEntry.appendChild(content);
                            
                            logContainer.appendChild(logEntry);
                        });
                        
                        // Auto-scroll to bottom if auto-scroll is enabled
                        if (document.getElementById('auto-scroll').checked) {
                            logContainer.scrollTop = logContainer.scrollHeight;
                        }
                    })
                    .catch(error => console.error('Error fetching logs:', error));
            }
            
            // Poll for new logs every 2 seconds
            let pollingInterval;
            
            function startPolling() {
                fetchLogs(); // Fetch immediately
                pollingInterval = setInterval(fetchLogs, 2000); // Then every 2 seconds
            }
            
            function stopPolling() {
                clearInterval(pollingInterval);
            }
            
            function clearLogs() {
                fetch('/api/logs/clear', { method: 'POST' })
                    .then(() => fetchLogs())
                    .catch(error => console.error('Error clearing logs:', error));
            }
            
            // Start polling when page loads
            document.addEventListener('DOMContentLoaded', startPolling);
            
            // Stop polling when page unloads
            window.addEventListener('beforeunload', stopPolling);
        </script>
    </head>
    <body>
        <div class="navbar">
            <h1>DL Tech Contract Analyzer - Live Logs</h1>
            <div>
                <a href="/">Home</a>
                <a href="/demo">Demo & Examples</a>
            </div>
        </div>
        
        <div class="controls">
            <div>
                <button onclick="clearLogs()">Clear Logs</button>
                <label>
                    <input type="checkbox" id="auto-scroll" checked> Auto-scroll to bottom
                </label>
            </div>
            <div>
                <button onclick="fetchLogs()">Refresh Now</button>
            </div>
        </div>
        
        <div class="filter-options">
            <label>
                <input type="checkbox" id="show-requests" checked> API Requests
            </label>
            <label>
                <input type="checkbox" id="show-responses" checked> API Responses
            </label>
            <label>
                <input type="checkbox" id="show-logs" checked> System Logs
            </label>
            <label>
                <input type="checkbox" id="show-errors" checked> Errors
            </label>
        </div>
        
        <div class="log-container" id="logs">
            <div class="log-entry">Loading logs...</div>
        </div>
        
        <div>
            <h3>How to Use</h3>
            <p>This page shows the actual OpenAI API calls and system logs being made by the application in real-time. To see logs in action:</p>
            <ol>
                <li>Use the API to analyze documents via the <code>/api/compare</code> endpoint</li>
                <li>Watch as the actual prompts sent to OpenAI, responses received, and system logs appear here</li>
                <li>The logs are automatically refreshed every 2 seconds</li>
                <li>Use the checkboxes above to filter different types of logs</li>
            </ol>
            <p>These logs show the actual prompts being used by the system to extract and classify contract clauses and compare them between documents, as well as any errors or warnings that may occur during processing.</p>
        </div>
    </body>
    </html>
    """
    return render_template_string(html)

@app.route('/api/logs')
def get_logs():
    """API endpoint to get the current logs."""
    logs = []
    # Make a copy of the logs from the queue
    temp_queue = queue.Queue()
    
    while not log_queue.empty():
        log = log_queue.get()
        logs.append(log)
        temp_queue.put(log)
    
    # Restore the logs to the original queue
    while not temp_queue.empty():
        log_queue.put(temp_queue.get())
    
    return jsonify({"logs": logs})

@app.route('/api/logs/clear', methods=['POST'])
def clear_logs():
    """API endpoint to clear the logs."""
    while not log_queue.empty():
        log_queue.get()
    
    return jsonify({"status": "success"})

def extract_text_from_docx(file):
    """Extract text from a DOCX file."""
    doc = docx.Document(file)
    text = ""
    
    for para in doc.paragraphs:
        text += para.text + "\n"
    
    return text

def extract_text_from_pdf(file):
    """Extract text from a PDF file."""
    pdf_reader = PyPDF2.PdfReader(file)
    text = ""
    
    for page_num in range(len(pdf_reader.pages)):
        page = pdf_reader.pages[page_num]
        text += page.extract_text() + "\n"
    
    return text

def chunk_document(text, chunk_size=1000):
    """Split document into chunks for processing."""
    paragraphs = text.split('\n')
    chunks = []
    current_chunk = ""
    
    for paragraph in paragraphs:
        if paragraph.strip():
            if len(current_chunk) + len(paragraph) > chunk_size:
                chunks.append(current_chunk)
                current_chunk = paragraph + "\n"
            else:
                current_chunk += paragraph + "\n"
    
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

def classify_clauses(text):
    """Use GPT-4o to classify clauses in the text."""
    
    # Log the first part of the chunk being processed
    logger.info(f"Processing chunk of length {len(text)}: {text[:200]}...")
    
    prompt = f"""Given the following contract excerpt, please identify and classify any of the following types of clauses:
    {', '.join(CLAUSE_TYPES)}
    
    For each identified clause, provide:
    1. The clause type
    2. The relevant text
    3. A confidence score (0-100)
    
    Return your analysis as a JSON array of objects with these properties: 
    {{
      "clause_type": "<type>",
      "text": "<extracted text>",
      "confidence": <number 0-100>
    }}
    
    If no clauses are found, return an empty array.
    
    Contract excerpt:
    {text}
    """
    
    response = logging_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    
    try:
        # Log the raw response for debugging
        raw_response = response.choices[0].message.content
        logger.info(f"Raw API response: {raw_response[:200]}...")
        
        result = json.loads(raw_response)
        
        # Handle both possible response formats:
        # 1. Direct array of clauses: [{"clause_type": "...", "text": "...", "confidence": 90}, ...]
        # 2. Object with clauses key: {"clauses": [{"clause_type": "...", "text": "...", "confidence": 90}, ...]}
        # 3. Single clause object: {"clause_type": "...", "text": "...", "confidence": 90}
        
        clauses = []
        if isinstance(result, list):
            # If result is already a list, use it directly
            clauses = result
            logger.info(f"Response is a list with {len(clauses)} clause(s)")
        elif "clauses" in result:
            # If result has a "clauses" key, use that
            clauses = result["clauses"]
            logger.info(f"Response has 'clauses' key with {len(clauses)} clause(s)")
        elif "clause_type" in result and "text" in result and "confidence" in result:
            # If result is a single clause object, wrap it in a list
            clauses = [result]
            logger.info("Response is a single clause object, wrapping in list")
        elif any(key in result for key in CLAUSE_TYPES):
            # If result contains any of our clause types as keys
            for clause_type in CLAUSE_TYPES:
                if clause_type in result and result[clause_type]:
                    clauses.append({
                        "clause_type": clause_type,
                        "text": result[clause_type].get("text", ""),
                        "confidence": result[clause_type].get("confidence", 50)
                    })
            logger.info(f"Response has clause types as keys, found {len(clauses)} clause(s)")
        else:
            # Try to find any items that have clause_type, text, and confidence
            for key, value in result.items():
                if isinstance(value, dict) and "text" in value and "confidence" in value:
                    clauses.append({
                        "clause_type": key,
                        "text": value["text"],
                        "confidence": value["confidence"]
                    })
            logger.info(f"Using alternative detection, found {len(clauses)} clause(s)")
        
        # Log the final extracted clauses
        if clauses:
            logger.info(f"Successfully extracted {len(clauses)} clause(s): {str(clauses)[:200]}...")
        else:
            logger.warning(f"No clauses found in the chunk. Response structure: {str(result)[:200]}...")
        
        return clauses
            
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response from OpenAI: {str(e)}")
        logger.error(f"Invalid JSON was: {raw_response[:500]}")
        return []
    except Exception as e:
        logger.error(f"Error in classify_clauses: {str(e)}")
        return []

def compare_clauses(template_clauses, draft_clauses):
    """Compare clauses between template and draft documents."""
    comparison = []
    
    # Create a mapping of clause types for easy lookup
    template_map = {c["clause_type"]: c for c in template_clauses}
    draft_map = {c["clause_type"]: c for c in draft_clauses}
    
    # Find all unique clause types
    all_types = set(template_map.keys()) | set(draft_map.keys())
    
    for clause_type in all_types:
        template_clause = template_map.get(clause_type)
        draft_clause = draft_map.get(clause_type)
        
        if template_clause and draft_clause:
            # Both documents have this clause, compare them
            prompt = f"""
            Compare these two versions of a {clause_type} clause:
            
            TEMPLATE VERSION:
            {template_clause['text']}
            
            DRAFT VERSION:
            {draft_clause['text']}
            
            Provide a brief analysis (under 80 words) in plain English of the key differences, any potential risks, 
            and whether legal review is recommended. Then provide a risk score from 1-10 (10 being highest risk).
            Format as JSON: {{"analysis": "your analysis", "risk_score": number}}
            """
            
            response = logging_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            try:
                result = json.loads(response.choices[0].message.content)
                comparison.append({
                    "clause_type": clause_type,
                    "template_text": template_clause["text"],
                    "draft_text": draft_clause["text"],
                    "analysis": result.get("analysis", "No analysis available"),
                    "risk_score": result.get("risk_score", 5)
                })
            except:
                comparison.append({
                    "clause_type": clause_type,
                    "template_text": template_clause["text"],
                    "draft_text": draft_clause["text"],
                    "analysis": "Error analyzing clauses",
                    "risk_score": 5
                })
        elif template_clause:
            # Only in template, not in draft
            comparison.append({
                "clause_type": clause_type,
                "template_text": template_clause["text"],
                "draft_text": "",
                "analysis": "This clause is present in the template but missing from the draft. This could create a significant gap in coverage.",
                "risk_score": 8
            })
        else:
            # Only in draft, not in template
            comparison.append({
                "clause_type": clause_type,
                "template_text": "",
                "draft_text": draft_clause["text"],
                "analysis": "This clause is present in the draft but was not in the template. Review to ensure it aligns with your interests.",
                "risk_score": 7
            })
    
    return comparison

@app.route('/api/compare', methods=['POST'])
def compare_documents():
    """API endpoint to compare template and draft documents."""
    if 'template' not in request.files or 'draft' not in request.files:
        return jsonify({"error": "Both template and draft files must be provided"}), 400
    
    template_file = request.files['template']
    draft_file = request.files['draft']
    
    # Check if we need to include full text in the response
    include_full_text = request.form.get('include_full_text', 'false').lower() == 'true'
    
    # Process template file
    with tempfile.NamedTemporaryFile(delete=False) as temp_template:
        template_file.save(temp_template.name)
        temp_template_path = temp_template.name
    
    # Process draft file
    with tempfile.NamedTemporaryFile(delete=False) as temp_draft:
        draft_file.save(temp_draft.name)
        temp_draft_path = temp_draft.name
    
    try:
        # Extract text from files
        if template_file.filename.lower().endswith('.docx'):
            template_text = extract_text_from_docx(temp_template_path)
        elif template_file.filename.lower().endswith('.pdf'):
            template_text = extract_text_from_pdf(temp_template_path)
        else:
            return jsonify({"error": "Template file must be a DOCX or PDF file"}), 400
        
        if draft_file.filename.lower().endswith('.docx'):
            draft_text = extract_text_from_docx(temp_draft_path)
        elif draft_file.filename.lower().endswith('.pdf'):
            draft_text = extract_text_from_pdf(temp_draft_path)
        else:
            return jsonify({"error": "Draft file must be a DOCX or PDF file"}), 400
        
        # Chunk documents
        template_chunks = chunk_document(template_text)
        draft_chunks = chunk_document(draft_text)
        
        # Classify clauses in each chunk
        template_clauses = []
        for chunk in template_chunks:
            clauses = classify_clauses(chunk)
            template_clauses.extend(clauses)
        
        draft_clauses = []
        for chunk in draft_chunks:
            clauses = classify_clauses(chunk)
            draft_clauses.extend(clauses)
        
        # Compare clauses
        comparison = compare_clauses(template_clauses, draft_clauses)
        
        # Calculate overall risk score
        if comparison:
            overall_risk = sum(item["risk_score"] for item in comparison) / len(comparison)
        else:
            overall_risk = 0
        
        # Create the response
        response_data = {
            "template_clauses": template_clauses,
            "draft_clauses": draft_clauses,
            "comparison": comparison,
            "overall_risk": overall_risk
        }
        
        # Add full text if requested
        if include_full_text:
            response_data["template_text"] = template_text
            response_data["draft_text"] = draft_text
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Clean up temporary files
        try:
            os.unlink(temp_template_path)
            os.unlink(temp_draft_path)
        except:
            pass

if __name__ == '__main__':
    app.run(debug=True, port=5000)