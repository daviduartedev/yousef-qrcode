import { LibraryLogoPicker } from "@/components/assets/LibraryLogoPicker";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
const QRCodeStyled = dynamic(() => import("./QRCodePreview"), { ssr: false });
import QRDesignTab from "./QRDesignTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  saveNewStaticQRCode,
  saveQRCodeDesign,
  getQRCode,
  getTrackingUrl,
  getQRCodeAnalytics,
} from "@/lib/qrTracking";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEditorNavigation, DraftNotice } from "./EditorNavigation";
import {
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
  Check,
} from "lucide-react";
import type { CornerDotType, CornerSquareType, DotType } from "qr-code-styling";
import { templatesWithDesign as templates, logos } from "./qr-catalog";
import {
  defaultDesign,
  qrDesignSchema,
  hasVisibleContrast,
  normalizeDestination,
  frameStyles,
  type QRDesign,
} from "@/lib/qr-design";
import {
  describeQRDestination,
  isStaticQRType,
  qrTypeOf,
} from "@/lib/qr-content";
import type { QRAnalyticsResponse, QRCodeRecord } from "@/lib/qr-types";
import { QRTypeStep, type WizardType } from "./qr-wizard/QRTypeStep";
import { QRContentFields } from "./qr-wizard/QRContentFields";
import { QRDownloadDialog } from "./qr-wizard/QRDownloadDialog";
import { QRDestinationEditor } from "./QRDestinationEditor";
import {
  checkContent,
  emptyFields,
  fieldsFromContent,
  type ContentFields,
} from "./qr-wizard/content";

export type WizardStep = "type" | "content" | "design" | "done";
const steps: { id: WizardStep; label: string }[] = [
  { id: "type", label: "Type" },
  { id: "content", label: "Content" },
  { id: "design", label: "Design" },
  { id: "done", label: "Done" },
];
/** Same length as a real short code, so the design preview keeps the final module count. */
const previewShortCode = "preview00000";

const editorSnapshot = (
  url: string,
  design: QRDesign,
  tracking: boolean,
  qrType: WizardType,
  fields: ContentFields,
  title: string,
) => JSON.stringify({ url, design, tracking, qrType, fields, title });

