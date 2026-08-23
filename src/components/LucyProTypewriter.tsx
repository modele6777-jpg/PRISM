import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download } from 'lucide-react';

interface LucyProTypewriterProps {
  content: string;
  isLatest?: boolean;
  isGenerating?: boolean;
  typewriterSpeed?: number;
}

export function LucyProTypewriter({
  content,
  isLatest = false,
  isGenerating = false,
  typewriterSpeed = 12,
}: LucyProTypewriterProps) {
  // If it's an old history message (not the latest or not generating), render directly for instant display
  const shouldAnimate = isLatest || isGenerating;
  const [displayedLength, setDisplayedLength] = useState<number>(() => {
    return shouldAnimate ? 0 : content.length;
  });

  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayedLength(content.length);
      return;
    }

    if (displayedLength < content.length) {
      const remainder = content.length - displayedLength;
      // Adaptive chunk sizing for natural and smooth typing cadence
      let chunkSize = 1;
      if (remainder > 300) {
        chunkSize = 8;
      } else if (remainder > 150) {
        chunkSize = 4;
      } else if (remainder > 50) {
        chunkSize = 2;
      }

      const timer = setTimeout(() => {
        setDisplayedLength((prev) => Math.min(content.length, prev + chunkSize));
      }, typewriterSpeed);

      return () => clearTimeout(timer);
    }
  }, [content, displayedLength, shouldAnimate, typewriterSpeed]);

  const displayedText = useMemo(() => {
    if (!shouldAnimate || displayedLength >= content.length) {
      return content;
    }
    return content.slice(0, displayedLength);
  }, [content, displayedLength, shouldAnimate]);

  const isTyping = shouldAnimate && (displayedLength < content.length || isGenerating);

  return (
    <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans [&_h1]:text-slate-900 [&_h1]:font-bold [&_h1]:text-lg [&_h1]:mb-2 [&_h2]:text-slate-900 [&_h2]:font-bold [&_h2]:text-base [&_h2]:mb-2 [&_h3]:text-slate-900 [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mb-1.5 [&_strong]:text-amber-900 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2 [&_code]:bg-amber-50 [&_code]:text-amber-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3.5 [&_pre]:rounded-xl [&_p]:mb-2.5 [&_p:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ node, ...props }) => (
            <div className="my-3 overflow-hidden rounded-2xl border border-slate-200 shadow-md group relative">
              <img
                {...props}
                className="w-full h-auto object-cover max-h-96 rounded-2xl transition-transform duration-300 hover:scale-[1.01]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              {props.src && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-xs rounded-xl px-2 py-1 flex items-center gap-1.5 shadow-md">
                  <a
                    href={props.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    download="lucy-pro-art.jpg"
                    className="text-white hover:text-amber-300 text-xs flex items-center gap-1 font-sans font-bold"
                    title="고화질 원본 다운로드 / 새 창으로 보기"
                  >
                    <Download size={13} />
                    <span className="text-[10px]">저장</span>
                  </a>
                </div>
              )}
            </div>
          ),
        }}
      >
        {displayedText}
      </ReactMarkdown>

      {/* 🌟 Glowing Typewriter Cursor Indicator */}
      {isTyping && (
        <span
          className="inline-block w-1.5 h-4 ml-1 bg-amber-500 rounded-xs animate-pulse align-middle shadow-xs"
          title="루시가 답변을 작성 중입니다..."
        />
      )}
    </div>
  );
}
