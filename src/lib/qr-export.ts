export type QRFileFormat = "png" | "svg";

export async function exportQRBlob(svg: SVGSVGElement | null, format: QRFileFormat) {
  if (!svg) throw new Error("QR is not ready");
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const box = svg.viewBox.baseVal;
  if (!box.width || !box.height) throw new Error("QR is not ready");
  const width = 1024,
    height = Math.round((width * box.height) / box.width);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
    type: "image/svg+xml;charset=utf-8",
  });
  if (format === "svg") return blob;

  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to render QR"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to render QR");
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error("Unable to render QR")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function saveDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadQR(
  svg: SVGSVGElement | null,
  format: QRFileFormat,
  name = "qr-code",
) {
  const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)}.${format}`;
  saveDownload(await exportQRBlob(svg, format), filename);
}
