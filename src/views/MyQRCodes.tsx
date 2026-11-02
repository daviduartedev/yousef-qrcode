'use client';

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
const QRCodeStyled = dynamic(() => import('@/components/QRCodeStyled'), { ssr: false });
import { getAllQRCodes, getQRCodeAnalytics, deleteQRCode, getTrackingUrl } from '@/lib/qrTracking';
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Download
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

interface QRCodeData {
  id: string;
  short_code: string;
  destination_url: string;
  title: string | null;
  qr_type: string | null;
  total_scans: number | null;
  is_active: boolean | null;
  created_at: string;
}

interface Analytics {
  totalScans: number;
  deviceBreakdown: Record<string, number>;
  osBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}

const MyQRCodes = () => {
  const { user } = useAuth();
  const navigate = useRouter().push;
  const { toast } = useToast();
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, Analytics>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    let cancelled = false;
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    getAllQRCodes().then(data => {
      if (!cancelled) setQrCodes(data);
    }).catch(() => {
      if (!cancelled) toast({title:'Não foi possível carregar os QR Codes',variant:'destructive'});
    }).finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId, toast]);

  const fetchAnalyticsForQR = async (qrCodeId: string) => {
    if (analyticsMap[qrCodeId]) return;
    const qr = qrCodes.find(item => item.id === qrCodeId);
    if (!qr) return;
    setLoadingAnalytics(qrCodeId);
    try {
      const result = await getQRCodeAnalytics(qr.short_code);
      setAnalyticsMap(previous => ({ ...previous, [qrCodeId]: result.analytics }));
    } catch {
      toast({title:'Não foi possível carregar as estatísticas', variant:'destructive'});
    } finally { setLoadingAnalytics(null); }
  };

  const handleExpand = (qrCodeId: string) => {
    const newExpanded = expandedQR === qrCodeId ? null : qrCodeId;
    setExpandedQR(newExpanded);
    if (newExpanded) {
      fetchAnalyticsForQR(qrCodeId);
    }
  };

  const handleDelete = async (qrCodeId: string) => {
    if (!confirm("Are you sure you want to delete this QR Code?")) return;

    try {
      await deleteQRCode(qrCodeId);
      setQrCodes(prev => prev.filter(qr => qr.id !== qrCodeId));
      toast({ title: "QR Code deleted successfully" });
    } catch (error) {
      console.error("Error deleting QR code:", error);
      toast({ title: "Error deleting QR Code", variant: "destructive" });
    }
  };

  const getQRUrl = getTrackingUrl;

  const copyToClipboard = (shortCode: string) => {
    navigator.clipboard.writeText(getQRUrl(shortCode));
    toast({ title: "Link copied to clipboard!" });
  };

  const downloadQR = (shortCode: string, title: string | null) => {
    const svg = document.getElementById(`qr-${shortCode}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-${title || shortCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const convertToChartData = (breakdown: Record<string, number>, total: number) => {
    return Object.entries(breakdown).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
    }));
  };

  const DonutChart = ({
    data,
    title
  }: {
    data: { name: string; value: number; percentage: string }[];
    title: string;
  }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No data yet</p>
        </div>
      );
    }

    return (
      <div className="w-full">
        <h4 className="text-sm font-semibold mb-2 text-center">{title}</h4>
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
                          {item.value} scans ({item.percentage}%)
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
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: COLOR_ARRAY[index % COLOR_ARRAY.length] }}
                />
                <span className="truncate max-w-[100px]">{item.name}</span>
              </div>
              <span className="text-muted-foreground font-medium">{item.percentage}%</span>
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
            <h1 className="text-3xl font-bold">My QR Codes</h1>
            <p className="text-muted-foreground mt-1">
              Manage and view analytics for your QR Codes
            </p>
          </div>
          <Button onClick={() => navigate("/app")}>
            <Plus className="w-4 h-4 mr-2" />
            Create New QR Code
          </Button>
        </div>

        {qrCodes.length === 0 ? (
          <Card className="p-12 text-center">
            <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No QR Codes saved</h2>
            <p className="text-muted-foreground mb-6">
              Create your first QR Code with tracking to see analytics here.
            </p>
            <Button onClick={() => navigate("/app")}>
              <Plus className="w-4 h-4 mr-2" />
              Create QR Code
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {qrCodes.map((qr) => (
              <Card key={qr.id} className="overflow-hidden">
                <Collapsible open={expandedQR === qr.id} onOpenChange={() => handleExpand(qr.id)}>
                  <CollapsibleTrigger asChild>
                    <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <QrCode className="w-6 h-6 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold break-words">{qr.title || qr.destination_url}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3 shrink-0" />
                                {qr.total_scans || 0} scans
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {new Date(qr.created_at).toLocaleDateString("en-US")}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(qr.destination_url, "_blank");
                            }}
                            title="Open destination"
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
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <ChevronDown
                            className={`w-5 h-5 text-muted-foreground transition-transform ${expandedQR === qr.id ? "rotate-180" : ""
                              }`}
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-border p-6 bg-muted/30">
                      {loadingAnalytics === qr.id ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : analyticsMap[qr.id] ? (
                        <>
                          {/* QR Code Preview Section */}
                          <div className="mb-6 p-4 bg-card rounded-lg shadow-sm">
                            <h4 className="text-sm font-semibold mb-4">Your QR Code</h4>
                            <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                                <div id={`qr-${qr.short_code}`}>
                                  <QRCodeStyled
                                    data={getQRUrl(qr.short_code)}
                                    width={150}
                                    height={150}
                                    qrOptions={{
                                      errorCorrectionLevel: "H",
                                    }}
                                    imageOptions={{
                                      hideBackgroundDots: true,
                                      imageSize: 0.4,
                                      margin: 5
                                    }}
                                    dotsOptions={{
                                      type: "square",
                                      color: "#000000"
                                    }}
                                    backgroundOptions={{
                                      color: "#ffffff"
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Scan URL</p>
                                  <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                                    {getQRUrl(qr.short_code)}
                                  </code>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Destination</p>
                                  <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                                    {qr.destination_url}
                                  </code>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(qr.short_code)}
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Link
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadQR(qr.short_code, qr.title)}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download PNG
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Stats Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {analyticsMap[qr.id].totalScans}
                              </p>
                              <p className="text-sm text-muted-foreground">Total Scans</p>
                            </div>
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {Object.keys(analyticsMap[qr.id].deviceBreakdown).length}
                              </p>
                              <p className="text-sm text-muted-foreground">Devices</p>
                            </div>
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {Object.keys(analyticsMap[qr.id].osBreakdown).length}
                              </p>
                              <p className="text-sm text-muted-foreground">Systems</p>
                            </div>
                            <div className="bg-card rounded-lg p-4 text-center shadow-sm">
                              <p className="text-3xl font-bold text-primary">
                                {Object.keys(analyticsMap[qr.id].countryBreakdown).length}
                              </p>
                              <p className="text-sm text-muted-foreground">Countries</p>
                            </div>
                          </div>

                          {analyticsMap[qr.id].totalScans === 0 ? (
                            <div className="text-center py-8">
                              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                              <p className="text-muted-foreground">
                                No scans recorded yet. Share your QR Code!
                              </p>
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analyticsMap[qr.id].osBreakdown,
                                    analyticsMap[qr.id].totalScans
                                  )}
                                  title="Operating System"
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analyticsMap[qr.id].deviceBreakdown,
                                    analyticsMap[qr.id].totalScans
                                  )}
                                  title="Device"
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analyticsMap[qr.id].browserBreakdown,
                                    analyticsMap[qr.id].totalScans
                                  )}
                                  title="Browser"
                                />
                              </div>
                              <div className="bg-card rounded-lg p-4 shadow-sm">
                                <DonutChart
                                  data={convertToChartData(
                                    analyticsMap[qr.id].countryBreakdown,
                                    analyticsMap[qr.id].totalScans
                                  )}
                                  title="Country"
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
