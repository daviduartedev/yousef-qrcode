"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { QRDesign } from "@/lib/qr-design";
import type { QRCodeRecord } from "@/lib/qr-types";
import { Button } from "./ui/button";

export interface EditorDraft {
  ownerId: string;
  editId: string | null;
  url: string;
  design: QRDesign;
  tracking: boolean;
  tab: number;
  record: QRCodeRecord | null;
  baseline: string;
}
interface Navigation {
  draft: React.RefObject<EditorDraft | null>;
  hasDraft: boolean;
  updateDraft: (draft: EditorDraft, dirty: boolean) => void;
  confirmLeave: () => boolean;
  discardDraft: () => void;
  resumeDraft: () => void;
  navigate: (href: string) => void;
}
const EditorContext = createContext<Navigation | null>(null);

export function EditorNavigation({ children }: { children: React.ReactNode }) {
  const { t: copy } = useTranslation("copy");
  const router = useRouter();
  const pathname = usePathname();
  const draft = useRef<EditorDraft | null>(null);
  const dirty = useRef(false);
  const [hasDraft, setHasDraft] = useState(false);
  const discardDraft = useCallback(() => {
    dirty.current = false;
    draft.current = null;
    setHasDraft(false);
  }, []);
  const confirmLeave = useCallback(() => {
    if (dirty.current && !window.confirm(copy("Discard unsaved QR changes?")))
      return false;
    discardDraft();
    return true;
  }, [copy, discardDraft]);
  const updateDraft = useCallback((value: EditorDraft, changed: boolean) => {
    draft.current = value;
    dirty.current = changed;
    setHasDraft(changed);
  }, []);
  const navigate = useCallback(
    (href: string) => {
      if (confirmLeave()) router.push(href);
    },
    [confirmLeave, router],
  );
  const resumeDraft = useCallback(() => {
    const id = draft.current?.editId;
    router.push(id ? "/app?edit=" + encodeURIComponent(id) : "/app");
  }, [router]);

  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !target ||
        target.hasAttribute("download") ||
        target.getAttribute("target") === "_blank"
      )
        return;
      const href = target.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        new URL(href, window.location.href).href === window.location.href
      )
        return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [confirmLeave]);

  return (
    <EditorContext.Provider
      value={{
        draft,
        hasDraft,
        updateDraft,
        confirmLeave,
        discardDraft,
        resumeDraft,
        navigate,
      }}
    >
      {hasDraft && pathname !== "/app" && <DraftNotice />}
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorNavigation() {
  const value = useContext(EditorContext);
  if (!value) throw new Error("EditorNavigation provider is required");
  return value;
}

export function DraftNotice() {
  const { t: copy } = useTranslation("copy");
  const { resumeDraft, discardDraft } = useEditorNavigation();
  return (
    <section
      role="alert"
      className="border-b border-border bg-muted px-6 py-4 flex flex-wrap items-center justify-center gap-3 text-sm"
    >
      <p>
        {copy(
          "Your unsaved QR draft is preserved. Return to continue or discard it.",
        )}
      </p>
      <Button size="sm" onClick={resumeDraft}>
        {copy("Return to draft")}
      </Button>
      <Button size="sm" variant="outline" onClick={discardDraft}>
        {copy("Discard draft")}
      </Button>
    </section>
  );
}
