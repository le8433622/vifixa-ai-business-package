'use client'

interface CompanionAvatarProps {
  persona: 'customer' | 'worker' | 'admin'
  size?: number // in pixels, default 40
}

export default function CompanionAvatar({ persona, size = 40 }: CompanionAvatarProps) {
  // Get avatar icon based on persona
  const getAvatarIcon = () => {
    switch (persona) {
      case 'customer': return '🏠'
      case 'worker': return '🔧'
      case 'admin': return '🛡️'
      default: return '🤖'
    }
  }

  return (
    <div className={`flex items-center justify-center w-[${size}px] h-[${size}px] rounded-full bg-blue-100 text-${size > 32 ? '2xl' : 'xl'}`}>
      {getAvatarIcon()}
    </div>
  )
}