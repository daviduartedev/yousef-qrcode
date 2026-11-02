import { useTranslation } from 'react-i18next';
import { DotType, CornerSquareType, CornerDotType } from "qr-code-styling";
import { Input } from "@/components/ui/input";

// Pattern types matching the reference image (4 patterns)
const dotPatterns: { type: DotType; label: string }[] = [
  { type: "square", label: "Square" },
  { type: "dots", label: "Dots" },
  // Reference order: 3) Classy, 4) Rounded
  { type: "classy", label: "Classy" },
  { type: "rounded", label: "Rounded" },
];

// Eye (corner square) types matching the reference image (6 styles)
const eyePatterns: { type: CornerSquareType; cornerDot: CornerDotType; label: string }[] = [
  { type: "square", cornerDot: "square", label: "Square" },
  { type: "extra-rounded", cornerDot: "square", label: "Leaf" },
  { type: "dot", cornerDot: "dot", label: "Circle" },
  { type: "extra-rounded", cornerDot: "dot", label: "Rounded Circle" },
  { type: "square", cornerDot: "dot", label: "Square Dot" },
  { type: "extra-rounded", cornerDot: "square", label: "Rounded Square" },
];

interface QRDesignTabProps {
  dotsType: DotType;
  onDotsTypeChange: (type: DotType) => void;
  dotsColor: string;
  onDotsColorChange: (color: string) => void;
  eyesType: CornerSquareType;
  onEyesTypeChange: (type: CornerSquareType) => void;
  eyesColor: string;
  onEyesColorChange: (color: string) => void;
  cornerDotType: CornerDotType;
  onCornerDotTypeChange: (type: CornerDotType) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
}

