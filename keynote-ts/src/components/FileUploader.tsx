'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/Button'

interface FileUploaderProps {
  label: string
  onFileSelected: (file: File) => void
  selectedFile: File | null
}

export function FileUploader({ label, onFileSelected, selectedFile }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        onFileSelected(file)
      } else {
        alert('Please upload a PDF or DOCX file')
      }
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        onFileSelected(file)
      } else {
        alert('Please upload a PDF or DOCX file')
      }
    }
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2 text-blue-900">{label}</h3>
      <div 
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          className="hidden"
          ref={inputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx"
        />
        {selectedFile ? (
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full">
              {selectedFile.name.endsWith('.pdf') ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
            <p className="mt-1 text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
            <Button 
              className="mt-3 py-2 px-3 text-sm"
              onClick={(e) => {
                e.stopPropagation()
                onFileSelected(null as any)
              }}
            >
              Change File
            </Button>
          </div>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-base font-medium text-gray-700">Drag and drop your file here</p>
            <p className="mt-1 text-sm text-gray-500">or click to browse</p>
            <p className="mt-3 text-xs text-gray-400">Supports PDF, DOCX</p>
          </>
        )}
      </div>
    </div>
  )
}