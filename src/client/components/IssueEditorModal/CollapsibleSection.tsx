import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  allowOverflow?: boolean; // Allow content to overflow (for date pickers, dropdowns)
  children: ReactNode;
}

/**
 * A reusable collapsible section wrapper with smooth height animation.
 * Header is clickable to toggle expand/collapse state.
 * ChevronRight icon rotates 90 degrees when expanded.
 */
function CollapsibleSection({
  title,
  defaultExpanded = true,
  allowOverflow = false,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    defaultExpanded ? undefined : 0
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // Update content height when expanded state changes
  useEffect(() => {
    if (!contentRef.current) return;

    if (isExpanded) {
      // Measure the content height
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      // After animation completes, set to auto for dynamic content
      const timer = setTimeout(() => {
        setContentHeight(undefined);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      // First set the explicit height, then animate to 0
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      // Use requestAnimationFrame to ensure the height is set before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setContentHeight(0);
        });
      });
    }
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className={`border border-slate-200 rounded-lg ${allowOverflow ? '' : 'overflow-hidden'}`}>
      {/* Clickable header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {/* ChevronRight icon with rotation animation (90 degrees when expanded) */}
        <ChevronRight
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? 'rotate-90' : 'rotate-0'
          }`}
        />
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </button>

      {/* Collapsible content with smooth 200ms height animation */}
      <div
        ref={contentRef}
        className={`${allowOverflow && isExpanded ? '' : 'overflow-hidden'} transition-all duration-200 ease-in-out`}
        style={{
          height: contentHeight === undefined ? 'auto' : `${contentHeight}px`,
        }}
      >
        <div className="p-4 border-t border-slate-200">{children}</div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
