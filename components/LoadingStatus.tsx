import {RefreshCw} from 'lucide-react';

export default function LoadingStatus({title,description}:{title:string;description:string}) {
 return <div className="data-loading-status" role="status" aria-live="polite" aria-atomic="true">
  <RefreshCw size={16} aria-hidden="true"/>
  <div><strong>{title}</strong><span>{description}</span></div>
 </div>;
}
