import { useRef, useEffect, useState } from 'react'

interface SyncScrollPanelsProps {
  leftContent: React.ReactNode
  rightContent: React.ReactNode
  leftTitle?: string
  rightTitle?: string
  leftText?: string  // Plain text version for diff comparison
  rightText?: string // Plain text version for diff comparison
}

// Helper function to safely encode text for HTML
const safeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Find the differences between two strings at word level
const findWordDiff = (text1: string, text2: string): { text1Html: string, text2Html: string } => {
  // Split strings into words, keeping spaces and punctuation
  const words1 = text1.match(/\S+|\s+/g) || [];
  const words2 = text2.match(/\S+|\s+/g) || [];
  
  // Simple Longest Common Subsequence algorithm to find matching subsequences
  const lcsTable: number[][] = Array(words1.length + 1).fill(null).map(() => Array(words2.length + 1).fill(0));
  
  // Fill the LCS table
  for (let i = 1; i <= words1.length; i++) {
    for (let j = 1; j <= words2.length; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        lcsTable[i][j] = lcsTable[i - 1][j - 1] + 1;
      } else {
        lcsTable[i][j] = Math.max(lcsTable[i - 1][j], lcsTable[i][j - 1]);
      }
    }
  }
  
  // Reconstruct the diff
  let text1Html = '';
  let text2Html = '';
  let i = words1.length;
  let j = words2.length;
  
  const commonWords: string[] = [];
  const text1Words: string[] = [];
  const text2Words: string[] = [];
  
  while (i > 0 && j > 0) {
    if (words1[i - 1] === words2[j - 1]) {
      // Common word - add to the beginning of the array
      commonWords.unshift(words1[i - 1]);
      text1Words.unshift(words1[i - 1]);
      text2Words.unshift(words2[j - 1]);
      i--;
      j--;
    } else if (lcsTable[i - 1][j] >= lcsTable[i][j - 1]) {
      // Word only in text1
      text1Words.unshift(`<span class="bg-red-100">${safeHtml(words1[i - 1])}</span>`);
      i--;
    } else {
      // Word only in text2
      text2Words.unshift(`<span class="bg-green-100">${safeHtml(words2[j - 1])}</span>`);
      j--;
    }
  }
  
  // Add any remaining words
  while (i > 0) {
    text1Words.unshift(`<span class="bg-red-100">${safeHtml(words1[i - 1])}</span>`);
    i--;
  }
  
  while (j > 0) {
    text2Words.unshift(`<span class="bg-green-100">${safeHtml(words2[j - 1])}</span>`);
    j--;
  }
  
  text1Html = text1Words.join('');
  text2Html = text2Words.join('');
  
  return { text1Html, text2Html };
}

export function SyncScrollPanels({ 
  leftContent, 
  rightContent, 
  leftTitle = 'Template Version', 
  rightTitle = 'Draft Version',
  leftText,
  rightText
}: SyncScrollPanelsProps) {
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [processedLeftContent, setProcessedLeftContent] = useState<React.ReactNode>(leftContent)
  const [processedRightContent, setProcessedRightContent] = useState<React.ReactNode>(rightContent)
  
  // Process the text to highlight differences when showDiff is true
  useEffect(() => {
    if (showDiff && leftText && rightText) {
      try {
        // Split content into lines for comparison
        const leftLines = leftText.split('\n')
        const rightLines = rightText.split('\n')
        
        // Create highlighted HTML
        let highlightedLeft = '<div class="whitespace-pre-wrap font-mono text-sm">'
        let highlightedRight = '<div class="whitespace-pre-wrap font-mono text-sm">'
        
        // Find max length to compare
        const maxLength = Math.max(leftLines.length, rightLines.length)
        
        for (let i = 0; i < maxLength; i++) {
          const leftLine = i < leftLines.length ? leftLines[i] : ''
          const rightLine = i < rightLines.length ? rightLines[i] : ''
          
          if (leftLine !== rightLine) {
            // Different lines - highlight specific words that differ
            const { text1Html, text2Html } = findWordDiff(leftLine, rightLine);
            highlightedLeft += `<div class="py-1">${text1Html}</div>`
            highlightedRight += `<div class="py-1">${text2Html}</div>`
          } else {
            // Same lines - no highlight
            highlightedLeft += `<div class="py-1">${safeHtml(leftLine)}</div>`
            highlightedRight += `<div class="py-1">${safeHtml(rightLine)}</div>`
          }
        }
        
        highlightedLeft += '</div>'
        highlightedRight += '</div>'
        
        setProcessedLeftContent(<div dangerouslySetInnerHTML={{ __html: highlightedLeft }} />)
        setProcessedRightContent(<div dangerouslySetInnerHTML={{ __html: highlightedRight }} />)
      } catch (error) {
        console.error('Error highlighting diffs:', error)
        setProcessedLeftContent(leftContent)
        setProcessedRightContent(rightContent)
      }
    } else {
      // If not showing diff, use original content
      setProcessedLeftContent(leftContent)
      setProcessedRightContent(rightContent)
    }
  }, [showDiff, leftContent, rightContent, leftText, rightText])
  
  // Synchronize scrolling between the two panels
  useEffect(() => {
    const leftPanel = leftPanelRef.current
    const rightPanel = rightPanelRef.current
    
    if (!leftPanel || !rightPanel) return
    
    const handleLeftScroll = () => {
      if (rightPanel) {
        rightPanel.scrollTop = leftPanel.scrollTop
      }
    }
    
    const handleRightScroll = () => {
      if (leftPanel) {
        leftPanel.scrollTop = rightPanel.scrollTop
      }
    }
    
    leftPanel.addEventListener('scroll', handleLeftScroll)
    rightPanel.addEventListener('scroll', handleRightScroll)
    
    return () => {
      leftPanel.removeEventListener('scroll', handleLeftScroll)
      rightPanel.removeEventListener('scroll', handleRightScroll)
    }
  }, [])
  
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="font-semibold text-xl text-blue-800">Document Comparison</h3>
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <span className="mr-3 text-sm font-medium text-blue-900">Highlight Differences</span>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={showDiff}
                onChange={() => setShowDiff(!showDiff)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[70vh]">
        <div className="flex flex-col h-full">
          <div className="bg-blue-50 p-3 rounded-t-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800">{leftTitle}</h3>
          </div>
          <div 
            ref={leftPanelRef}
            className="flex-1 overflow-auto p-4 bg-white border border-blue-200 border-t-0 rounded-b-lg shadow-sm"
          >
            {processedLeftContent}
          </div>
        </div>
        
        <div className="flex flex-col h-full">
          <div className="bg-blue-50 p-3 rounded-t-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800">{rightTitle}</h3>
          </div>
          <div 
            ref={rightPanelRef}
            className="flex-1 overflow-auto p-4 bg-white border border-blue-200 border-t-0 rounded-b-lg shadow-sm"
          >
            {processedRightContent}
          </div>
        </div>
      </div>
      
      {showDiff && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 mr-2"></div>
              <span className="text-sm text-blue-800">Removed/Changed in Template</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 mr-2"></div>
              <span className="text-sm text-blue-800">Added/Changed in Draft</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}