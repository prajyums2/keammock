import { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface LaTeXRendererProps {
  children: string;
  block?: boolean;
}

export default function LaTeXRenderer({ children, block }: LaTeXRendererProps) {
  const rendered = useMemo(() => {
    if (!children || typeof children !== 'string') {
      return children;
    }

    const parts: (string | JSX.Element)[] = [];
    let remaining = children;
    let lastIndex = 0;

    const blockMathRegex = /\$\$([^$]+?)\$\$/g;
    const inlineMathRegex = /\$([^$\n]+?)\$/g;

    let match;
    let processedContent = remaining;

    const blockMatches: { start: number; end: number; content: string }[] = [];
    while ((match = blockMathRegex.exec(remaining)) !== null) {
      blockMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1].trim()
      });
    }

    const inlineMatches: { start: number; end: number; content: string }[] = [];
    const tempRegex = /\$([^$\n]+?)\$/g;
    let tempMatch;
    while ((tempMatch = tempRegex.exec(remaining)) !== null) {
      const isInsideBlock = blockMatches.some(b => tempMatch!.index >= b.start && tempMatch!.index < b.end);
      if (!isInsideBlock) {
        inlineMatches.push({
          start: tempMatch.index,
          end: tempMatch.index + tempMatch[0].length,
          content: tempMatch[1].trim()
        });
      }
    }

    const allMatches = [
      ...blockMatches.map(m => ({ ...m, type: 'block' as const })),
      ...inlineMatches.map(m => ({ ...m, type: 'inline' as const }))
    ].sort((a, b) => a.start - b.start);

    let currentIndex = 0;
    for (const m of allMatches) {
      if (m.start >= currentIndex) {
        if (m.start > currentIndex) {
          parts.push(remaining.slice(currentIndex, m.start));
        }
        
        try {
          if (m.type === 'block') {
            parts.push(<BlockMath key={`block-${m.start}`} math={m.content} />);
          } else {
            parts.push(<InlineMath key={`inline-${m.start}`} math={m.content} />);
          }
        } catch (error) {
          parts.push(m.type === 'block' ? `$$${m.content}$$` : `$${m.content}$`);
        }
        
        currentIndex = m.end;
      }
    }

    if (currentIndex < remaining.length) {
      parts.push(remaining.slice(currentIndex));
    }

    return parts.length > 0 ? parts : remaining;
  }, [children]);

  if (block) {
    return <div className="my-2">{rendered}</div>;
  }

  return <span className="latex-content">{rendered}</span>;
}

export function renderMath(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text;
}
