import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableIdProps {
  fullId: string;
  displayId?: string;
  className?: string;
  showIcon?: boolean;
}

function CopyableId({ fullId, displayId, className = '', showIcon = true }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(fullId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500); // 1.5s per arch review
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = fullId;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  }, [fullId]);

  const display = displayId || (fullId.includes('-') ? fullId.split('-').pop() : fullId);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 font-mono text-sm text-slate-500
                  hover:text-blue-600 transition-colors cursor-pointer ${className}`}
      title={copied ? 'Copied!' : `Click to copy: ${fullId}`}
      aria-label={copied ? 'Copied to clipboard' : `Copy ${fullId} to clipboard`}
    >
      <span>{display}</span>
      {showIcon && (
        <span className={`transition-all duration-200 ${copied ? 'text-green-500' : 'text-slate-400'}`}>
          {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
        </span>
      )}
    </button>
  );
}

export default CopyableId;
