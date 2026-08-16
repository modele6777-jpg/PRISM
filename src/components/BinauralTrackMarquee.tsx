interface BinauralTrackMarqueeProps {
  text: string;
  active: boolean;
  className?: string;
}

export function BinauralTrackMarquee({ text, active, className = "" }: BinauralTrackMarqueeProps) {
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`} title={text}>
      {active ? (
        <span
          className="binaural-marquee-track"
          style={{ animationDuration: `${Math.max(8, text.length * 0.22)}s` }}
        >
          <span>{text}</span>
          <span aria-hidden="true" className="ml-8">{text}</span>
        </span>
      ) : (
        <span className="block truncate">{text}</span>
      )}
    </div>
  );
}
