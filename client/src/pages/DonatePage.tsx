import { useTheme } from '@/contexts/ThemeContext'
import { Button, Surface } from '@/components/ui'

const donationCards = [
  {
    title: 'Buy Me a Coffee',
    sub: 'One-time donation, any amount',
    url: 'https://buymeacoffee.com/larsmikki',
    label: 'Buy Me a Coffee',
  },
  {
    title: 'PayPal',
    sub: 'Quick and secure donation',
    url: 'https://paypal.me/larsmikki',
    label: 'Donate via PayPal',
  },
]

export default function DonatePage() {
  const { theme } = useTheme()

  return (
    <div className="min-h-full">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-text">Support Launchr</h1>
          <p className="text-sm mt-0.5 text-text2">
            I build privacy-first, self-hosted tools - no subscriptions, no ads, no tracking. Your data stays yours.
          </p>
        </div>

        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">What you get</h2>
          <p className="text-xs mb-5 text-text2">
            Launchr is and always will be free, open source, and self-hosted.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '100% free forever', color: '#16a34a' },
              { label: 'No ads or tracking', color: '#f59e0b' },
              { label: 'Your data, your device', color: theme.accent },
            ].map(({ label, color }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-lg text-xs font-semibold"
                style={{
                  padding: '6px 12px',
                  background: `${color}15`,
                  color,
                  border: `1px solid ${color}20`,
                }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L9 10.94 7.28 9.22a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z" clipRule="evenodd" />
                </svg>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">Donate</h2>
          <p className="text-xs mb-5 text-text2">
            One-time donations via Buy Me a Coffee or PayPal. Any amount is appreciated.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {donationCards.map(({ title, sub, url, label }) => (
              <div
                key={title}
                className="flex flex-col gap-4 p-6 rounded-xl"
                style={{ background: theme.surface2, border: `1px solid ${theme.border}` }}
              >
                <div>
                  <h3 className="text-base font-bold leading-snug text-text">{title}</h3>
                  <p className="text-xs mt-1 text-text2">{sub}</p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => window.open(url, '_blank')}
                >
                  {label}
                </Button>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6">
          <h2 className="text-base font-bold mb-1 text-text">Thank you</h2>
          <p className="text-xs m-0 text-text2">
            Every bit of support helps keep Launchr free for everyone.
          </p>
        </Surface>
      </div>
    </div>
  )
}
