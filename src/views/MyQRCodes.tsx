"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useRef } from "react";
import { useEditorNavigation } from "@/components/EditorNavigation";
import type { QRCodeRecord } from "@/lib/qr-types";
import { downloadQR } from "@/lib/qr-export";
import dynamic from "next/dynamic";
const QRCodeStyled = dynamic(() => import("@/components/QRCodePreview"), {
  ssr: false,
});
import {
  getAllQRCodes,
  getQRCodeAnalytics,
  deleteQRCode,
  getTrackingUrl,
} from "@/lib/qrTracking";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
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

const MyQRCodes = () => {
  const { t: copy, i18n } = useTranslation("copy");
  const { user } = useAuth();
  const { navigate } = useEditorNavigation();
  const { toast } = useToast();
  const [qrCodes, setQrCodes] = useState<QRCodeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, Analytics>>(
    {},
  );
  const [loadingAnalytics, setLoadingAnalytics] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getAllQRCodes()
      .then((data) => {
        if (!cancelled) setQrCodes(data);
      })
      .catch(() => {
        if (!cancelled)
          toast({
            title: copy("Não foi possível carregar os QR Codes"),
            variant: "destructive",
          });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, toast, copy]);

  const fetchAnalyticsForQR = async (qrCodeId: string) => {
    if (analyticsMap[qrCodeId]) return;
    const qr = qrCodes.find((item) => item.id === qrCodeId);
    if (!qr) return;
    setLoadingAnalytics(qrCodeId);
    try {
      const result = await getQRCodeAnalytics(qr.short_code);
      setAnalyticsMap((previous) => ({
        ...previous,
        [qrCodeId]: result.analytics,
      }));
    } catch {
      toast({
        title: copy("Não foi possível carregar as estatísticas"),
        variant: "destructive",
      });
    } finally {
      setLoadingAnalytics(null);
    }
  };

  const handleExpand = (qrCodeId: string) => {
    const newExpanded = expandedQR === qrCodeId ? null : qrCodeId;
    setExpandedQR(newExpanded);
    if (newExpanded) {
      fetchAnalyticsForQR(qrCodeId);
    }
  };

  const handleDelete = async (qrCodeId: string) => {
    if (!confirm(copy("Are you sure you want to delete this QR Code?"))) return;

    try {
      await deleteQRCode(qrCodeId);
      setQrCodes((prev) => prev.filter((qr) => qr.id !== qrCodeId));
      toast({ title: copy("QR Code deleted successfully") });
    } catch (error) {
      console.error("Error deleting QR code:", error);
      toast({ title: copy("Error deleting QR Code"), variant: "destructive" });
    }
  };

  const getQRUrl = (qr: QRCodeRecord) =>
    qr.tracking_enabled ? getTrackingUrl(qr.short_code) : qr.destination_url;

  const copyToClipboard = (qr: QRCodeRecord) => {
    navigator.clipboard.writeText(getQRUrl(qr));
    toast({ title: copy("Link copied to clipboard!") });
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{copy("My QR Codes")}</h1>
            <p className="text-muted-foreground mt-1">
              {copy("Manage and view analytics for your QR Codes")}
            </p>
          </div>
          <Button onClick={() => navigate("/app")}>
            <Plus className="w-4 h-4 mr-2" />
            {copy("Create New QR Code")}
          </Button>
        </div>

        {qrCodes.length === 0 ? (
          <Card className="p-12 text-center">
            <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {copy("No QR Codes saved")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {copy(
                "Create your first QR Code with tracking to see analytics here.",
              )}
            </p>
            <Button onClick={() => navigate("/app")}>
              <Plus className="w-4 h-4 mr-2" />
              {copy("Create QR Code")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {qrCodes.map((qr) => (
              <Card key={qr.id} className="overflow-hidden">
                <Collapsible
                  open={expandedQR === qr.id}
                  onOpenChange={() => handleExpand(qr.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <SavedQRThumbnail qr={qr} data={getQRUrl(qr)} />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold break-words">
                              {qr.title || qr.destination_url}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3 shrink-0" />
                                {qr.total_scans || 0} {copy("scans")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {new Date(qr.created_at).toLocaleDateString(
                                  i18n.language === "ar" ? "ar" : "en",
                                )}
                              </span>
                              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                                {qr.short_code}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={copy("Edit design")}
                            aria-label={copy("Edit design")}
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(
                                "/app?edit=" + encodeURIComponent(qr.id),
                              );
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(qr.destination_url, "_blank");
                            }}
                            title={copy("Open destination")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(qr.id);
                            }}
                            className="text-destructive hover:text-destructive"
                            title={copy("Delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <ChevronDown
                            className={`w-5 h-5 text-muted-foreground transition-transform ${
                              expandedQR === qr.id ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

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

                      {loadingAnalytics === qr.id ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : analyticsMap[qr.id] ? (
                        <>
                          {/* Stats Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {analyticsMap[qr.id].totalScans}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {copy("Total Scans")}
                              </p>
                            </div>
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {
                                  Object.keys(
                                    analyticsMap[qr.id].deviceBreakdown,
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
                                  Object.keys(analyticsMap[qr.id].osBreakdown)
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
                                    analyticsMap[qr.id].countryBreakdown,
                                  ).length
                                }
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {copy("Countries")}
                              </p>
                            </div>
                          </div>

                          {analyticsMap[qr.id].totalScans === 0 ? (
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
                                    analyticsMap[qr.id].osBreakdown,
                                    analyticsMap[qr.id].totalScans,
                                  )}
                                  title={copy("Operating System")}
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analyticsMap[qr.id].deviceBreakdown,
                                    analyticsMap[qr.id].totalScans,
                                  )}
                                  title={copy("Device")}
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analyticsMap[qr.id].browserBreakdown,
                                    analyticsMap[qr.id].totalScans,
                                  )}
                                  title={copy("Browser")}
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analyticsMap[qr.id].countryBreakdown,
                                    analyticsMap[qr.id].totalScans,
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyQRCodes;
