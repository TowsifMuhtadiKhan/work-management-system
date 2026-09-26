export function PlatformIcon({ platform }: { platform: 'YouTube link' | 'Facebook link' | 'Drive link' }) {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" role="img" aria-label={platform}>
    {platform === 'YouTube link' ? <><rect x="1" y="4" width="22" height="16" rx="5" fill="#ff0033" /><path d="m10 8 6 4-6 4Z" fill="white" /></> : platform === 'Facebook link' ? <><rect width="24" height="24" rx="5" fill="#1877f2" /><path d="M14 24V14h3l.5-4H14V8c0-1.2.4-2 2-2h2V2.5A25 25 0 0 0 15 2c-3 0-5 1.8-5 5v3H7v4h3v10Z" fill="white" /></> : <><path d="m8 2 8 0 8 14h-8Z" fill="#fbbc04" /><path d="M8 2 0 16l4 7 8-14Z" fill="#34a853" /><path d="M0 16h24l-4 7H4Z" fill="#4285f4" /></>}
  </svg>
}
