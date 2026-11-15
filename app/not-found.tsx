import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
export default function NotFound(){return <AuthShell><div className="auth-state"><p className="auth-overline">404 / OFF THE MAP</p><div className="auth-404" aria-hidden="true">404<span>✧</span></div><h1>A little off course.</h1><p>This page isn’t on the map. The link may have changed, or the address may be incomplete.</p><Link className="auth-primary" href="/">Back to your workspace <span aria-hidden="true">→</span></Link><Link href="/login">Looking for sign in?</Link></div></AuthShell>}
