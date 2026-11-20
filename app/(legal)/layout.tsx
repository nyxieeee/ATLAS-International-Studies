import Link from 'next/link';
import {legalDocuments,operator} from '@/lib/legal';
export default function LegalLayout({children}:{children:React.ReactNode}){return <div className="legal-shell"><header><Link className="legal-brand" href="/">ATLAS <span>by {operator}</span></Link><Link href="/login">Sign in</Link></header><div className="legal-layout"><nav aria-label="Legal documents">{Object.entries(legalDocuments).map(([id,doc])=><Link key={id} href={'/'+id}>{doc.title}</Link>)}</nav><main>{children}</main></div><footer>{operator} · Philippines</footer></div>}
