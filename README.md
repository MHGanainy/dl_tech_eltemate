# Conflicto - IP Agreement Analysis Tool

IP Contract Analysis Tool to compare legal contracts (1x template, 1x new draft) for key clauses, potential conflicts, and risks. The tool will highlight areas that may require further legal review.


### Backend (Python)
- **Framework**: Flask API
- **Document Processing**: PyPDF2 for PDF parsing, python-docx for DOCX handling
- **Text Analysis**: Deepinfra/Llama API integration for clause extraction and comparison

### Frontend (Next.js/TypeScript)
- **Framework**: Next.js 14 with TypeScript
- **UI Components**: Custom Tailwind CSS components
- **Contract Display**: Two-panel synchronized scrolling interface
- **File Handling**: Drag-and-drop upload functionality for DOCX/PDF

### Core Features
1. **Document Processing Pipeline**:
   - PDF/DOCX parsing
   - Paragraph-based chunking
   - Structured text extraction

2. **Legal Analysis Engine**:
   - Clause classification using LLM with few-shot prompting
   - Key clause extraction (license scope, ownership, patents, confidentiality, liability, etc.)
   - Risk assessment based on contract terms

3. **Comparison System**:
   - Semantic diff between template and draft
   - Highlighting of material changes
   - Plain-English explanations of differences

4. **User Experience**:
   - Risk meter visualization
   - One-click workflow from upload to analysis
   - Interactive highlighting of key findings

## Setup and Installation

### Backend Setup
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/dl_tech_eltemate.git
   cd dl_tech_eltemate
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables (create a `.env` file):
   ```
   DEEPINFRA_API_KEY=your_deepinfra_api_key
   OPENAI_API_KEY=your_deepinfra_api_key
   FLASK_APP=app.py
   FLASK_ENV=development
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd keynote-ts
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

### Running the Complete Application
1. Start the Python backend:
   ```
   flask run
   ```

2. In a separate terminal, start the Next.js frontend:
   ```
   cd keynote-ts
   npm run dev
   ```

3. Access the application at: `http://localhost:3000`
