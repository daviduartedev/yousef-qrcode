import { useMemo } from "react";
import qrcode from "qrcode-generator";
import type { CornerDotType, CornerSquareType, DotType, ErrorCorrectionLevel, TypeNumber } from "qr-code-styling";

type Props = {
  data: string;
  width: number;
  height: number;
  dotsType: DotType;
  dotsColor?: string;
  backgroundColor?: string;
  cornersSquareType?: CornerSquareType;
  cornersSquareColor?: string;
  cornersDotType?: CornerDotType;
  cornersDotColor?: string;
  image?: string;
  imageOptions?: {
    hideBackgroundDots?: boolean;
    imageSize?: number; // 0..1
    margin?: number; // px in original lib; we treat as px here too
  };
  qrOptions?: {
    typeNumber?: TypeNumber;
    errorCorrectionLevel?: ErrorCorrectionLevel;
  };
};

const DEFAULT_BG = "#ffffff";
const DEFAULT_FG = "#000000";

function mapEcl(ecl?: ErrorCorrectionLevel): "L" | "M" | "Q" | "H" {
  // qr-code-styling uses the same letters; keep a safe default.
  if (ecl === "L" || ecl === "M" || ecl === "Q" || ecl === "H") return ecl;
  return "M";
}

function isInFinder(row: number, col: number, count: number) {
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= count - 7;
  const inBottomLeft = row >= count - 7 && col < 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

function rectPathWithRx(x: number, y: number, w: number, h: number, rx: number) {
  const r = Math.max(0, Math.min(rx, w / 2, h / 2));
  if (r === 0) return `M${x} ${y}h${w}v${h}h-${w}Z`;
  return [
    `M${x + r} ${y}`,
    `h${w - 2 * r}`,
    `a${r} ${r} 0 0 1 ${r} ${r}`,
    `v${h - 2 * r}`,
    `a${r} ${r} 0 0 1 -${r} ${r}`,
    `h-${w - 2 * r}`,
    `a${r} ${r} 0 0 1 -${r} -${r}`,
    `v-${h - 2 * r}`,
    `a${r} ${r} 0 0 1 ${r} -${r}`,
    "Z",
  ].join(" ");
}

export default function QRCodeSvgCustom({
  data,
  width,
  height,
  dotsType,
  dotsColor,
  backgroundColor,
  cornersSquareType,
  cornersSquareColor,
  cornersDotType,
  cornersDotColor,
  image,
  imageOptions,
  qrOptions,
}: Props) {
  const fg = dotsColor ?? DEFAULT_FG;
  const bg = backgroundColor ?? DEFAULT_BG;

  const { moduleCount, isDark } = useMemo(() => {
    if (!data) {
      return {
        moduleCount: 0,
        isDark: (_r: number, _c: number) => false,
      };
    }

    const qr = qrcode((qrOptions?.typeNumber ?? 0) as any, mapEcl(qrOptions?.errorCorrectionLevel) as any);
    qr.addData(data);
    qr.make();

    const count = qr.getModuleCount();
    return {
      moduleCount: count,
      isDark: (r: number, c: number) => qr.isDark(r, c),
    };
  }, [data, qrOptions?.typeNumber, qrOptions?.errorCorrectionLevel]);

  const quietZone = 4; // modules
  const totalModules = moduleCount ? moduleCount + quietZone * 2 : 0;
  const size = Math.min(width, height);
  const scale = totalModules ? size / totalModules : 0;

  const logoBox = useMemo(() => {
    if (!image || !imageOptions?.hideBackgroundDots || !moduleCount || !scale) return null;
    const fraction = Math.max(0, Math.min(1, imageOptions?.imageSize ?? 0.4));
    const logoPx = size * fraction;
    const logoModules = Math.max(1, Math.floor(logoPx / scale));
    const start = quietZone + Math.floor((moduleCount - logoModules) / 2);
    const end = start + logoModules;
    return { start, end };
  }, [image, imageOptions?.hideBackgroundDots, imageOptions?.imageSize, moduleCount, scale, size]);

  const dotsMarkup = useMemo(() => {
    if (!moduleCount || !scale) return "";

    // Geometry tuned to match the reference previews:
    const diamond = scale * 0.72;
    const ellipseRx = scale * 0.32;
    const ellipseRy = scale * 0.5;
    const rotDeg = -25;

    let out = "";
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!isDark(r, c)) continue;
        if (isInFinder(r, c, moduleCount)) continue;

        const x = (c + quietZone) * scale;
        const y = (r + quietZone) * scale;

        // Skip under-logo modules (when requested)
        if (logoBox) {
          const rr = r + quietZone;
          const cc = c + quietZone;
          if (rr >= logoBox.start && rr < logoBox.end && cc >= logoBox.start && cc < logoBox.end) {
            continue;
          }
        }

        const cx = x + scale / 2;
        const cy = y + scale / 2;

        if (dotsType === "classy") {
          const dx = cx - diamond / 2;
          const dy = cy - diamond / 2;
          out += `<rect x="${dx}" y="${dy}" width="${diamond}" height="${diamond}" fill="${fg}" transform="rotate(45 ${cx} ${cy})" />`;
          continue;
        }

        if (dotsType === "rounded") {
          out += `<ellipse cx="${cx}" cy="${cy}" rx="${ellipseRx}" ry="${ellipseRy}" fill="${fg}" transform="rotate(${rotDeg} ${cx} ${cy})" />`;
          continue;
        }

        // Fallback (shouldn't happen, this component is meant for these two types)
        out += `<rect x="${x}" y="${y}" width="${scale}" height="${scale}" fill="${fg}" />`;
      }
    }
    return out;
  }, [moduleCount, scale, isDark, dotsType, fg, logoBox]);

  const eyes = useMemo(() => {
    if (!moduleCount || !scale) return null;

    const outerColor = cornersSquareColor ?? fg;
    const innerColor = cornersDotColor ?? cornersSquareColor ?? fg;

    const outerSize = 7 * scale;
    const holeSize = 5 * scale;
    const dotSize = 3 * scale;

    const rxOuter = cornersSquareType === "extra-rounded" ? 2 * scale : 0;
    const rxHole = cornersSquareType === "extra-rounded" ? 1.5 * scale : 0;

    const makeEye = (x: number, y: number) => {
      const cx = x + outerSize / 2;
      const cy = y + outerSize / 2;
      const holeX = x + 1 * scale;
      const holeY = y + 1 * scale;
      const dotX = x + 2 * scale;
      const dotY = y + 2 * scale;

      const outerIsCircle = cornersSquareType === "dot";
      const innerIsCircle = cornersDotType === "dot";

      return (
        <g>
          {/* outer */}
          {outerIsCircle ? (
            <circle cx={cx} cy={cy} r={outerSize / 2} fill={outerColor} />
          ) : (
            <path d={rectPathWithRx(x, y, outerSize, outerSize, rxOuter)} fill={outerColor} />
          )}

          {/* hole */}
          {outerIsCircle ? (
            <circle cx={cx} cy={cy} r={holeSize / 2} fill={bg} />
          ) : (
            <path d={rectPathWithRx(holeX, holeY, holeSize, holeSize, rxHole)} fill={bg} />
          )}

          {/* center dot */}
          {innerIsCircle ? (
            <circle cx={x + 3.5 * scale} cy={y + 3.5 * scale} r={dotSize / 2} fill={innerColor} />
          ) : (
            <rect x={dotX} y={dotY} width={dotSize} height={dotSize} fill={innerColor} />
          )}
        </g>
      );
    };

    const tl = { x: quietZone * scale, y: quietZone * scale };
    const tr = { x: (quietZone + moduleCount - 7) * scale, y: quietZone * scale };
    const bl = { x: quietZone * scale, y: (quietZone + moduleCount - 7) * scale };

    return (
      <g>
        {makeEye(tl.x, tl.y)}
        {makeEye(tr.x, tr.y)}
        {makeEye(bl.x, bl.y)}
      </g>
    );
  }, [moduleCount, scale, cornersSquareColor, cornersDotColor, cornersSquareType, cornersDotType, fg, bg]);

  const logo = useMemo(() => {
    if (!image || !size) return null;
    const fraction = Math.max(0, Math.min(1, imageOptions?.imageSize ?? 0.4));
    const margin = Math.max(0, imageOptions?.margin ?? 0);
    const logoSize = size * fraction;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    return (
      <image
        href={image}
        x={x + margin}
        y={y + margin}
        width={Math.max(0, logoSize - margin * 2)}
        height={Math.max(0, logoSize - margin * 2)}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }, [image, imageOptions?.imageSize, imageOptions?.margin, size]);

  if (!data) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
    >
      <rect x={0} y={0} width={size} height={size} fill={bg} />

      {/* dots */}
      <g dangerouslySetInnerHTML={{ __html: dotsMarkup }} />

      {/* eyes */}
      {eyes}

      {/* logo */}
      {logo}
    </svg>
  );
}
