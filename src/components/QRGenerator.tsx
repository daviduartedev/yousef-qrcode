import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
const QRCodeStyled = dynamic(() => import("./QRCodePreview"), { ssr: false });
import QRDesignTab from "./QRDesignTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import ContactCardEditor from "./ContactCardEditor";
import {
  saveNewQRCode,
  saveQRCodeDesign,
  getQRCode,
  getTrackingUrl,
  getQRCodeAnalytics,
} from "@/lib/qrTracking";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEditorNavigation, DraftNotice } from "./EditorNavigation";
import {
  Globe,
  FileText,
  Download,
  Contact,
  MapPin,
  Link2,
  FileInput,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Image as ImageIcon,
  Palette,
  Frame as FrameIcon,
  Loader2,
  BarChart3,
  Smartphone,
  Monitor,
  MapPinned,
  Clock,
  RefreshCw,
} from "lucide-react";
import type { CornerDotType, CornerSquareType, DotType } from "qr-code-styling";

const tabs = [
  { icon: Globe, labelKey: "qrGenerator.tabs.website" },
  { icon: FileText, labelKey: "qrGenerator.tabs.pdf" },
  { icon: Download, labelKey: "qrGenerator.tabs.appDownloads" },
  { icon: Contact, labelKey: "qrGenerator.tabs.contactCard" },
  { icon: MapPin, labelKey: "qrGenerator.tabs.location" },
  { icon: Link2, labelKey: "qrGenerator.tabs.linkpage" },
  { icon: FileInput, labelKey: "qrGenerator.tabs.form" },
  { icon: User, labelKey: "qrGenerator.tabs.me" },
  { icon: FileInput, labelKey: "qrGenerator.tabs.form" },
];

import { templatesWithDesign as templates, logos } from "./qr-catalog";
import {
  defaultDesign,
  qrDesignSchema,
  hasVisibleContrast,
  normalizeDestination,
  frameStyles,
  type QRDesign,
} from "@/lib/qr-design";
import { downloadQR } from "@/lib/qr-export";
import type { QRAnalyticsResponse, QRCodeRecord } from "@/lib/qr-types";

const editorSnapshot = (
  url: string,
  design: QRDesign,
  tracking: boolean,
  tab: number,
) => JSON.stringify({ url, design, tracking, tab });

