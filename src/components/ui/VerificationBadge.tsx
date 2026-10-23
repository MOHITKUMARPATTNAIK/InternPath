import React from 'react';
import { VerificationStatus } from '@/types';
import { ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  status: VerificationStatus;
  showText?: boolean;
  className?: string;
}

export function VerificationBadge({ status, showText = true, className = '' }: Props) {
  if (status === 'official_verified') {
    return (
      <span
        title="Verified directly from the institution's official portal or department notice"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        {showText && <span>Official Source Verified</span>}
      </span>
    );
  }

  if (status === 'source_checked') {
    return (
      <span
        title="Portal monitored and verified by InternPath automated health checks"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80 ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        {showText && <span>Checked by InternPath</span>}
      </span>
    );
  }

  return (
    <span
      title="Listing submitted and currently under review by our verification team"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
      {showText && <span>Pending Verification</span>}
    </span>
  );
}
