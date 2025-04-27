from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import os
import docx
import PyPDF2
import openai
from openai import OpenAI
import tempfile
import json
from werkzeug.utils import secure_filename
import httpx
import logging
from datetime import datetime
import threading
import queue
import time
import difflib
import re

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

# Replace with your DeepInfra API key or use environment variable
deepinfra_api_key = os.environ.get("DEEPINFRA_API_KEY")
# Keeping OpenAI for compatibility or future toggling
openai_api_key = os.environ.get("OPENAI_API_KEY")

# Model selection - Change this to select different models
LLAMA_MODEL = "meta-llama/Llama-4-Scout-17B-16E-Instruct"  # You can also use "meta-llama/Llama-3-8b-chat-hf" for a smaller model

# Create DeepInfra client using OpenAI interface
deepinfra_client = OpenAI(
    api_key=deepinfra_api_key,
    base_url="https://api.deepinfra.com/v1/openai",
)

# Create OpenAI client for compatibility
client = openai.OpenAI(
    api_key=openai_api_key,
    http_client=httpx.Client()
)

# Define the clauses we want to extract and label
CLAUSE_TYPES = [
    "termination for convenience",
    "cap on liability",
    "uncapped liability",
    "insurance",
    "minimum commitment",
    "revenue/profit sharing",
    "non-compete",
    "exclusivity",
    "anti-assignment",
    "change of control",
    "license grant",
    "ip ownership assignment"
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

def call_deepinfra_llama(prompt, system_prompt=None):
    """Call DeepInfra's Llama model API using OpenAI client interface with improved error handling."""
    # Trim prompt if too long (DeepInfra might have token limits)
    max_prompt_length = 100000  # Adjust as needed
    if len(prompt) > max_prompt_length:
        logger.warning(f"Prompt too long ({len(prompt)} chars), trimming to {max_prompt_length} chars")
        prompt = prompt[:max_prompt_length]
    
    # Prepare messages with system prompt if provided
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    # Log the request
    log_entry = {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'type': 'request',
        'model': LLAMA_MODEL,
        'prompt': prompt[:500] + "..." if len(prompt) > 500 else prompt
    }
    log_queue.put(log_entry)
    logger.info(f"DeepInfra Request: {prompt[:100]}...")
    
    # Set retries and timeouts
    max_retries = 2
    retry_count = 0
    
    while retry_count <= max_retries:
        try:
            # Call DeepInfra API using OpenAI client interface
            response = deepinfra_client.chat.completions.create(
                model=LLAMA_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=1500,  # Limit response size
                response_format={"type": "json_object"}
            )
            
            # Extract content from the response
            content = response.choices[0].message.content
            
            # If content is empty, try again
            if not content.strip():
                error_msg = "Empty response content from DeepInfra API"
                logger.error(error_msg)
                
                if retry_count == max_retries:
                    return json.dumps({
                        "error": error_msg,
                        "clauses": []
                    })
                
                retry_count += 1
                continue
            
            # Log the response and token usage if available
            usage_info = ""
            if hasattr(response, 'usage'):
                usage_info = f" (Tokens: {response.usage.prompt_tokens} prompt, {response.usage.completion_tokens} completion)"
            
            log_entry = {
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'type': 'response',
                'model': LLAMA_MODEL,
                'content': content[:500] + "..." if len(content) > 500 else content
            }
            log_queue.put(log_entry)
            logger.info(f"DeepInfra Response{usage_info}: {content[:100] if content else 'None'}...")
            
            # Post-process content to ensure it's valid JSON
            # Sometimes language models surround JSON with markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?(.*?)```', content, re.DOTALL)
            if json_match:
                # Extract content from code block
                extracted_json = json_match.group(1).strip()
                logger.info("Extracted JSON from code block in response")
                content = extracted_json
                
            # Verify the response is valid JSON before returning
            try:
                json.loads(content)
                return content
            except json.JSONDecodeError as e:
                logger.warning(f"Response is not valid JSON: {str(e)}")
                
                # Last attempt: try to extract JSON from text
                json_match = re.search(r'({.*})', content, re.DOTALL)
                if json_match:
                    try:
                        extracted = json_match.group(1)
                        # Validate extracted content
                        json.loads(extracted)
                        logger.info("Successfully extracted valid JSON from response text")
                        return extracted
                    except:
                        pass
                
                # If we're on the last retry, return a valid JSON with error information
                if retry_count == max_retries:
                    return json.dumps({
                        "error": "Failed to get valid JSON response",
                        "raw_response": content[:500],
                        "clauses": []
                    })
                
                retry_count += 1
                continue
                
        except Exception as e:
            error_msg = f"Error calling DeepInfra API: {str(e)}"
            logger.error(error_msg)
            import traceback
            logger.error(traceback.format_exc())
            
            # Log the error
            log_entry = {
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'type': 'log',
                'level': 'ERROR',
                'content': error_msg,
                'model': LLAMA_MODEL
            }
            log_queue.put(log_entry)
            
            if retry_count == max_retries:
                return json.dumps({
                    "error": error_msg,
                    "clauses": []
                })
            
            retry_count += 1
            continue
    
    # This should not happen, but just in case
    return json.dumps({
        "error": "Failed to get response after all retries",
        "clauses": []
    })

def extract_text_from_docx(file_path):
    """Extract text from a DOCX file."""
    try:
        doc = docx.Document(file_path)
        text = []
        for para in doc.paragraphs:
            text.append(para.text)
        return '\n'.join(text)
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {str(e)}")
        raise Exception(f"Failed to extract text from DOCX file: {str(e)}")

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file."""
    try:
        text = []
        with open(file_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text.append(page.extract_text())
        return '\n'.join(text)
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise Exception(f"Failed to extract text from PDF file: {str(e)}")

def chunk_document(text, max_chunk_size=100000, overlap=200):
    """Split document into overlapping chunks of maximum size."""
    if not text:
        return []
    
    # Strip extremely long strings that could be binary data
    if len(text) > 100000:
        logger.warning(f"Document is very large ({len(text)} chars), trimming to first 100k chars")
        text = text[:100000]
    
    chunks = []
    start = 0
    
    while start < len(text):
        # Calculate end position of the chunk, considering max chunk size
        end = min(start + max_chunk_size, len(text))
        
        # Try to find a good breaking point (paragraph/sentence end)
        if end < len(text):
            # Look for paragraph breaks first
            paragraph_break = text.rfind('\n\n', start, end)
            if paragraph_break != -1 and paragraph_break > start + max_chunk_size // 2:
                end = paragraph_break + 2
            else:
                # Look for line breaks
                line_break = text.rfind('\n', start, end)
                if line_break != -1 and line_break > start + max_chunk_size // 2:
                    end = line_break + 1
                else:
                    # Look for sentence breaks (., !, ?)
                    for punct in ['. ', '! ', '? ']:
                        sentence_break = text.rfind(punct, start, end)
                        if sentence_break != -1 and sentence_break > start + max_chunk_size // 2:
                            end = sentence_break + 2
                            break
        
        # Add the chunk
        chunk = text[start:end].strip()
        if chunk:  # Only add non-empty chunks
            chunks.append(chunk)
        
        # Move to the next chunk, with overlap if not at the end
        start = max(start, end - overlap) if end < len(text) else end
    
    return chunks

def classify_clauses(text):
    """Use DeepInfra Llama to classify clauses in the text."""
    
    # Log the first part of the chunk being processed
    logger.info(f"Processing chunk of length {len(text)}: {text[:200]}...")
    
    prompt = f"""Given the following contract excerpt, please identify and classify any of the following types of clauses - if applicable:
    {', '.join(CLAUSE_TYPES)}
    
    For each identified clause, provide:
    1. The clause type
    2. The relevant text
    3. A confidence score (0-100)
    
    Only return clauses if you are more than 80% confident in the classification.
    Return your analysis as a JSON object with this structure:
    {{
      "clauses": [
        {{
          "clause_type": "<type>",
          "text": "<extracted text>",
          "confidence": <number 0-100>
        }},
        ...
      ]
    }}
    
    If no clauses are found, return {{"clauses": []}}.
    
    Contract excerpt:
    {text}
    """
    
    # Use DeepInfra Llama instead of OpenAI
    system_prompt = "You are an AI assistant specialized in legal contract analysis. Extract and classify contract clauses accurately, focusing on precision and consistency. Only include clauses with confidence level > 80%. Always respond in valid JSON format with a 'clauses' array, even if empty."
    raw_response = call_deepinfra_llama(prompt, system_prompt)
    
    try:
        # Log the raw response for debugging
        logger.info(f"Raw API response: {raw_response[:200]}...")
        
        # First, try to parse the JSON response
        try:
            result = json.loads(raw_response)
        except json.JSONDecodeError as e:
            # If the response isn't valid JSON, try to extract and repair the JSON part
            logger.warning(f"Invalid JSON response: {str(e)}")
            
            # Try to extract JSON between curly braces
            import re
            json_match = re.search(r'({.*})', raw_response, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group(1))
                    logger.info("Successfully extracted JSON from response")
                except:
                    logger.error("Failed to parse extracted JSON")
                    return []
            else:
                logger.error("Could not extract JSON from response")
                return []
        
        # Handle different response formats and normalize to a list of clauses
        clauses = []
        
        # Case 1: Response has a "clauses" key with an array
        if isinstance(result, dict) and "clauses" in result and isinstance(result["clauses"], list):
            clauses = result["clauses"]
            logger.info(f"Response has 'clauses' key with {len(clauses)} clause(s)")
        
        # Case 2: Response is already a list of clauses
        elif isinstance(result, list):
            # Check if items look like clauses (have clause_type, text, confidence)
            if all(isinstance(item, dict) and "clause_type" in item for item in result):
                clauses = result
                logger.info(f"Response is a list with {len(clauses)} clause(s)")
        
        # Case 3: Response is a single clause object
        elif isinstance(result, dict) and "clause_type" in result and "text" in result:
            clauses = [result]
            logger.info("Response is a single clause object, wrapping in list")
        
        # Case 4: Response has clause types as keys
        elif isinstance(result, dict):
            for clause_type in CLAUSE_TYPES:
                if clause_type in result:
                    # Handle different possible structures
                    if isinstance(result[clause_type], dict) and "text" in result[clause_type]:
                        # Format: {"licence_scope": {"text": "...", "confidence": 90}}
                        clauses.append({
                            "clause_type": clause_type,
                            "text": result[clause_type].get("text", ""),
                            "confidence": result[clause_type].get("confidence", 50)
                        })
                    elif isinstance(result[clause_type], str) and result[clause_type]:
                        # Format: {"licence_scope": "text..."}
                        clauses.append({
                            "clause_type": clause_type,
                            "text": result[clause_type],
                            "confidence": 70  # Default confidence
                        })
            
            if clauses:
                logger.info(f"Extracted {len(clauses)} clause(s) from keys")
        
        # Filter out empty or invalid clauses
        valid_clauses = []
        for clause in clauses:
            if not isinstance(clause, dict):
                continue
                
            # Ensure all required fields exist
            if "clause_type" not in clause or "text" not in clause:
                continue
            if clause.get('text') is None:
                clause['text'] = ""
            # Skip clauses that have no text or "not found" as text
            text = clause.get("text", "").strip()
            if not text or text.lower() in ["not found", "not explicitly found", "none", "n/a"]:
                continue
                
            # Ensure confidence is a number
            if "confidence" not in clause:
                clause["confidence"] = 70
            elif not isinstance(clause["confidence"], (int, float)):
                try:
                    clause["confidence"] = int(clause["confidence"])
                except:
                    clause["confidence"] = 70
            
            # Only include clauses with confidence > 80
            if clause["confidence"] > 80:
                valid_clauses.append(clause)
            else:
                logger.info(f"Skipping clause of type '{clause.get('clause_type', 'unknown')}' with confidence {clause.get('confidence', 0)} (below threshold)")
                    
        # Log the final extracted clauses
        if valid_clauses:
            logger.info(f"Successfully extracted {len(valid_clauses)} valid high-confidence clause(s): {str(valid_clauses)[:200]}...")
        else:
            logger.warning(f"No valid high-confidence clauses found in the chunk. Response structure: {str(result)[:200]}...")
        
        return valid_clauses
            
    except Exception as e:
        logger.error(f"Error in classify_clauses: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
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
            
            # Use DeepInfra Llama instead of OpenAI
            system_prompt = "You are an AI assistant specialized in legal contract analysis. Analyze the differences between contract clauses accurately and provide risk assessments. Always respond in valid JSON format with these exact keys: 'analysis' and 'risk_score'."
            raw_response = call_deepinfra_llama(prompt, system_prompt)
            
            try:
                # First try to parse the raw response
                try:
                    result = json.loads(raw_response)
                except json.JSONDecodeError:
                    # If that fails, try to extract JSON from the response
                    import re
                    json_match = re.search(r'({.*})', raw_response, re.DOTALL)
                    if json_match:
                        try:
                            result = json.loads(json_match.group(1))
                            logger.info("Successfully extracted JSON from response")
                        except:
                            logger.error("Failed to extract valid JSON")
                            # Use a default result
                            result = {
                                "analysis": "Error parsing response: Invalid JSON format",
                                "risk_score": 5
                            }
                    else:
                        # If we can't extract JSON, create a default result
                        logger.error("Could not extract JSON from response")
                        result = {
                            "analysis": "Error parsing response: No JSON found",
                            "risk_score": 5
                        }
                
                # Validate that the result has the expected keys
                if not isinstance(result, dict):
                    logger.warning(f"Result is not a dictionary: {type(result)}")
                    result = {"analysis": "Invalid response format", "risk_score": 5}
                
                # Ensure we have the required fields with valid values
                analysis = result.get("analysis")
                if not analysis or not isinstance(analysis, str):
                    analysis = "No analysis provided"
                
                risk_score = result.get("risk_score")
                if not isinstance(risk_score, (int, float)):
                    try:
                        risk_score = int(risk_score)
                    except:
                        risk_score = 5
                
                # Ensure risk score is within range
                risk_score = max(1, min(10, risk_score))
                
                comparison.append({
                    "clause_type": clause_type,
                    "template_text": template_clause["text"],
                    "draft_text": draft_clause["text"],
                    "analysis": analysis,
                    "risk_score": risk_score
                })
                
            except Exception as e:
                logger.error(f"Error in compare_clauses: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                
                comparison.append({
                    "clause_type": clause_type,
                    "template_text": template_clause["text"],
                    "draft_text": draft_clause["text"],
                    "analysis": f"Error analyzing clauses: {str(e)}",
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

def highlight_text_differences(template_text, draft_text, highlight_template=True):
    """
    Highlights differences between template and draft text at the word level.
    Returns HTML-formatted text with highlighting.
    If highlight_template is False, only highlight changes in the draft version.
    """
    # Use difflib to find differences at the word level
    import re
    
    # Split texts into words and spaces for more precise diffing
    def split_into_words(text):
        # This regex preserves spaces and punctuation as separate tokens
        return re.findall(r'\S+|\s+', text)
    
    template_words = split_into_words(template_text)
    draft_words = split_into_words(draft_text)
    
    # Use difflib to get differences at the word level
    diff = difflib.ndiff(template_words, draft_words)
    
    # Process diff output to create highlighted HTML
    html_output = []
    
    # Group consecutive items of the same type for better rendering
    current_type = None  # can be 'removed', 'added', or 'unchanged'
    current_group = []
    
    for line in diff:
        if line.startswith('- '):
            # Word only in template (removed)
            if current_type != 'removed' and current_group:
                # Process previous group
                if current_type == 'unchanged':
                    html_output.append(''.join(current_group))
                elif current_type == 'added':
                    html_output.append(f'<span style="background-color: #ccffcc;">{"".join(current_group)}</span>')
                current_group = []
            
            current_type = 'removed'
            # Only include removed text if we're highlighting template changes
            if highlight_template:
                current_group.append(line[2:])
            
        elif line.startswith('+ '):
            # Word only in draft (added)
            if current_type != 'added' and current_group:
                # Process previous group
                if current_type == 'unchanged':
                    html_output.append(''.join(current_group))
                elif current_type == 'removed' and highlight_template:
                    html_output.append(f'<span style="background-color: #ffcccc; text-decoration: line-through;">{"".join(current_group)}</span>')
                current_group = []
            
            current_type = 'added'
            current_group.append(line[2:])
            
        elif line.startswith('  '):
            # Word in both versions (unchanged)
            if current_type != 'unchanged' and current_group:
                # Process previous group
                if current_type == 'removed' and highlight_template:
                    html_output.append(f'<span style="background-color: #ffcccc; text-decoration: line-through;">{"".join(current_group)}</span>')
                elif current_type == 'added':
                    html_output.append(f'<span style="background-color: #ccffcc;">{"".join(current_group)}</span>')
                current_group = []
            
            current_type = 'unchanged'
            current_group.append(line[2:])
    
    # Process the last group
    if current_group:
        if current_type == 'unchanged':
            html_output.append(''.join(current_group))
        elif current_type == 'removed' and highlight_template:
            html_output.append(f'<span style="background-color: #ffcccc; text-decoration: line-through;">{"".join(current_group)}</span>')
        elif current_type == 'added':
            html_output.append(f'<span style="background-color: #ccffcc;">{"".join(current_group)}</span>')
    
    return ''.join(html_output)

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
        for i, chunk in enumerate(template_chunks):
            print(f"Processing chunk of length {len(chunk)}: {chunk[:200]}...")
            ############# DEBUGGING #############
            # Log the chunk being processed
            logger.info(f"Processing chunk of length {len(chunk)}: {chunk[:200]}...")
            ############# DEBUGGING #############
            clauses = classify_clauses(chunk)
             
            template_clauses.extend(clauses)

            # chill for 60 seconds to avoid rate limiting i%5
            if i+1 % 5 == 0:
               time.sleep(60)
        
        draft_clauses = []
        for chunk in draft_chunks:
            clauses = classify_clauses(chunk)
            draft_clauses.extend(clauses)
        
        # Compare clauses
        comparison = compare_clauses(template_clauses, draft_clauses)
        
        # Add highlighted differences only to the draft text, not the template text
        for item in comparison:
            if item["template_text"] and item["draft_text"]:
                # Only highlight the draft text, showing what changed from the template
                item["highlighted_draft_diff"] = highlight_text_differences(item["template_text"], item["draft_text"], highlight_template=False)
        
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
            # Only highlight changes in the draft text, not the template
            response_data["highlighted_draft_diff"] = highlight_text_differences(template_text, draft_text, highlight_template=False)
        
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

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """API endpoint to retrieve recent logs."""
    logs = []
    
    # Get all logs from the queue without removing them
    queue_size = log_queue.qsize()
    for _ in range(queue_size):
        try:
            log = log_queue.get(block=False)
            logs.append(log)
            log_queue.put(log)  # Put it back
        except queue.Empty:
            break
    
    # Sort logs by timestamp (most recent first)
    logs.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify({"logs": logs})

@app.route('/api/generate-amendment', methods=['POST'])
def generate_amendment():
    """API endpoint to generate an amendment suggestion for a clause."""
    # Check if we have all required fields
    if not request.json:
        return jsonify({"error": "Request must be JSON"}), 400
    
    data = request.json
    if not all(k in data for k in ['template_text', 'draft_text', 'clause_type', 'analysis']):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Get user-provided prompt if available, otherwise use default
    custom_prompt = data.get('custom_prompt', '')
    
    # Construct the prompt for the LLM
    if custom_prompt:
        # User has provided a custom prompt template
        # Replace placeholders with actual values
        prompt = custom_prompt.replace('{clause_type}', data['clause_type'])
        prompt = prompt.replace('{template_text}', data['template_text'])
        prompt = prompt.replace('{draft_text}', data['draft_text'])
        prompt = prompt.replace('{analysis}', data['analysis'])
    else:
        # Use default prompt with improved structure for better formatting and explanation
        prompt = f"""
        You are a legal expert tasked with drafting an amendment to resolve differences between 
        clauses in a contract negotiation. Here are the details:

        CLAUSE TYPE: {data['clause_type']}

        TEMPLATE VERSION:
        {data['template_text']}

        DRAFT VERSION:
        {data['draft_text']}

        ANALYSIS OF DIFFERENCES:
        {data['analysis']}

        Please draft a balanced amendment that:
        1. Addresses the key differences between the versions
        2. Creates a fair compromise that protects both parties' interests
        3. Uses clear, precise legal language
        4. Is formatted as a proper contract clause

        Present your response in the following format:
        {{
            "amendment_title": "Concise title for the amendment",
            "amendment_text": "The full text of the proposed amendment clause, properly formatted with paragraph breaks where appropriate",
            "explanation": "A clear explanation of why you made these specific changes and how they address the differences between the versions. Include the reasoning behind any compromises."
        }}
        """
    
    # Use the LLM to generate amendment
    system_prompt = "You are an expert legal advisor specializing in contract drafting and negotiation. Create precise, balanced amendment language that addresses the differences between contract clauses. Always respond with well-structured, clearly formatted text."
    
    try:
        raw_response = call_deepinfra_llama(prompt, system_prompt)
        
        # Parse response and format as JSON
        try:
            response_data = json.loads(raw_response)
            
            # Check if we have our expected structure
            if isinstance(response_data, dict):
                # If using our preferred format with separate fields
                if 'amendment_text' in response_data and 'explanation' in response_data:
                    amendment_text = response_data.get('amendment_text', '')
                    explanation = response_data.get('explanation', '')
                    amendment_title = response_data.get('amendment_title', data['clause_type'].title() + ' Amendment')
                # If the model returned a single key with the clause type
                elif data['clause_type'] in response_data:
                    amendment_text = response_data[data['clause_type']]
                    explanation = "No detailed explanation provided."
                    amendment_title = data['clause_type'].title() + ' Amendment'
                # If it's some other format, just grab what we can
                elif 'amendment' in response_data:
                    amendment_text = response_data['amendment']
                    explanation = response_data.get('explanation', 'No detailed explanation provided.')
                    amendment_title = data['clause_type'].title() + ' Amendment'
                else:
                    # Use the first key as title and its value as amendment text
                    first_key = next(iter(response_data))
                    amendment_text = response_data[first_key]
                    explanation = "No detailed explanation provided."
                    amendment_title = first_key
            else:
                # Fallback for unexpected response format
                amendment_text = raw_response
                explanation = "No detailed explanation provided."
                amendment_title = data['clause_type'].title() + ' Amendment'
                
        except json.JSONDecodeError:
            # If it's not JSON, just use the raw text as the amendment
            amendment_text = raw_response
            explanation = "No detailed explanation provided."
            amendment_title = data['clause_type'].title() + ' Amendment'
            
            # Try to extract structured information from non-JSON response
            import re
            
            # Try to find a title
            title_match = re.search(r'^(?:#+\s*)?(.*?Amendment.*?)(?:\n|$)', amendment_text, re.IGNORECASE | re.MULTILINE)
            if title_match:
                amendment_title = title_match.group(1).strip()
            
            # Try to find explanation section
            explanation_match = re.search(r'(?:explanation|rationale|reasoning):\s*(.*?)(?:\n\n|\n#|\Z)', 
                                        amendment_text, re.IGNORECASE | re.DOTALL)
            if explanation_match:
                explanation = explanation_match.group(1).strip()
                # Remove this section from amendment_text
                amendment_text = amendment_text.replace(explanation_match.group(0), '').strip()
            
            # Clean up the text - remove markdown code blocks if present
            code_block_match = re.search(r'```(?:.*?)\n(.*?)```', amendment_text, re.DOTALL)
            if code_block_match:
                amendment_text = code_block_match.group(1).strip()
        
        # Format the amendment text with proper line breaks for readability
        formatted_amendment = amendment_text.replace('. ', '.\n').replace('.\n\n', '.\n')
        
        return jsonify({
            "amendment_title": amendment_title,
            "amendment": formatted_amendment, 
            "explanation": explanation,
            "clause_type": data['clause_type']
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)