const QRGenerator = () => {
  const { t: copy } = useTranslation("copy");
  const { user } = useAuth();
  const editId = useSearchParams().get("edit");
  const router = useRouter();
  const loadedSource = useRef<string | null | undefined>(undefined);
  const { draft, updateDraft, hasDraft } = useEditorNavigation();
  const blockedByDraft = hasDraft && draft.current?.editId !== editId;
  const [record, setRecord] = useState<QRCodeRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [baseline, setBaseline] = useState("");
  const [design, setDesign] = useState<QRDesign>(() =>
    structuredClone(defaultDesign),
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const selectedTemplate = design.templateId;
  const selectedLogo = design.logoId;
  const setSelectedLogo = (id: string | null) =>
    setDesign((previous) => ({
      ...previous,
      logoId: qrDesignSchema.shape.logoId.parse(id),
    }));
  const setSelectedTemplate = (id: number) =>
    setDesign(
      structuredClone(templates.find((item) => item.id === id)!.design),
    );
  const customDotsType = design.dotsOptions.type,
    customDotsColor = design.dotsOptions.color;
  const customCornersType = design.cornersSquareOptions.type,
    customCornersColor = design.cornersSquareOptions.color;
  const customCornersDotType = design.cornersDotOptions.type,
    customBgColor = design.backgroundOptions.color;
  const setCustomDotsType = (type: DotType) =>
    setDesign((previous) => ({
      ...previous,
      dotsOptions: { ...previous.dotsOptions, type },
    }));
  const setCustomDotsColor = (color: string) =>
    setDesign((previous) => ({
      ...previous,
      dotsOptions: { ...previous.dotsOptions, color, gradient: undefined },
    }));
  const setCustomCornersType = (type: CornerSquareType) =>
    setDesign((previous) => ({
      ...previous,
      cornersSquareOptions: {
        ...previous.cornersSquareOptions,
        type: qrDesignSchema.shape.cornersSquareOptions.shape.type.parse(type),
      },
    }));
  const setCustomCornersDotType = (type: CornerDotType) =>
    setDesign((previous) => ({
      ...previous,
      cornersDotOptions: {
        ...previous.cornersDotOptions,
        type: qrDesignSchema.shape.cornersDotOptions.shape.type.parse(type),
      },
    }));
  const setCustomCornersColor = (color: string) =>
    setDesign((previous) => ({
      ...previous,
      cornersSquareOptions: {
        ...previous.cornersSquareOptions,
        color,
        gradient: undefined,
      },
      cornersDotOptions: {
        ...previous.cornersDotOptions,
        color,
        gradient: undefined,
      },
    }));
  const setCustomBgColor = (color: string) =>
    setDesign((previous) => ({ ...previous, backgroundOptions: { color } }));
  const validDesign =
    qrDesignSchema.safeParse(design).success && hasVisibleContrast(design);
  const exportQR = async () => {
    setIsDownloading(true);
    try {
      await downloadQR(
        previewRef.current?.querySelector("svg") ?? null,
        downloadFormat as "png" | "svg",
      );
    } catch {
      toast({
        title: copy("Download failed. Check the preview and try again."),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [url, setUrl] = useState("");

  const [trackAnalytics, setTrackAnalytics] = useState(false);

  const [activeCustomTab, setActiveCustomTab] = useState("templates");

  const [downloadFormat, setDownloadFormat] = useState("png");
  const [isGenerating, setIsGenerating] = useState(false);
  const [analyticsData, setAnalyticsData] =
    useState<QRAnalyticsResponse | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const templatesScrollRef = useRef<HTMLDivElement>(null);
  const destination = normalizeDestination(url);
  const qrValue = trackAnalytics
    ? record?.tracking_enabled && record.destination_url === destination
      ? getTrackingUrl(record.short_code)
      : ""
    : destination || "";
  const trackingShortCode = record?.tracking_enabled ? record.short_code : null;
  const snapshot = editorSnapshot(url, design, trackAnalytics, activeTab);
  const dirty = ready && snapshot !== baseline;

  useEffect(() => {
    if (!user?.id || blockedByDraft) return;
    let cancelled = false;
    loadedSource.current = undefined;
    setReady(false);
    setLoadError(false);
    const restore = async () => {
      const previous = draft.current;
      if (previous?.ownerId === user.id && previous.editId === editId) {
        setUrl(previous.url);
        setDesign(previous.design);
        setTrackAnalytics(previous.tracking);
        setActiveTab(previous.tab);
        setRecord(previous.record);
        setBaseline(previous.baseline);
      } else if (editId) {
        try {
          const result = await getQRCode(editId);
          if (cancelled) return;
          const row = result.qrCode,
            restoredDesign = row.design ?? structuredClone(defaultDesign);
          const tab = Math.max(
            0,
            tabs.findIndex((item) => item.labelKey === row.qr_type),
          );
          setRecord(row);
          setUrl(row.destination_url);
          setDesign(restoredDesign);
          setTrackAnalytics(row.tracking_enabled);
          setActiveTab(tab);
          setBaseline(
            editorSnapshot(
              row.destination_url,
              restoredDesign,
              row.tracking_enabled,
              tab,
            ),
          );
        } catch {
          if (!cancelled) setLoadError(true);
        }
      } else {
        const initial = structuredClone(defaultDesign);
        setRecord(null);
        setUrl("");
        setDesign(initial);
        setTrackAnalytics(false);
        setActiveTab(0);
        setBaseline(editorSnapshot("", initial, false, 0));
      }
      if (!cancelled) {
        loadedSource.current = editId;
        setReady(true);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [editId, user?.id, draft, blockedByDraft]);

  useEffect(() => {
    if (
      ready &&
      loadedSource.current === editId &&
      !loadError &&
      user?.id &&
      !blockedByDraft
    )
      updateDraft(
        {
          ownerId: user.id,
          editId,
          url,
          design,
          tracking: trackAnalytics,
          tab: activeTab,
          record,
          baseline,
        },
        dirty,
      );
  }, [
    ready,
    loadError,
    user?.id,
    editId,
    url,
    design,
    trackAnalytics,
    activeTab,
    record,
    baseline,
    dirty,
    updateDraft,
    blockedByDraft,
  ]);

  // Fetch analytics when tracking code changes
  const fetchAnalytics = useCallback(async () => {
    if (!trackingShortCode) return;

    setIsLoadingAnalytics(true);
    try {
      const data = await getQRCodeAnalytics(trackingShortCode);
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [trackingShortCode]);

  useEffect(() => {
    if (trackingShortCode) {
      fetchAnalytics();
    }
  }, [trackingShortCode, fetchAnalytics]);

  const saveDesign = async () => {
    const destinationUrl = normalizeDestination(url);
    if (!destinationUrl || !validDesign) {
      toast({
        title: copy("Enter a valid HTTP/HTTPS URL and contrasting colors."),
        variant: "destructive",
      });
      return;
    }
    if (!trackAnalytics && !previewRef.current?.querySelector("svg")) {
      toast({
        title: copy(
          "Use a shorter URL and contrasting valid colors to generate this QR.",
        ),
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = record
        ? await saveQRCodeDesign(record.id, design)
        : await saveNewQRCode(
            destinationUrl,
            url,
            tabs[activeTab].labelKey,
            design,
            trackAnalytics,
          );
      setRecord(result.qrCode);
      setUrl(result.qrCode.destination_url);
      const savedSnapshot = editorSnapshot(
        result.qrCode.destination_url,
        design,
        trackAnalytics,
        activeTab,
      );
      setBaseline(savedSnapshot);
      if (!record && user) {
        updateDraft(
          {
            ownerId: user.id,
            editId: result.qrCode.id,
            url: result.qrCode.destination_url,
            design,
            tracking: trackAnalytics,
            tab: activeTab,
            record: result.qrCode,
            baseline: savedSnapshot,
          },
          false,
        );
        router.replace("/app?edit=" + encodeURIComponent(result.qrCode.id));
      }
      toast({ title: copy("QR design saved") });
    } catch {
      toast({
        title: copy("Unable to create QR. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const handleGenerateQR = () => {
    if (trackAnalytics && !record) void saveDesign();
  };

  // Handle template carousel scroll
  const scrollTemplates = (direction: "left" | "right") => {
    if (templatesScrollRef.current) {
      const scrollAmount = 200;
      const currentScroll = templatesScrollRef.current.scrollLeft;
      const newScroll =
        direction === "left"
          ? currentScroll - scrollAmount
          : currentScroll + scrollAmount;

      templatesScrollRef.current.scrollTo({
        left: newScroll,
        behavior: "smooth",
      });
    }
  };

  if (blockedByDraft) return <DraftNotice />;
  if (!ready || loadedSource.current !== editId)
    return (
      <p role="status" className="text-center p-8">
        {copy("Loading QR editor...")}
      </p>
    );
  if (loadError)
    return (
      <p role="alert" className="text-center p-8">
        {copy("Unable to open this QR. Return to My QR Codes and try again.")}
      </p>
    );
  return (
    <fieldset
      disabled={isGenerating}
      aria-label={copy("QR editor")}
      className="bg-card rounded-lg shadow-xl p-4 sm:p-8 max-w-6xl mx-auto w-full min-w-0"
    >
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              disabled={Boolean(record) || isGenerating}
              className={`flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap transition-colors ${
                activeTab === index
                  ? "bg-primary/10 text-primary border border-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{t(tab.labelKey)}</span>
            </button>
          );
        })}
        <button className="p-2 hover:bg-muted rounded-md">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Contact Card Tab - Special Layout */}
      {activeTab === 3 ? (
        <ContactCardEditor />
      ) : (
        <div className="grid md:grid-cols-[minmax(0,1fr),280px] gap-8">
          {/* Left Column */}
          <div className="space-y-6 min-w-0">
            {/* URL Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                aria-label={copy("Destination URL")}
                placeholder={copy(
                  activeTab === 0
                    ? t("qrGenerator.addUrl")
                    : activeTab === 1
                      ? t("qrGenerator.addPdfUrl")
                      : activeTab === 2
                        ? t("qrGenerator.addAppStoreUrl")
                        : activeTab === 4
                          ? t("qrGenerator.enterLocation")
                          : activeTab === 5
                            ? t("qrGenerator.addLinkpageUrl")
                            : activeTab === 6
                              ? t("qrGenerator.addFormUrl")
                              : t("qrGenerator.enterValue"),
                )}
                value={url}
                readOnly={Boolean(record)}
                disabled={isGenerating}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                size="lg"
                className="px-8"
                onClick={handleGenerateQR}
                disabled={
                  isGenerating ||
                  !normalizeDestination(url) ||
                  !validDesign ||
                  Boolean(record)
                }
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {copy("Gerando...")}
                  </>
                ) : (
                  t("qrGenerator.generateQR")
                )}
              </Button>
            </div>

            {/* Toggles */}
            {url.trim() && !destination && (
              <p role="alert" className="text-sm text-destructive">
                {copy("Enter a valid HTTP/HTTPS URL and contrasting colors.")}
              </p>
            )}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={trackAnalytics}
                  aria-label={t("qrGenerator.trackAnalytics")}
                  disabled={Boolean(record) || isGenerating}
                  onCheckedChange={setTrackAnalytics}
                />
                <span className="text-sm font-medium">
                  {t("qrGenerator.trackAnalytics")}
                </span>
              </div>
            </div>

            {record && (
              <p className="text-sm text-muted-foreground">
                {copy(
                  "Editing saved design. Destination and tracking mode are read-only.",
                )}
              </p>
            )}

            {/* Tracking Info & Analytics Section */}
            {trackingShortCode && (
              <Collapsible
                open={isAnalyticsOpen}
                onOpenChange={setIsAnalyticsOpen}
              >
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                      <div className="text-left">
                        <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          {copy("QR Code com tracking ativo! Código:")}
                          <span className="font-mono font-bold">
                            {trackingShortCode}
                          </span>
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {analyticsData?.analytics?.totalScans || 0}{" "}
                          {copy(
                            "scans registrados • Clique para ver analytics",
                          )}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-green-600 transition-transform ${isAnalyticsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-green-200 dark:border-green-800 p-4 space-y-4">
                      {/* Refresh Button */}
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchAnalytics}
                          disabled={isLoadingAnalytics}
                          className="text-xs"
                        >
                          <RefreshCw
                            className={`w-3 h-3 mr-1 ${isLoadingAnalytics ? "animate-spin" : ""}`}
                          />
                          {copy("Atualizar")}
                        </Button>
                      </div>

                      {isLoadingAnalytics ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                        </div>
                      ) : analyticsData?.analytics ? (
                        <>
                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                              <p className="text-2xl font-bold text-primary">
                                {analyticsData.analytics.totalScans}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {copy("Total Scans")}
                              </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                              <p className="text-2xl font-bold text-primary">
                                {analyticsData.analytics.uniqueCountries
                                  ?.length || 0}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {copy("Países")}
                              </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                              <p className="text-2xl font-bold text-primary">
                                {
                                  Object.keys(
                                    analyticsData.analytics.deviceBreakdown ||
                                      {},
                                  ).length
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {copy("Dispositivos")}
                              </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm">
                              <p className="text-2xl font-bold text-primary">
                                {
                                  Object.keys(
                                    analyticsData.analytics.browserBreakdown ||
                                      {},
                                  ).length
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {copy("Navegadores")}
                              </p>
                            </div>
                          </div>

                          {/* Device & Browser Breakdown */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Devices */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />{" "}
                                {copy("Dispositivos")}
                              </h4>
                              {Object.keys(
                                analyticsData.analytics.deviceBreakdown || {},
                              ).length > 0 ? (
                                <div className="space-y-2">
                                  {Object.entries(
                                    analyticsData.analytics.deviceBreakdown,
                                  ).map(([device, count]) => (
                                    <div
                                      key={device}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-sm capitalize">
                                        {copy(device)}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-primary rounded-full"
                                            style={{
                                              width: `${(count / analyticsData.analytics.totalScans) * 100}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="text-xs text-muted-foreground w-8">
                                          {count}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  {copy("Nenhum dado ainda")}
                                </p>
                              )}
                            </div>

                            {/* Browsers */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Monitor className="w-4 h-4" />{" "}
                                {copy("Navegadores")}
                              </h4>
                              {Object.keys(
                                analyticsData.analytics.browserBreakdown || {},
                              ).length > 0 ? (
                                <div className="space-y-2">
                                  {Object.entries(
                                    analyticsData.analytics.browserBreakdown,
                                  ).map(([browser, count]: [string, any]) => (
                                    <div
                                      key={browser}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-sm capitalize">
                                        {copy(browser)}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{
                                              width: `${(count / analyticsData.analytics.totalScans) * 100}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="text-xs text-muted-foreground w-8">
                                          {count}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  {copy("Nenhum dado ainda")}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Countries */}
                          {analyticsData.analytics.uniqueCountries?.length >
                            0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <MapPinned className="w-4 h-4" />{" "}
                                {copy("Países")}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {analyticsData.analytics.uniqueCountries.map(
                                  (country: string) => (
                                    <span
                                      key={country}
                                      className="px-2 py-1 bg-muted rounded-full text-xs"
                                    >
                                      {copy(country)}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                          {/* Recent Scans */}
                          {analyticsData.analytics.recentScans?.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" />{" "}
                                {copy("Scans Recentes")}
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {analyticsData.analytics.recentScans.map(
                                  (scan, index: number) => (
                                    <div
                                      key={scan.id || index}
                                      className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">
                                          {new Date(
                                            scan.scanned_at,
                                          ).toLocaleString(
                                            i18n.language === "ar"
                                              ? "ar"
                                              : "en",
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <span>
                                          {copy(scan.device_type || "unknown")}
                                        </span>
                                        <span>•</span>
                                        <span>
                                          {copy(
                                            scan.city ||
                                              scan.country ||
                                              "unknown",
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            {copy("Nenhum scan registrado ainda.")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {copy(
                              "Os dados aparecerão aqui quando alguém escanear o QR code.",
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Customization Tabs */}
            <div className="border-t border-border pt-6">
              <div className="flex gap-2 mb-4 overflow-x-auto">
                {[
                  {
                    id: "templates",
                    icon: ImageIcon,
                    labelKey: "qrGenerator.customization.templates",
                  },
                  {
                    id: "logo",
                    icon: ImageIcon,
                    labelKey: "qrGenerator.customization.logo",
                  },
                  {
                    id: "design",
                    icon: Palette,
                    labelKey: "qrGenerator.customization.design",
                  },
                  {
                    id: "frame",
                    icon: FrameIcon,
                    labelKey: "qrGenerator.customization.frame",
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCustomTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        activeCustomTab === tab.id
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {t(tab.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Templates Section */}
              {activeCustomTab === "templates" && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    {t("qrGenerator.customization.selectFromTemplates")}
                  </h3>
                  <div className="flex items-center gap-3 w-full">
                    <button
                      onClick={() => scrollTemplates("left")}
                      className="p-1 hover:bg-muted rounded flex-shrink-0"
                      aria-label={copy("Scroll templates left")}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div
                      ref={templatesScrollRef}
                      className="flex gap-3 overflow-x-auto scrollbar-hide flex-1 min-w-0 py-2 max-w-[528px]"
                    >
                      {templates.map((template) => (
                        <button
                          type="button"
                          title={copy(template.name)}
                          aria-label={copy(template.name)}
                          aria-pressed={selectedTemplate === template.id}
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`border-2 rounded-lg p-3 hover:border-primary cursor-pointer transition-colors flex-shrink-0 ${
                            selectedTemplate === template.id
                              ? "border-primary"
                              : "border-border"
                          }`}
                        >
                          <div className="w-16 h-16 flex items-center justify-center">
                            <QRCodeStyled
                              data="https://example.com"
                              width={64}
                              height={64}
                              design={template.design}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => scrollTemplates("right")}
                      className="p-1 hover:bg-muted rounded flex-shrink-0"
                      aria-label={copy("Scroll templates right")}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Design Section */}
              {/* Logo Section */}
              {activeCustomTab === "logo" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">
                    {copy("Select Logo")}
                  </h3>
                  <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-2">
                    {logos.map((logo) => {
                      const isSelected = selectedLogo === logo.id;
                      return (
                        <button
                          key={logo.id}
                          onClick={() =>
                            setSelectedLogo(isSelected ? null : logo.id)
                          }
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105 ${
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2"
                              : "hover:bg-muted"
                          }`}
                          title={copy(logo.label)}
                        >
                          {logo.icon ? (
                            <logo.icon
                              className="w-6 h-6"
                              style={{ color: logo.color }}
                            />
                          ) : logo.svg ? (
                            <div
                              className="w-6 h-6"
                              style={{ color: logo.color }}
                              dangerouslySetInnerHTML={{ __html: logo.svg }}
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setSelectedLogo(null)}
                    className="text-sm text-primary hover:underline"
                  >
                    {copy("Remove logo")}
                  </button>
                </div>
              )}

              {activeCustomTab === "design" && (
                <QRDesignTab
                  dotsType={customDotsType}
                  onDotsTypeChange={setCustomDotsType}
                  dotsColor={customDotsColor}
                  onDotsColorChange={setCustomDotsColor}
                  eyesType={customCornersType}
                  onEyesTypeChange={setCustomCornersType}
                  eyesColor={customCornersColor}
                  onEyesColorChange={setCustomCornersColor}
                  cornerDotType={customCornersDotType}
                  onCornerDotTypeChange={setCustomCornersDotType}
                  backgroundColor={customBgColor}
                  onBackgroundColorChange={setCustomBgColor}
                />
              )}

              {activeCustomTab === "frame" && (
                <div className="space-y-4">
                  <label className="text-sm font-medium" htmlFor="qr-frame">
                    {copy("Frame style")}
                  </label>
                  <select
                    id="qr-frame"
                    className="w-full rounded-md border border-border bg-background p-2"
                    value={design.frame.style}
                    onChange={(event) =>
                      setDesign((previous) => ({
                        ...previous,
                        frame: {
                          ...previous.frame,
                          style: qrDesignSchema.shape.frame.shape.style.parse(
                            event.target.value,
                          ),
                        },
                      }))
                    }
                  >
                    {frameStyles.map((style) => (
                      <option key={style} value={style}>
                        {copy(style)}
                      </option>
                    ))}
                  </select>
                  {!design.frame.style.startsWith("circle-") &&
                    design.frame.style !== "none" && (
                      <>
                        <label
                          htmlFor="qr-frame-text"
                          className="text-sm font-medium"
                        >
                          {copy("Frame text")}
                        </label>
                        <Input
                          id="qr-frame-text"
                          maxLength={40}
                          value={design.frame.text}
                          onChange={(event) =>
                            setDesign((previous) => ({
                              ...previous,
                              frame: {
                                ...previous.frame,
                                text: event.target.value,
                              },
                            }))
                          }
                        />
                      </>
                    )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 md:min-w-[280px]">
            <div
              ref={previewRef}
              className="border-2 border-border rounded-lg p-4 bg-background"
              aria-label={copy("QR preview")}
            >
              {qrValue ? (
                <QRCodeStyled data={qrValue} design={design} width={192} />
              ) : (
                <div className="w-48 min-h-48 grid place-items-center text-muted-foreground text-sm text-center p-4">
                  {t("qrGenerator.enterUrlToGenerate")}
                </div>
              )}
            </div>
            {!validDesign && (
              <p role="alert" className="max-w-64 text-sm text-destructive">
                {copy("Use valid colors with enough contrast.")}
              </p>
            )}
            {trackAnalytics && !qrValue && (
              <p className="max-w-64 text-sm text-muted-foreground">
                {copy(
                  "Generate again after changing the destination or tracking mode.",
                )}
              </p>
            )}
            <div className="w-full">
              <label
                htmlFor="qr-format"
                className="text-sm font-medium mb-2 block"
              >
                {t("qrGenerator.downloadFormat")}
              </label>
              <Select value={downloadFormat} onValueChange={setDownloadFormat}>
                <SelectTrigger id="qr-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">{copy("PNG")}</SelectItem>
                  <SelectItem value="svg">{copy("SVG")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={exportQR}
              disabled={
                !qrValue || !validDesign || isGenerating || isDownloading
              }
            >
              {isDownloading ? copy("Downloading...") : copy("Download QR")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={saveDesign}
              disabled={
                isGenerating ||
                !destination ||
                !validDesign ||
                (Boolean(record) && !dirty)
              }
            >
              {isGenerating ? copy("Saving...") : copy("Save QR design")}
            </Button>
            <p
              role="status"
              className="max-w-64 text-xs text-muted-foreground text-center"
            >
              {dirty
                ? copy("Unsaved changes")
                : record
                  ? copy("All changes saved")
                  : copy("Choose a destination and customize your QR.")}
            </p>
          </div>
        </div>
      )}
    </fieldset>
  );
};
export default QRGenerator;
