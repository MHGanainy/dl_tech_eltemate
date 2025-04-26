'use client'

import { useEffect, useRef } from 'react'

interface RiskMeterProps {
  score: number
  className?: string
}

export function RiskMeter({ score, className = '' }: RiskMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Set dimensions based on canvas size
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10
    
    // Draw meter background (gray arc)
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false)
    ctx.lineWidth = 20
    ctx.strokeStyle = '#e5e7eb'
    ctx.stroke()
    
    // Calculate normalized score (0 to 1)
    const normalizedScore = Math.min(Math.max(score, 0), 10) / 10
    
    // Determine color based on score
    let color
    if (normalizedScore <= 0.3) {
      color = '#22c55e' // Green for low risk
    } else if (normalizedScore <= 0.7) {
      color = '#f59e0b' // Amber for medium risk
    } else {
      color = '#ef4444' // Red for high risk
    }
    
    // Draw score indicator (colored arc)
    ctx.beginPath()
    ctx.arc(
      centerX,
      centerY,
      radius,
      Math.PI,
      Math.PI + normalizedScore * Math.PI,
      false
    )
    ctx.lineWidth = 20
    ctx.strokeStyle = color
    ctx.stroke()
    
    // Draw needle
    const needleAngle = Math.PI + normalizedScore * Math.PI
    const needleLength = radius - 15
    
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(
      centerX + needleLength * Math.cos(needleAngle),
      centerY + needleLength * Math.sin(needleAngle)
    )
    ctx.lineWidth = 3
    ctx.strokeStyle = '#1e293b'
    ctx.stroke()
    
    // Draw central circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    
    // Add score text
    ctx.font = 'bold 24px sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.fillText(score.toFixed(1), centerX, centerY + radius + 30)
    
    // Add risk labels
    ctx.font = '14px sans-serif'
    ctx.fillStyle = '#6b7280'
    
    // Low risk label
    ctx.textAlign = 'left'
    ctx.fillText('Low', centerX - radius + 5, centerY + 25)
    
    // High risk label
    ctx.textAlign = 'right'
    ctx.fillText('High', centerX + radius - 5, centerY + 25)
    
  }, [score])
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <h3 className="text-lg font-semibold mb-2 text-blue-900">Risk Score</h3>
      <canvas 
        ref={canvasRef}
        width={200}
        height={120}
        className="w-full max-w-[200px]"
      />
    </div>
  )
}