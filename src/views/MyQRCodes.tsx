"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditorNavigation } from "@/components/EditorNavigation";
import type { QRCodeRecord } from "@/lib/qr-types";
import { downloadQR } from "@/lib/qr-export";
import dynamic from "next/dynamic";
const QRCodeStyled = dynamic(() => import("@/components/QRCodePreview"), {
  ssr: false,
});
import { getQRCodeAnalytics, deleteQRCode, setQRCodeActive } from "@/lib/qrTracking";
import { qrListHref, type QRListQuery } from "@/lib/qr-list";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { QRListFilters } from "@/components/QRListFilters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  QrCode,
  ChevronDown,
  ExternalLink,
  Calendar,
  Eye,
  Trash2,
  Loader2,
  BarChart3,
  Plus,
  Copy,
  Download,
  Pencil,
  Pause,
  Play,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";

// Chart colors
const CHART_COLORS = {
  primary: "hsl(217, 91%, 60%)",
  secondary: "hsl(0, 0%, 10%)",
  tertiary: "hsl(217, 91%, 80%)",
  quaternary: "hsl(240, 5%, 65%)",
  quinary: "hsl(263, 70%, 50%)",
};

const COLOR_ARRAY = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.quaternary,
  CHART_COLORS.quinary,
];

interface Analytics {
  totalScans: number;
  deviceBreakdown: Record<string, number>;
  osBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}

function SavedQRThumbnail({ qr, data }: { qr: QRCodeRecord; data: string }) {
  const target = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!target.current) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(target.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={target}
      className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shrink-0"
    >
      {visible ? (
        <QRCodeStyled
          data={data}
          design={qr.design ?? undefined}
          width={40}
          height={40}
        />
      ) : (
        <QrCode className="w-6 h-6 text-primary" />
      )}
    </div>
  );
}

