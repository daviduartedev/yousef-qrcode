import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import qrcode from "qrcode-generator";
import {
  defaultDesign,
  hasVisibleContrast,
  qrDesignSchema,
  type QRDesign,
  type QRPaint,
} from "@/lib/qr-design";
import { logos } from "./qr-catalog";

type Props = {
  data: string;
  design?: QRDesign;
  width?: number;
  height?: number;
  id?: string;
};

function Paint({ id, paint }: { id: string; paint: QRPaint }) {
  const value = paint.gradient;
  if (!value) return null;
  const stops = value.colorStops.map((stop, index) => (
    <stop key={index} offset={stop.offset} stopColor={stop.color} />
  ));
  return value.type === "radial" ? (
    <radialGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      cx="256"
      cy="256"
      r="256"
    >
      {stops}
    </radialGradient>
  ) : (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1="0"
      y1="0"
      x2="512"
      y2="0"
      gradientTransform={`rotate(${value.rotation ?? 0} 256 256)`}
    >
      {stops}
    </linearGradient>
  );
}

export default function QRCodePreview({
  data,
  design = defaultDesign,
  width = 300,
  height,
  id,
}: Props) {
  const { t: copy } = useTranslation("copy");
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const parsed = qrDesignSchema.safeParse(design);
  const matrix = useMemo(() => {
    if (!data) return null;
    try {
      const qr = qrcode(0, "H");
      qr.addData(data, "Byte");
      qr.make();
      return Array.from({ length: qr.getModuleCount() }, (_, r) =>
        Array.from({ length: qr.getModuleCount() }, (_, c) => qr.isDark(r, c)),
      );
    } catch {
      return null;
    }
  }, [data]);
  if (!data) return null;
  if (!parsed.success || !hasVisibleContrast(parsed.data) || !matrix)
    return (
      <p role="alert" className="text-sm text-destructive">
        {copy(
          "Use a shorter URL and contrasting valid colors to generate this QR.",
        )}
      </p>
    );
  const config = parsed.data;
  const circle = config.frame.style.startsWith("circle-");
  const framed = config.frame.style !== "none" && !circle;
  const label = framed ? config.frame.text : "";
  const totalHeight = label ? 580 : 512;
  const inset = circle ? 76 : framed ? 20 : 0;
  const area = 512 - inset * 2;
  const count = matrix.length;
  const scale = area / (count + 8);
  const origin = inset + 4 * scale;
  const logo = logos.find((item) => item.id === config.logoId);
  const logoModules = logo ? Math.max(3, Math.floor(count * 0.15)) : 0;
  const logoStart = Math.floor((count - logoModules) / 2);
  const logoEnd = logoStart + logoModules;
  const paint = (part: QRPaint, name: string) =>
    part.gradient ? `url(#${uid}-${name})` : part.color;
  const dotsPaint = paint(config.dotsOptions, "dots");
  const bgPaint = paint(config.backgroundOptions, "bg");
  const modules = matrix.flatMap((row, r) =>
    row.map((dark, c) => {
      const finder =
        (r < 7 && c < 7) ||
        (r < 7 && c >= count - 7) ||
        (r >= count - 7 && c < 7);
      if (
        !dark ||
        finder ||
        (logo &&
          r >= logoStart - 1 &&
          r <= logoEnd &&
          c >= logoStart - 1 &&
          c <= logoEnd)
      )
        return null;
      const x = origin + c * scale,
        y = origin + r * scale,
        cx = x + scale / 2,
        cy = y + scale / 2;
      const key = `${r}-${c}`;
      if (config.dotsOptions.type === "dots")
        return <circle key={key} cx={cx} cy={cy} r={scale * 0.48} />;
      if (config.dotsOptions.type === "classy")
        return (
          <rect
            key={key}
            x={cx - scale * 0.44}
            y={cy - scale * 0.44}
            width={scale * 0.88}
            height={scale * 0.88}
            transform={`rotate(45 ${cx} ${cy})`}
          />
        );
      if (config.dotsOptions.type === "rounded")
        return (
          <ellipse
            key={key}
            cx={cx}
            cy={cy}
            rx={scale * 0.32}
            ry={scale * 0.5}
            transform={`rotate(-25 ${cx} ${cy})`}
          />
        );
      return (
        <rect
          key={key}
          x={x}
          y={y}
          width={scale + 0.02}
          height={scale + 0.02}
          rx={config.dotsOptions.type === "square" ? 0 : scale * 0.3}
        />
      );
    }),
  );
  const eyes = [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ].map(([col, row], index) => {
    const x = origin + col * scale,
      y = origin + row * scale,
      cx = x + 3.5 * scale,
      cy = y + 3.5 * scale;
    const outer = paint(config.cornersSquareOptions, "outer"),
      inner = paint(config.cornersDotOptions, "inner");
    const round = config.cornersSquareOptions.type === "extra-rounded";
    return (
      <g key={index}>
        {config.cornersSquareOptions.type === "dot" ? (
          <>
            <circle cx={cx} cy={cy} r={3.5 * scale} fill={outer} />
            <circle cx={cx} cy={cy} r={2.5 * scale} fill={bgPaint} />
          </>
        ) : (
          <>
            <rect
              x={x}
              y={y}
              width={7 * scale}
              height={7 * scale}
              rx={round ? 2 * scale : 0}
              fill={outer}
            />
            <rect
              x={x + scale}
              y={y + scale}
              width={5 * scale}
              height={5 * scale}
              rx={round ? 1.5 * scale : 0}
              fill={bgPaint}
            />
          </>
        )}
        {config.cornersDotOptions.type === "dot" ? (
          <circle cx={cx} cy={cy} r={1.5 * scale} fill={inner} />
        ) : (
          <rect
            x={x + 2 * scale}
            y={y + 2 * scale}
            width={3 * scale}
            height={3 * scale}
            fill={inner}
          />
        )}
      </g>
    );
  });
  const frameColor =
    config.frame.style === "blue" || config.frame.style === "circle-navy"
      ? "#1E3A8A"
      : config.frame.style === "red"
        ? "#DC2626"
        : config.frame.style === "circle-green"
          ? "#4CAF50"
          : "#000000";
  const LogoIcon = logo?.icon;
  const logoSize = logoModules * scale;
  const logoX = origin + logoStart * scale;
  return (
    <svg
      id={id}
      role="img"
      aria-label={copy("Your QR Code")}
      width={width}
      height={height ?? (width * totalHeight) / 512}
      viewBox={`0 0 512 ${totalHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <Paint id={`${uid}-dots`} paint={config.dotsOptions} />
        <Paint id={`${uid}-outer`} paint={config.cornersSquareOptions} />
        <Paint id={`${uid}-inner`} paint={config.cornersDotOptions} />
        <Paint id={`${uid}-bg`} paint={config.backgroundOptions} />
      </defs>
      <rect width="512" height={totalHeight} fill="#ffffff" />
      {circle && (
        <circle
          cx="256"
          cy="256"
          r="249"
          fill="#ffffff"
          stroke={frameColor}
          strokeWidth="8"
        />
      )}
      {framed && (
        <rect
          x="8"
          y="8"
          width="496"
          height="496"
          rx="20"
          fill="#ffffff"
          stroke={frameColor}
          strokeWidth="5"
        />
      )}
      <rect x={inset} y={inset} width={area} height={area} fill={bgPaint} />
      <g fill={dotsPaint}>{modules}</g>
      {eyes}
      {logo && (
        <>
          <rect
            x={logoX - scale}
            y={logoX - scale}
            width={logoSize + 2 * scale}
            height={logoSize + 2 * scale}
            rx={scale * 0.5}
            fill="#ffffff"
          />
          <svg
            x={logoX}
            y={logoX}
            width={logoSize}
            height={logoSize}
            viewBox="0 0 24 24"
            color={logo.color}
          >
            {LogoIcon ? (
              <LogoIcon width={24} height={24} color={logo.color} />
            ) : (
              <g
                dangerouslySetInnerHTML={{
                  __html: logo.svg!.replace(
                    "<svg ",
                    '<svg width="24" height="24" ',
                  ),
                }}
              />
            )}
          </svg>
        </>
      )}
      {label && (
        <>
          <rect
            x="20"
            y="520"
            width="472"
            height="48"
            rx="24"
            fill={frameColor}
          />
          <text
            x="256"
            y="552"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontSize={label.length > 25 ? 16 : 24}
            fontWeight="bold"
            fill="#ffffff"
            direction={/[\u0600-\u06ff]/.test(label) ? "rtl" : "ltr"}
          >
            {label}
          </text>
        </>
      )}
    </svg>
  );
}
