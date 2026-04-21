import React from 'react'

interface GlassProps {
  className?: string
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
  style?: React.CSSProperties
  [key: string]: unknown
}

export function Glass({ className = '', children, as: Tag = 'div', style, ...rest }: GlassProps) {
  const T = Tag as React.ElementType
  return (
    <T
      {...rest}
      className={'relative isolate overflow-hidden ' + className}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.22) 45%, rgba(255,255,255,0.06) 100%)',
        backdropFilter: 'blur(28px) saturate(170%) brightness(0.92)',
        WebkitBackdropFilter: 'blur(28px) saturate(170%) brightness(0.92)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow:
          'inset 0 1px 0 0 rgba(255,255,255,0.28),' +
          'inset 0 -1px 0 0 rgba(255,255,255,0.04),' +
          'inset 1px 0 0 0 rgba(255,255,255,0.06),' +
          '0 30px 80px -20px rgba(0,0,0,0.65),' +
          '0 2px 6px rgba(0,0,0,0.4)',
        ...style,
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: 'radial-gradient(120% 60% at 0% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%)',
          mixBlendMode: 'screen',
        }}/>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: 'radial-gradient(80% 40% at 100% 100%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 60%)',
        }}/>
      <div className="relative">{children}</div>
    </T>
  )
}

export function GlassDark({ className = '', children, as: Tag = 'div', style, ...rest }: GlassProps) {
  const T = Tag as React.ElementType
  return (
    <T
      {...rest}
      className={'relative isolate overflow-hidden ' + className}
      style={{
        background: 'linear-gradient(135deg, rgba(14,14,16,0.82) 0%, rgba(32,32,38,0.70) 45%, rgba(14,14,16,0.80) 100%)',
        backdropFilter: 'blur(18px) saturate(150%)',
        WebkitBackdropFilter: 'blur(18px) saturate(150%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow:
          'inset 0 1px 0 0 rgba(255,255,255,0.10),' +
          'inset 0 -1px 0 0 rgba(255,255,255,0.02),' +
          '0 24px 48px -14px rgba(15,15,20,0.22),' +
          '0 2px 4px rgba(15,15,20,0.10)',
        color: '#f5f5f5',
        ...style,
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: 'radial-gradient(120% 60% at 0% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)',
        }}/>
      <div className="relative">{children}</div>
    </T>
  )
}

export function GlassIcon({ size = 40, children, className = '', tone = 'dark' }: {
  size?: number
  children: React.ReactNode
  className?: string
  tone?: 'dark' | 'light'
}) {
  const isLight = tone === 'light'
  return (
    <span
      className={'relative inline-grid place-items-center rounded-full overflow-hidden ' + className}
      style={{
        width: size,
        height: size,
        background: isLight
          ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.12) 100%)'
          : 'linear-gradient(135deg, rgba(20,20,22,0.92) 0%, rgba(48,48,54,0.78) 45%, rgba(20,20,22,0.92) 100%)',
        backdropFilter: 'blur(14px) saturate(180%) brightness(1.05)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%) brightness(1.05)',
        border: isLight ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.12)',
        boxShadow: isLight
          ? 'inset 0 1px 0 0 rgba(255,255,255,0.45), 0 6px 18px -6px rgba(0,0,0,0.55)'
          : 'inset 0 1px 0 0 rgba(255,255,255,0.14), 0 8px 20px -6px rgba(15,15,20,0.28)',
        color: 'white',
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: isLight
            ? 'radial-gradient(120% 60% at 25% 10%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)'
            : 'radial-gradient(120% 60% at 25% 10%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%)',
          mixBlendMode: 'screen',
        }}/>
      <span className="relative">{children}</span>
    </span>
  )
}
