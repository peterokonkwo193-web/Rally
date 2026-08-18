import logo from '../assets/rally-logo.png'

// Source asset is black wordmark on a transparent background — inverted to
// white so it reads against the app's dark theme everywhere it's used.
export function RallyLogo({ className = 'w-40' }: { className?: string }) {
  return <img src={logo} alt="Rally" className={`invert ${className}`} />
}