const QRGenerator = () => {
  const { t: copy } = useTranslation("copy");
  const { t: creation } = useTranslation("creation");
  const { user } = useAuth();
  const editId = useSearchParams().get("edit");
  const router = useRouter();
  const loadedSource = useRef<string | null | undefined>(undefined);
  /** Set after creation until the URL carries the new id, so the done step is kept. */
  const pendingEdit = useRef<string | null>(null);
  const { draft, updateDraft, hasDraft, discardDraft } = useEditorNavigation();
  const blockedByDraft = hasDraft && draft.current?.editId !== editId;
  const [record, setRecord] = useState<QRCodeRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [baseline, setBaseline] = useState("");
  const [design, setDesign] = useState<QRDesign>(() =>
    structuredClone(defaultDesign),
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const selectedTemplate = design.templateId;
  const selectedLogo = design.logoId;
  const setSelectedLogo = (id: string | null) =>
    setDesign((previous) => ({
      ...previous,
      logoId: qrDesignSchema.shape.logoId.parse(id),
      logoAssetId: null,
    }));
  const setLibraryLogo = (id: string | null) =>
    setDesign((previous) => ({ ...previous, logoId: null, logoAssetId: id }));
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

  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [qrType, setQRType] = useState<WizardType>("website");
  const [fields, setFields] = useState<ContentFields>(emptyFields);
  const [title, setTitle] = useState("");
  const [step, setStep] = useState<WizardStep>("type");
  const [showErrors, setShowErrors] = useState(false);
  const [url, setUrl] = useState("");

  const [trackAnalytics, setTrackAnalytics] = useState(true);

  const [activeCustomTab, setActiveCustomTab] = useState("templates");

  const [isGenerating, setIsGenerating] = useState(false);
  const [analyticsData, setAnalyticsData] =
    useState<QRAnalyticsResponse | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const templatesScrollRef = useRef<HTMLDivElement>(null);
  const destination = normalizeDestination(url);
  const staticType = isStaticQRType(qrType) ? qrType : null;
  const contentCheck = staticType ? checkContent(staticType, fields) : null;
  const contentValid = staticType
    ? Boolean(contentCheck?.ok)
    : qrType === "website" && Boolean(destination);
  const qrValue = record
    ? record.tracking_enabled
      ? getTrackingUrl(record.short_code)
      : record.destination_url
    : staticType
      ? contentCheck?.ok
        ? contentCheck.payload
        : ""
      : trackAnalytics
        ? ""
        : destination || "";
  const designPreviewValue =
    qrValue ||
    (!record && qrType === "website" && trackAnalytics && destination
      ? getTrackingUrl(previewShortCode)
      : "");
  const trackingShortCode = record?.tracking_enabled ? record.short_code : null;
  const snapshot = editorSnapshot(url, design, trackAnalytics, qrType, fields, title);
  const dirty = ready && step !== "done" && snapshot !== baseline;

  useEffect(() => {
    if (!user?.id || blockedByDraft) return;
    if (pendingEdit.current && editId === pendingEdit.current) {
      pendingEdit.current = null;
      loadedSource.current = editId;
      return;
    }
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
        setQRType(previous.wizard?.qrType ?? "website");
        setFields(previous.wizard?.fields ?? emptyFields);
        setTitle(previous.wizard?.title ?? "");
        setStep(previous.wizard?.step ?? (editId ? "design" : "type"));
        setRecord(previous.record);
        setBaseline(previous.baseline);
      } else if (editId) {
        try {
          const result = await getQRCode(editId);
          if (cancelled) return;
          const row = result.qrCode,
            restoredDesign = row.design ?? structuredClone(defaultDesign),
            type = qrTypeOf(row.qr_type),
            restoredFields = row.content ? fieldsFromContent(row.content) : emptyFields,
            restoredTitle = row.title ?? "";
          setRecord(row);
          setUrl(row.destination_url);
          setDesign(restoredDesign);
          setTrackAnalytics(row.tracking_enabled);
          setQRType(type);
          setFields(restoredFields);
          setTitle(restoredTitle);
          setStep("design");
          setBaseline(
            editorSnapshot(
              row.destination_url,
              restoredDesign,
              row.tracking_enabled,
              type,
              restoredFields,
              restoredTitle,
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
        setTrackAnalytics(true);
        setQRType("website");
        setFields(emptyFields);
        setTitle("");
        setStep("type");
        setShowErrors(false);
        setBaseline(editorSnapshot("", initial, true, "website", emptyFields, ""));
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
      !blockedByDraft &&
      !pendingEdit.current
    )
      updateDraft(
        {
          ownerId: user.id,
          editId,
          url,
          design,
          tracking: trackAnalytics,
          tab: 0,
          wizard: { qrType, fields, title, step },
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
    qrType,
    fields,
    title,
    step,
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

  const goTo = (next: WizardStep) => {
    setStep(next);
    requestAnimationFrame(() => stepHeading.current?.focus());
  };
  const continueFromContent = () => {
    if (!contentValid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    goTo("design");
  };

  const saveDesign = async () => {
    if (!validDesign || (!record && !contentValid)) {
      toast({
        title: copy("Enter a valid HTTP/HTTPS URL and contrasting colors."),
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = record
        ? await saveQRCodeDesign(record.id, design)
        : staticType && contentCheck?.ok
          ? await saveNewStaticQRCode(contentCheck.content, title, design)
          : await saveNewQRCode(
              destination!,
              title.trim() || url,
              "website",
              design,
              trackAnalytics,
            );
      const row = result.qrCode;
      const nextFields = row.content ? fieldsFromContent(row.content) : fields;
      const nextTitle = row.title ?? "";
      setRecord(row);
      setUrl(row.destination_url);
      setFields(nextFields);
      setTitle(nextTitle);
      const savedSnapshot = editorSnapshot(
        row.destination_url,
        design,
        row.tracking_enabled,
        qrType,
        nextFields,
        nextTitle,
      );
      setBaseline(savedSnapshot);
      if (!record && user) {
        updateDraft(
          {
            ownerId: user.id,
            editId: row.id,
            url: row.destination_url,
            design,
            tracking: row.tracking_enabled,
            tab: 0,
            wizard: { qrType, fields: nextFields, title: nextTitle, step: "done" },
            record: row,
            baseline: savedSnapshot,
          },
          false,
        );
        pendingEdit.current = row.id;
        router.replace("/app?edit=" + encodeURIComponent(row.id));
        goTo("done");
      }
      toast({ title: record ? copy("QR design saved") : creation("QR code created") });
    } catch {
      toast({
        title: copy("Unable to create QR. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const startOver = () => {
    discardDraft();
    if (editId) router.push("/app");
    else {
      const initial = structuredClone(defaultDesign);
      setRecord(null);
      setUrl("");
      setDesign(initial);
      setTrackAnalytics(true);
      setQRType("website");
      setFields(emptyFields);
      setTitle("");
      setShowErrors(false);
      setBaseline(editorSnapshot("", initial, true, "website", emptyFields, ""));
      goTo("type");
    }
  };
  const downloadFailed = () =>
    toast({
      title: copy("Download failed. Check the preview and try again."),
      variant: "destructive",
    });
  const downloadName = (record?.title || title || "qr-code").slice(0, 80);

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
  const creating = !record;
  const stepIndex = steps.findIndex((item) => item.id === step);
  const typeLabel = creation(
    { website: "Website", text: "Text", email: "Email", phone: "Phone", sms: "SMS", wifi: "Wi-Fi", contactCard: "Contact card" }[qrType],
  );
  const reachable = (target: WizardStep) =>
    creating &&
    target !== "done" &&
    (target === "type" || (target === "content" ? true : contentValid));
  return (
    <fieldset
      disabled={isGenerating}
      aria-label={copy("QR editor")}
      className="bg-card rounded-lg shadow-xl p-4 sm:p-8 max-w-6xl mx-auto w-full min-w-0"
    >
      {(creating || step === "done") && (
        <nav aria-label={creation("QR creation steps")} className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {steps.map((item, index) => {
              const current = item.id === step;
              const complete = index < stepIndex;
              return (
                <li key={item.id} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />}
                  <button
                    type="button"
                    aria-current={current ? "step" : undefined}
                    disabled={!current && !reachable(item.id)}
                    onClick={() => goTo(item.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                      current
                        ? "border-primary bg-primary text-primary-foreground"
                        : complete
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    } disabled:cursor-default`}
                  >
                    <span aria-hidden="true">{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
                    {creation(item.label)}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <h2 ref={stepHeading} tabIndex={-1} className="sr-only">
        {creating || step === "done"
          ? creation("Step {{index}} of 4: {{label}}", { index: stepIndex + 1, label: creation(steps[stepIndex].label) })
          : creation("Edit QR code")}
      </h2>

      {step === "type" && creating ? (
        <div className="space-y-6">
          <QRTypeStep value={qrType} onSelect={(type) => { setQRType(type); setShowErrors(false); }} />
          <div className="flex justify-end">
            <Button size="lg" onClick={() => goTo("content")}>
              {creation("Next")}
              <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : step === "content" && creating ? (
        qrType === "contactCard" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {creation("This contact card editor is a local preview. It is not saved or published yet.")}
            </p>
            <ContactCardEditor />
            <Button variant="outline" onClick={() => goTo("type")}>
              <ChevronLeft className="w-4 h-4 me-2 rtl:rotate-180" aria-hidden="true" />
              {creation("Back")}
            </Button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(event) => { event.preventDefault(); continueFromContent(); }}
            className="grid md:grid-cols-[minmax(0,1fr),280px] gap-8"
          >
            <div className="space-y-5 min-w-0">
              <div>
                <h3 className="text-lg font-semibold">{creation("{{type}} content", { type: typeLabel })}</h3>
                <p className="text-sm text-muted-foreground">
                  {staticType
                    ? creation("Static QR: the content is stored in the pattern and cannot change after printing.")
                    : creation("Choose dynamic to track scans and change the destination without reprinting.")}
                </p>
              </div>
              {qrType === "website" ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="qr-destination" className="text-sm font-medium">
                      {copy("Destination URL")}<span aria-hidden="true"> *</span>
                    </label>
                    <Input
                      id="qr-destination"
                      dir="ltr"
                      inputMode="url"
                      placeholder={t("qrGenerator.addUrl")}
                      value={url}
                      maxLength={2048}
                      aria-invalid={showErrors && !destination}
                      aria-describedby={showErrors && !destination ? "qr-destination-error" : undefined}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    {((showErrors && !destination) || (url.trim() && !destination)) && (
                      <p id="qr-destination-error" className="text-sm text-destructive">
                        {creation("Enter a valid HTTP/HTTPS URL.")}
                      </p>
                    )}
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">{creation("QR mode")}</legend>
                    {[
                      { tracked: true, label: "Dynamic (trackable)", hint: "Uses a short QRConnect URL. Records scans and lets you change the destination later." },
                      { tracked: false, label: "Static (direct)", hint: "Encodes the URL itself. No scan tracking and the destination cannot change." },
                    ].map((option) => (
                      <label key={option.label} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${trackAnalytics === option.tracked ? "border-primary bg-primary/5" : "border-border"}`}>
                        <input
                          type="radio"
                          name="qr-mode"
                          className="mt-1"
                          checked={trackAnalytics === option.tracked}
                          onChange={() => setTrackAnalytics(option.tracked)}
                        />
                        <span>
                          <span className="block font-medium">{creation(option.label)}</span>
                          <span className="block text-sm text-muted-foreground">{creation(option.hint)}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </div>
              ) : staticType ? (
                <QRContentFields
                  type={staticType}
                  fields={fields}
                  onChange={setFields}
                  invalid={contentCheck && !contentCheck.ok ? contentCheck.fields : []}
                  showErrors={showErrors}
                />
              ) : null}
              {contentCheck && !contentCheck.ok && contentCheck.tooLong && (
                <p role="alert" className="text-sm text-destructive">
                  {creation("This content is too long for one QR code. Shorten it.")}
                </p>
              )}
              <div className="space-y-1">
                <label htmlFor="qr-title" className="text-sm font-medium">{creation("QR name (optional)")}</label>
                <Input id="qr-title" dir="auto" maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} />
                <p className="text-xs text-muted-foreground">{creation("Shown in My QR Codes. Defaults to the content.")}</p>
              </div>
              {showErrors && !contentValid && (
                <p role="alert" className="text-sm text-destructive">{creation("Review the highlighted fields to continue.")}</p>
              )}
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => goTo("type")}>
                  <ChevronLeft className="w-4 h-4 me-2 rtl:rotate-180" aria-hidden="true" />
                  {creation("Back")}
                </Button>
                <Button type="submit">
                  {creation("Next: design")}
                  <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="border-2 border-border rounded-lg p-4 bg-background" aria-label={copy("QR preview")}>
                {designPreviewValue ? (
                  <QRCodeStyled data={designPreviewValue} design={design} width={192} />
                ) : (
                  <div className="w-48 min-h-48 grid place-items-center text-muted-foreground text-sm text-center p-4">
                    {creation("Fill in the content to preview the code.")}
                  </div>
                )}
              </div>
              {!record && trackAnalytics && qrType === "website" && destination && (
                <p className="max-w-64 text-xs text-muted-foreground text-center">
                  {creation("Preview pattern. The final short URL is created in the last step.")}
                </p>
              )}
            </div>
          </form>
        )
      ) : step === "done" && record ? (
        <section className="grid md:grid-cols-[minmax(0,1fr),280px] gap-8" aria-live="polite">
          <div className="space-y-4 min-w-0">
            <h3 className="text-2xl font-semibold">{creation("Your QR code is ready")}</h3>
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{creation("Name")}</dt>
              <dd dir="auto" className="break-words">{record.title}</dd>
              <dt className="text-muted-foreground">{creation("Type")}</dt>
              <dd>{typeLabel} · {record.tracking_enabled ? creation("Dynamic (trackable)") : creation("Static")}</dd>
              <dt className="text-muted-foreground">{record.tracking_enabled ? creation("Opens") : creation("Content")}</dt>
              <dd><bdi dir="auto" className="break-all">{describeQRDestination(record)}</bdi></dd>
              {record.tracking_enabled && (
                <>
                  <dt className="text-muted-foreground">{creation("Tracking URL")}</dt>
                  <dd><bdi dir="ltr" className="break-all font-mono text-xs">{getTrackingUrl(record.short_code)}</bdi></dd>
                </>
              )}
            </dl>
            <p className="text-sm text-muted-foreground">
              {record.tracking_enabled
                ? creation("Scan the code to test it. You can change its destination later in My QR Codes without reprinting.")
                : creation("Scan the code to test it. Static content cannot change after printing.")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={"/my-qrcodes?focus=" + encodeURIComponent(record.id)}>{creation("View in My QR Codes")}</Link>
              </Button>
              <Button variant="outline" onClick={() => goTo("design")}>{creation("Edit design")}</Button>
              <Button variant="ghost" onClick={startOver}>{creation("Create another QR")}</Button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div ref={previewRef} className="border-2 border-border rounded-lg p-4 bg-background" aria-label={copy("QR preview")}>
              <QRCodeStyled data={qrValue} design={design} width={224} />
            </div>
            <QRDownloadDialog data={qrValue} design={design} name={downloadName} disabled={!validDesign} onError={downloadFailed} />
          </div>
        </section>
      ) : (
        <div className="grid md:grid-cols-[minmax(0,1fr),280px] gap-8">
          {/* Left Column */}
          <div className="space-y-6 min-w-0">
            {record ? (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 dir="auto" className="font-semibold break-words">{record.title}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {typeLabel} · {record.tracking_enabled ? creation("Dynamic (trackable)") : creation("Static")}
                  </span>
                </div>
                {staticType ? (
                  <>
                    <QRContentFields type={staticType} fields={fields} onChange={() => {}} invalid={[]} showErrors={false} readOnly />
                    <p className="text-sm text-muted-foreground">
                      {creation("Static content is stored in the pattern. Create a new QR to change it.")}
                    </p>
                  </>
                ) : record.tracking_enabled ? (
                  <QRDestinationEditor
                    record={record}
                    onChanged={(result) => {
                      setRecord(result.qrCode);
                      setUrl(result.qrCode.destination_url);
                      setBaseline(editorSnapshot(result.qrCode.destination_url, design, true, qrType, fields, title));
                    }}
                  />
                ) : (
                  <p className="text-sm">
                    <bdi dir="ltr" className="break-all">{record.destination_url}</bdi>
                    <span className="block text-muted-foreground">
                      {creation("Direct and static QR codes store their content in the pattern. Create a new QR to change it.")}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{creation("Customize the design")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {typeLabel} · <bdi dir="auto" className="break-all">{staticType && contentCheck?.ok ? describeQRDestination({ qr_type: staticType, destination_url: contentCheck.payload, content: contentCheck.content }) : destination}</bdi>
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => goTo("content")}>
                  <ChevronLeft className="w-4 h-4 me-2 rtl:rotate-180" aria-hidden="true" />
                  {creation("Back")}
                </Button>
              </div>
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

                  <LibraryLogoPicker selected={design.logoAssetId ?? null} onSelect={setLibraryLogo} />

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
              {designPreviewValue ? (
                <QRCodeStyled data={designPreviewValue} design={design} width={192} />
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
            {!qrValue && designPreviewValue && (
              <p className="max-w-64 text-xs text-muted-foreground text-center">
                {creation("Preview pattern. The final short URL is created in the last step.")}
              </p>
            )}
            {qrValue && (
              <QRDownloadDialog
                data={qrValue}
                design={design}
                name={downloadName}
                disabled={!validDesign || isGenerating}
                onError={downloadFailed}
              />
            )}
            <Button
              size="lg"
              variant={record ? "outline" : "default"}
              className="w-full"
              onClick={saveDesign}
              disabled={
                isGenerating ||
                !validDesign ||
                (!record && !contentValid) ||
                (Boolean(record) && !dirty)
              }
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" aria-hidden="true" />
                  {copy("Saving...")}
                </>
              ) : record ? (
                copy("Save QR design")
              ) : (
                creation("Create QR code")
              )}
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
