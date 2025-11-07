import React from 'react'

type ESILogoProps = {
  width?: number
  height?: number
  variant?: 'horizontal' | 'square' | 'icon'
}

export default function ESILogo({ width = 200, height = 60, variant = 'horizontal' }: ESILogoProps) {
  const aspectRatio = 200 / 60
  const calculatedHeight = width / aspectRatio
  
  // Official ESI logo - horizontal design with blue and black sections
  return (
    <svg 
      width={width} 
      height={height || calculatedHeight} 
      viewBox="0 0 200 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Blue left section - medium blue background */}
      <rect width="80" height="60" fill="#2563eb"/>
      
      {/* ESI text - large, bold, white, uppercase */}
      <text 
        x="40" 
        y="38" 
        fontSize="26" 
        fill="white" 
        textAnchor="middle" 
        fontWeight="bold" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="1.5"
      >
        ESI
      </text>
      
      {/* Partial circle (incomplete parenthesis) framing ESI from left */}
      <path 
        d="M 10 10 Q 10 3 18 3" 
        stroke="white" 
        strokeWidth="1.8" 
        fill="none"
        strokeLinecap="round"
      />
      <path 
        d="M 10 50 Q 10 57 18 57" 
        stroke="white" 
        strokeWidth="1.8" 
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Planet symbol (Saturn-like) above the 'I' */}
      <circle cx="55" cy="16" r="3" fill="white"/>
      <ellipse cx="55" cy="16" rx="4.5" ry="1" fill="none" stroke="white" strokeWidth="1"/>
      
      {/* Three arrowheads pointing right - decreasing size and lightness */}
      {/* First arrow - largest, darkest blue */}
      <path 
        d="M 67 24 L 72 30 L 67 36 Z" 
        fill="#3b82f6" 
        stroke="#3b82f6" 
        strokeWidth="0.5"
      />
      {/* Second arrow - medium size, lighter blue */}
      <path 
        d="M 72 25 L 77 30 L 72 35 Z" 
        fill="#60a5fa" 
        stroke="#60a5fa" 
        strokeWidth="0.5"
      />
      {/* Third arrow - smallest, lightest blue */}
      <path 
        d="M 77 26 L 81 30 L 77 34 Z" 
        fill="#93c5fd" 
        stroke="#93c5fd" 
        strokeWidth="0.5"
      />
      
      {/* Black right section */}
      <rect x="80" width="120" height="60" fill="#000000"/>
      
      {/* Arabic text - Top line: مدرسة علوم المعلومات */}
      <text 
        x="140" 
        y="15" 
        fontSize="8.5" 
        fill="white" 
        textAnchor="middle" 
        fontFamily="Arial, Helvetica, sans-serif"
        direction="rtl"
        xmlLang="ar"
      >
        مدرسة علوم المعلومات
      </text>
      
      {/* Tifinagh text - Middle line */}
      <text 
        x="140" 
        y="31" 
        fontSize="7.5" 
        fill="white" 
        textAnchor="middle" 
        fontFamily="Arial, Helvetica, sans-serif"
      >
        +≤ІСИ | С.ΘΘΙΣΙ | ΣΙΨΕΣΟΙ
      </text>
      
      {/* French text - Bottom line: ECOLE DES SCIENCES DE L'INFORMATION */}
      <text 
        x="140" 
        y="47" 
        fontSize="6.5" 
        fill="white" 
        textAnchor="middle" 
        fontFamily="Arial, Helvetica, sans-serif" 
        fontWeight="600"
        letterSpacing="0.3"
      >
        ECOLE DES SCIENCES DE L&apos;INFORMATION
      </text>
    </svg>
  )
}

