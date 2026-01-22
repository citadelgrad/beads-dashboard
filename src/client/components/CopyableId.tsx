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
      setTimeout(() => setCopied(false), 2000);
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
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  }, [fullId]);

  const display = displayId || (fullId.includes('-') ? fullId.split('-').pop() : fullId);

  return (
    <button
      onClick={handleCopy}
      className={`group relative inline-flex items-center gap-1.5 font-mono text-sm text-slate-500
                  hover:text-slate-700 transition-colors cursor-pointer ${className}`}
      title={copied ? 'Copied!' : `Click to copy: ${fullId}`}
      aria-label={copied ? 'Copied to clipboard' : `Copy ${fullId} to clipboard`}
    >
      <span className={`transition-all duration-300 ${copied ? 'text-green-600' : ''}`}>
        {display}
      </span>
      {showIcon && (
        <span className={`transition-all duration-300 ${copied ? 'text-green-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>
          {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
        </span>
      )}
      {/* Floating tooltip */}
      {copied && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
          Copied!
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-600 rotate-45" />
        </span>
      )}
    </button>
  );
}

export default CopyableId;