const MyQRCodes = ({ query, result, origin }: {
  query: QRListQuery;
  result: { qrCodes: QRCodeRecord[]; total: number; page: number; pages: number };
  origin: string;
}) => {
  const { t: copy, i18n } = useTranslation("copy");
  const { navigate } = useEditorNavigation();
  const router = useRouter();
  const { toast } = useToast();
  const { qrCodes, total, page, pages } = result;
  const filtered = Boolean(query.q || query.mode || query.status);
  const [pendingAction, setPendingAction] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const busy = pendingAction || refreshing;
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    shortCode: string;
    scans: number;
    analytics: Analytics | null;
  } | null>(null);
  const expanded = qrCodes.find(qr => qr.id === expandedQR && qr.tracking_enabled);
  const shortCode = expanded?.short_code;
  const scans = expanded?.total_scans;
  const currentDetail = detail?.shortCode === shortCode && detail?.scans === scans ? detail : null;

  useEffect(() => {
    if (!shortCode || scans === undefined) return;
    let cancelled = false;
    void getQRCodeAnalytics(shortCode).then(result => {
      if (!cancelled) setDetail({ shortCode, scans, analytics: result.analytics });
    }).catch(() => {
      if (cancelled) return;
      setDetail({ shortCode, scans, analytics: null });
      toast({ title: copy("Não foi possível carregar as estatísticas"), variant: "destructive" });
    });
    return () => { cancelled = true; };
  }, [shortCode, scans, copy, toast]);

  function handleExpand(id: string, open: boolean) {
    setDetail(null);
    setExpandedQR(open ? id : null);
  }

  async function runAction(action: () => Promise<unknown>, success: string, error: string) {
    setPendingAction(true);
    try {
      await action();
      startRefresh(() => router.refresh());
      toast({ title: copy(success) });
    } catch {
      toast({ title: copy(error), variant: "destructive" });
    } finally {
      setPendingAction(false);
    }
  }

  function handleDelete(qr: QRCodeRecord) {
    const message = qr.tracking_enabled
      ? "Delete this tracked QR Code? Its public link will stop redirecting and its scan history will be deleted."
      : "Delete this direct QR Code? Copies already shared will still open their original destination.";
    if (!window.confirm(copy(message))) return;
    void runAction(() => deleteQRCode(qr.id), "QR Code deleted successfully", "Error deleting QR Code");
  }

  function handleTracking(qr: QRCodeRecord) {
    void runAction(
      () => setQRCodeActive(qr.id, !qr.is_active),
      qr.is_active ? "QR Code paused" : "QR Code reactivated",
      "Could not change tracking status. Try again.",
    );
  }

  const getQRUrl = (qr: QRCodeRecord) =>
    qr.tracking_enabled ? `${origin}/qr?code=${encodeURIComponent(qr.short_code)}` : qr.destination_url;

  async function copyToClipboard(qr: QRCodeRecord) {
    try {
      await navigator.clipboard.writeText(getQRUrl(qr));
      toast({ title: copy("Link copied to clipboard!") });
    } catch {
      toast({ title: copy("Could not copy the link. Try again."), variant: "destructive" });
    }
  }

  const downloadCode = async (qr: QRCodeRecord, format: "png" | "svg") => {
    try {
      await downloadQR(
        document.getElementById("qr-" + qr.short_code)?.querySelector("svg") ??
          null,
        format,
        "qr-" + qr.short_code,
      );
    } catch {
      toast({
        title: copy("Download failed. Check the preview and try again."),
        variant: "destructive",
      });
    }
  };

  const convertToChartData = (
    breakdown: Record<string, number>,
    total: number,
  ) => {
    return Object.entries(breakdown).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
    }));
  };

  const DonutChart = ({
    data,
    title,
  }: {
    data: { name: string; value: number; percentage: string }[];
    title: string;
  }) => {
    const { t: copy } = useTranslation("copy");
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">{copy("No data yet")}</p>
        </div>
      );
    }

    return (
      <div className="w-full">
        <h4 className="text-sm font-semibold mb-2 text-center">
          {copy(title)}
        </h4>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLOR_ARRAY[index % COLOR_ARRAY.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.value} {copy("scans (")}
                          {item.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 space-y-1">
          {data.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: COLOR_ARRAY[index % COLOR_ARRAY.length],
                  }}
                />
                <span className="truncate max-w-[100px]">
                  {copy(item.name)}
                </span>
              </div>
              <span className="text-muted-foreground font-medium">
                {copy(item.percentage)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <WorkspaceShell>
      <main className="space-y-5 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{copy("My QR Codes")}</h1>
            <p className="text-muted-foreground mt-1">
              {copy("Manage and view analytics for your QR Codes")}
            </p>
          </div>
          <Button className="min-h-11 gap-2 bg-blue-700 text-white hover:bg-blue-800" onClick={() => navigate("/app")}>
            <Plus className="size-4" aria-hidden="true" />
            {copy("Create New QR Code")}
          </Button>
        </div>

        <QRListFilters key={qrListHref({ ...query, page: 1 })} query={query} />
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {copy("QR Codes found: {{total}}", { total: new Intl.NumberFormat(i18n.resolvedLanguage).format(total) })}
        </p>

        {qrCodes.length === 0 ? (
          <Card className="p-6 text-center sm:p-12">
            <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {copy(filtered ? "No matching QR Codes" : "No QR Codes saved")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {copy(filtered ? "Change your search or clear the filters." : "Your saved codes will appear here.")}
            </p>
            <Button asChild className="min-h-11"><Link href={filtered ? "/my-qrcodes" : "/app"}>
              {copy(filtered ? "Clear filters" : "Create QR Code")}
            </Link></Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {qrCodes.map((qr) => {
              const analytics = expanded?.id === qr.id ? currentDetail?.analytics : null;
              return (
              <Card key={qr.id} className="overflow-hidden">
                <Collapsible
                  open={expandedQR === qr.id}
                  onOpenChange={(open) => handleExpand(qr.id, open)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 basis-full items-center gap-3 sm:flex-1">
                      <SavedQRThumbnail qr={qr} data={getQRUrl(qr)} />
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold">{qr.title || qr.destination_url}</h3>
                        <p dir="ltr" className="truncate text-start text-sm text-muted-foreground" title={qr.destination_url}>{qr.destination_url}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded bg-muted px-2 py-1 font-medium">{copy(qr.tracking_enabled ? "Tracked" : "Direct")}</span>
                          {qr.tracking_enabled && <span className={qr.is_active
                            ? "rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                            : "rounded bg-muted px-2 py-1 font-medium"}>
                            {copy(qr.is_active ? "Active" : "Inactive")}
                          </span>}
                          <span className="flex items-center gap-1"><Eye className="size-3" aria-hidden="true" />{qr.total_scans} {copy("scans")}</span>
                          <span className="flex items-center gap-1"><Calendar className="size-3" aria-hidden="true" />
                            {new Date(qr.created_at).toLocaleDateString(i18n.resolvedLanguage, { timeZone: "UTC" })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-11" title={copy("Edit design")} aria-label={copy("Edit design")}
                        onClick={() => navigate("/app?edit=" + encodeURIComponent(qr.id))}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="size-11">
                        <a href={qr.destination_url} target="_blank" rel="noopener noreferrer" title={copy("Open destination")} aria-label={copy("Open destination")}>
                          <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                      </Button>
                      {qr.tracking_enabled && <Button variant="outline" className="min-h-11 gap-2" disabled={busy} onClick={() => handleTracking(qr)}>
                        {qr.is_active ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                        {copy(qr.is_active ? "Pause tracking" : "Reactivate tracking")}
                      </Button>}
                      <Button variant="ghost" size="icon" className="size-11 text-destructive hover:text-destructive" disabled={busy}
                        title={copy("Delete")} aria-label={copy("Delete")} onClick={() => handleDelete(qr)}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="size-11" title={copy("QR details")} aria-label={copy("QR details")}>
                          <ChevronDown className={`size-4 transition-transform ${expandedQR === qr.id ? "rotate-180" : ""}`} aria-hidden="true" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t border-border p-6 bg-muted/30">
                      {/* QR Code Preview Section */}
                      <div className="mb-6 p-4 bg-card rounded-lg shadow-sm">
                        <h4 className="text-sm font-semibold mb-4">
                          {copy("Your QR Code")}
                        </h4>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                          <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                            <div id={`qr-${qr.short_code}`}>
                              <QRCodeStyled
                                data={getQRUrl(qr)}
                                design={qr.design ?? undefined}
                                width={150}
                              />
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {qr.tracking_enabled
                                  ? copy("Scan URL")
                                  : copy("Destination")}
                              </p>
                              <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                                {getQRUrl(qr)}
                              </code>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {copy("Destination")}
                              </p>
                              <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                                {qr.destination_url}
                              </code>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(qr)}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                {copy("Copy Link")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadCode(qr, "png")}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                {copy("Download PNG")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadCode(qr, "svg")}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                {copy("Download SVG")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expanded?.id === qr.id && !currentDetail ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : analytics ? (
                        <>
                          {/* Stats Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {analytics.totalScans}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {copy("Total Scans")}
                              </p>
                            </div>
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {
                                  Object.keys(
                                    analytics.deviceBreakdown,
                                  ).length
                                }
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {copy("Devices")}
                              </p>
                            </div>
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {
                                  Object.keys(analytics.osBreakdown)
                                    .length
                                }
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {copy("Systems")}
                              </p>
                            </div>
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {
                                  Object.keys(
                                    analytics.countryBreakdown,
                                  ).length
                                }
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {copy("Countries")}
                              </p>
                            </div>
                          </div>

                          {analytics.totalScans === 0 ? (
                            <div className="text-center py-8">
                              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                              <p className="text-muted-foreground">
                                {copy(
                                  "No scans recorded yet. Share your QR Code!",
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analytics.osBreakdown,
                                    analytics.totalScans,
                                  )}
                                  title={copy("Operating System")}
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analytics.deviceBreakdown,
                                    analytics.totalScans,
                                  )}
                                  title={copy("Device")}
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analytics.browserBreakdown,
                                    analytics.totalScans,
                                  )}
                                  title={copy("Browser")}
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analytics.countryBreakdown,
                                    analytics.totalScans,
                                  )}
                                  title={copy("Country")}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              );
            })}
          </div>
        )}
        {pages > 1 && <nav aria-label={copy("QR Code pages")} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
          {page > 1 ? <Button asChild variant="outline" className="min-h-11"><Link href={qrListHref({ ...query, page: page - 1 })}>{copy("Previous page")}</Link></Button>
            : <Button variant="outline" className="min-h-11" disabled>{copy("Previous page")}</Button>}
          <span className="text-sm text-muted-foreground">{copy("Page {{page}} of {{pages}}", { page, pages })}</span>
          {page < pages ? <Button asChild variant="outline" className="min-h-11"><Link href={qrListHref({ ...query, page: page + 1 })}>{copy("Next page")}</Link></Button>
            : <Button variant="outline" className="min-h-11" disabled>{copy("Next page")}</Button>}
        </nav>}
      </main>
    </WorkspaceShell>
  );
};

export default MyQRCodes;
