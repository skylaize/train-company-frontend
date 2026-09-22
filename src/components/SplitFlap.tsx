import { useEffect, useRef, useState } from "react";

type FlapSize = "sm" | "md" | "md-compact" | "lg";

function FlapChar({ char, size }: { char: string; size: FlapSize }) {
  const [displayChar, setDisplayChar] = useState(char);
  const [flipping, setFlipping] = useState(false);
  const prevRef = useRef(char);

  useEffect(() => {
    if (char !== prevRef.current) {
      setFlipping(true);
      // le contenu bascule pile au moment où la palette est de profil (invisible),
      // pour donner l'illusion d'un vrai changement mécanique
      const swapTimer = setTimeout(() => setDisplayChar(char), 140);
      const endTimer = setTimeout(() => {
        setFlipping(false);
        prevRef.current = char;
      }, 280);
      return () => {
        clearTimeout(swapTimer);
        clearTimeout(endTimer);
      };
    }
  }, [char]);

  /* « md » grandit avec l'écran au lieu de sauter d'un coup à 36 px : c'est la
     taille de la trésorerie, qui doit tenir dans sa colonne même à 1024 px. */
  const dims =
    size === "lg"
      ? "w-[1.05em] h-[1.3em] text-2xl md:text-4xl"
      : size === "md"
      ? "w-[1.05em] h-[1.3em] text-[26px] xl:text-3xl 2xl:text-4xl"
      : size === "md-compact"
      ? "w-[1.05em] h-[1.3em] text-[20px] xl:text-2xl 2xl:text-3xl"
      : "w-[0.9em] h-[1.2em] text-xs";

  return (
    <span
      className={`inline-flex items-center justify-center ${dims} bg-navy-950 border border-line font-mono2 shrink-0`}
      style={{ perspective: "200px" }}
    >
      <span
        className={flipping ? "flap-rotate" : ""}
        style={{ display: "inline-block", transformStyle: "preserve-3d" }}
      >
        {displayChar === " " ? "\u00A0" : displayChar}
      </span>
    </span>
  );
}

export function SplitFlap({ value, size = "lg", className = "" }: { value: string; size?: FlapSize; className?: string }) {
  return (
    <span className={`inline-flex gap-[2px] ${className}`}>
      {value.split("").map((c, i) => (
        <FlapChar key={i} char={c} size={size} />
      ))}
    </span>
  );
}
