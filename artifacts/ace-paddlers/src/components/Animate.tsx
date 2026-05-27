import { useInView } from "@/hooks/useInView";

type Variant = "up" | "fade" | "left" | "right" | "scale";

interface AnimateProps {
  children: React.ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  immediate?: boolean;
}

const ANIM: Record<Variant, string> = {
  up:    "ace-anim-fadeup",
  fade:  "ace-anim-fadein",
  left:  "ace-anim-fadeleft",
  right: "ace-anim-faderight",
  scale: "ace-anim-scaleup",
};

export default function Animate({
  children,
  variant = "up",
  delay = 0,
  className = "",
  immediate = false,
}: AnimateProps) {
  const { ref, inView } = useInView();
  const active = immediate || inView;

  return (
    <div
      ref={ref}
      className={`${active ? ANIM[variant] : "ace-anim-ready"} ${className}`}
      style={active && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
