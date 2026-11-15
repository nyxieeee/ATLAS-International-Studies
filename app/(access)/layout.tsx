import AuthShell from '@/components/AuthShell';
import type {ReactNode} from 'react';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default function AccountLayout({children}:{children:ReactNode}){return <AuthShell>{children}</AuthShell>}