const QRDesignTab = ({
  dotsType,
  onDotsTypeChange,
  dotsColor,
  onDotsColorChange,
  eyesType,
  onEyesTypeChange,
  eyesColor,
  onEyesColorChange,
  cornerDotType,
  onCornerDotTypeChange,
  backgroundColor,
  onBackgroundColorChange,
}: QRDesignTabProps) => {
  const { t: copy } = useTranslation('copy');
  const handleEyeChange = (pattern: typeof eyePatterns[0]) => {
    onEyesTypeChange(pattern.type);
    onCornerDotTypeChange(pattern.cornerDot);
  };

  return (
    <div className="space-y-6">
      {/* Pattern Section */}
      <div>
        <h4 className="text-sm font-semibold mb-3">{copy("Pattern")}</h4>
        <div className="flex flex-wrap gap-3 mb-3">
          {dotPatterns.map((pattern) => (
            <button
              key={pattern.type}
              onClick={() => onDotsTypeChange(pattern.type)}
              className={`w-[72px] h-[72px] border-2 rounded-lg flex items-center justify-center transition-all bg-background ${
                dotsType === pattern.type
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              }`}
              title={copy(pattern.label)}
            >
              <PatternPreview type={pattern.type} color={dotsColor} />
            </button>
          ))}
        </div>

        {/* Dots Color Picker */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              value={dotsColor}
              aria-label={copy('Pattern color')}
              onChange={(e) => onDotsColorChange(e.target.value)}
              placeholder={copy("#000000")}
              className="font-mono"
            />
          </div>
          <div className="relative">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(dotsColor) ? dotsColor : '#000000'}
              aria-label={copy('Pick pattern color')}
              onChange={(e) => onDotsColorChange(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-border"
            />
          </div>
        </div>
      </div>

      {/* Eyes Section */}
      <div>
        <h4 className="text-sm font-semibold mb-3">{copy("Eyes")}</h4>
        <div className="flex flex-wrap gap-3 mb-3">
          {eyePatterns.map((pattern, index) => (
            <button
              key={`${pattern.type}-${pattern.cornerDot}-${index}`}
              onClick={() => handleEyeChange(pattern)}
              className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center transition-all bg-background ${
                eyesType === pattern.type && cornerDotType === pattern.cornerDot
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              }`}
              title={copy(pattern.label)}
            >
              <EyePreview type={pattern.type} cornerDot={pattern.cornerDot} color={eyesColor} />
            </button>
          ))}
        </div>

        {/* Eyes Color Picker */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              value={eyesColor}
              aria-label={copy('Eye color')}
              onChange={(e) => onEyesColorChange(e.target.value)}
              placeholder={copy("#000000")}
              className="font-mono"
            />
          </div>
          <div className="relative">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(eyesColor) ? eyesColor : '#000000'}
              aria-label={copy('Pick eye color')}
              onChange={(e) => onEyesColorChange(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-border"
            />
          </div>
        </div>
      </div>

      {/* Background Section */}
      <div>
        <h4 className="text-sm font-semibold mb-3">{copy("Background")}</h4>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              value={backgroundColor}
              aria-label={copy('Background color')}
              onChange={(e) => onBackgroundColorChange(e.target.value)}
              placeholder={copy("#FFFFFF")}
              className="font-mono"
            />
          </div>
          <div className="relative">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(backgroundColor) ? backgroundColor : '#ffffff'}
              aria-label={copy('Pick background color')}
              onChange={(e) => onBackgroundColorChange(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-border"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// SVG Pattern Preview Component - pixel-perfect match to reference image
const PatternPreview = ({ type, color }: { type: DotType; color: string }) => {
  const size = 44;
  const s = 5; // cell size
  const g = 1; // gap
  const step = s + g;

  // Common grid positions for QR-like pattern
  const positions = [
    // Row 0
    [0, 0], [1, 0], [3, 0], [4, 0], [6, 0],
    // Row 1
    [0, 1], [2, 1], [3, 1], [5, 1], [6, 1],
    // Row 2
    [1, 2], [2, 2], [4, 2], [5, 2],
    // Row 3
    [0, 3], [2, 3], [3, 3], [4, 3], [6, 3],
    // Row 4
    [1, 4], [3, 4], [5, 4], [6, 4],
    // Row 5
    [0, 5], [1, 5], [2, 5], [4, 5],
    // Row 6
    [2, 6], [3, 6], [5, 6], [6, 6],
  ];

  const renderPattern = () => {
    switch (type) {
      case "square":
        // Pattern 1: Solid squares - tight grid (no gaps visible)
        return (
          <>
            {positions.map(([col, row], i) => (
              <rect
                key={i}
                x={col * step}
                y={row * step}
                width={s}
                height={s}
                fill={color}
              />
            ))}
          </>
        );

      case "dots":
        // Pattern 2: Large round dots with clear spacing
        const dotRadius = 2.8;
        const dotCenter = s / 2;
        return (
          <>
            {positions.map(([col, row], i) => (
              <circle
                key={i}
                cx={col * step + dotCenter}
                cy={row * step + dotCenter}
                r={dotRadius}
                fill={color}
              />
            ))}
          </>
        );

      case "classy":
        // Pattern 3: Small diamonds (rotated 45° squares) - matching reference exactly
        const diamondSize = 4;
        const diamondCenter = s / 2;
        return (
          <>
            {positions.map(([col, row], i) => (
              <rect
                key={i}
                x={col * step + diamondCenter - diamondSize / 2}
                y={row * step + diamondCenter - diamondSize / 2}
                width={diamondSize}
                height={diamondSize}
                fill={color}
                transform={`rotate(45 ${col * step + diamondCenter} ${row * step + diamondCenter})`}
              />
            ))}
          </>
        );

      case "rounded":
        // Pattern 4: Slanted ellipses (italic effect) - matching reference exactly
        const ellipseRx = 2;
        const ellipseRy = 3.2;
        const ellipseCenter = s / 2;
        return (
          <>
            {positions.map(([col, row], i) => (
              <ellipse
                key={i}
                cx={col * step + ellipseCenter}
                cy={row * step + ellipseCenter}
                rx={ellipseRx}
                ry={ellipseRy}
                fill={color}
                transform={`rotate(-30 ${col * step + ellipseCenter} ${row * step + ellipseCenter})`}
              />
            ))}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {renderPattern()}
    </svg>
  );
};

// SVG Eye Preview Component - matches reference image exactly (6 styles)
const EyePreview = ({ type, cornerDot, color }: { type: CornerSquareType; cornerDot: CornerDotType; color: string }) => {
  const size = 32;

  // Outer shape based on type
  const renderOuter = () => {
    switch (type) {
      case "square":
        return <rect x="4" y="4" width="24" height="24" fill="none" stroke={color} strokeWidth="3" />;
      case "dot":
        return <circle cx="16" cy="16" r="12" fill="none" stroke={color} strokeWidth="3" />;
      case "extra-rounded":
        return <rect x="4" y="4" width="24" height="24" rx="8" ry="8" fill="none" stroke={color} strokeWidth="3" />;
      default:
        return <rect x="4" y="4" width="24" height="24" fill="none" stroke={color} strokeWidth="3" />;
    }
  };

  // Inner shape based on cornerDot
  const renderInner = () => {
    switch (cornerDot) {
      case "square":
        return <rect x="10" y="10" width="12" height="12" fill={color} />;
      case "dot":
        return <circle cx="16" cy="16" r="6" fill={color} />;
      default:
        return <rect x="10" y="10" width="12" height="12" fill={color} />;
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      {renderOuter()}
      {renderInner()}
    </svg>
  );
};

export default QRDesignTab;
