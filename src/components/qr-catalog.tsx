import type { DotType, CornerSquareType, CornerDotType } from "qr-code-styling";
import type { QRDesign } from "@/lib/qr-design";
import { defaultDesign } from "@/lib/qr-design";
import {
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Phone,
  Mail,
  Share2,
} from "lucide-react";
interface TemplateConfig {
  id: number;
  name: string;
  dotsOptions: {
    color?: string;
    type: DotType;
    gradient?: {
      type: "linear" | "radial";
      rotation?: number;
      colorStops: { offset: number; color: string }[];
    };
  };
  cornersSquareOptions?: {
    color?: string;
    type?: CornerSquareType;
    gradient?: {
      type: "linear" | "radial";
      rotation?: number;
      colorStops: { offset: number; color: string }[];
    };
  };
  cornersDotOptions?: {
    color?: string;
    type?: CornerDotType;
    gradient?: {
      type: "linear" | "radial";
      rotation?: number;
      colorStops: { offset: number; color: string }[];
    };
  };
  backgroundOptions?: {
    color: string;
    gradient?: {
      type: "linear" | "radial";
      rotation?: number;
      colorStops: { offset: number; color: string }[];
    };
  };
  imageOptions?: {
    hideBackgroundDots: boolean;
    imageSize: number;
    margin: number;
  };
  // Frame/Footer simulation (rendered outside the QR canvas in some cases, or we can try to use text options if supported, but usually external is better)
  frame?: {
    text?: string;
    style?: "black" | "blue" | "red" | "none";
  };
  containerClassName?: string;
}

const templates: TemplateConfig[] = [
  // 1. Basic Black/White
  {
    id: 1,
    name: "Classic",
    dotsOptions: { type: "square", color: "#000000" },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "square", color: "#000000" },
    cornersDotOptions: { type: "square", color: "#000000" },
  },
  // 2. Black/Red with SCAN ME (Simulated frame)
  {
    id: 2,
    name: "Scan Me Red",
    dotsOptions: { type: "square", color: "#000000" },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "extra-rounded", color: "#FF0000" },
    cornersDotOptions: { type: "dot", color: "#FF0000" },
    frame: { text: "SCAN ME", style: "black" },
  },
  // 3. Instagram Style (Purple/Pink Gradient)
  {
    id: 3,
    name: "Social",
    dotsOptions: {
      type: "dots",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#405DE6" },
          { offset: 1, color: "#C13584" },
        ],
      },
    },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "extra-rounded", color: "#405DE6" }, // Approximation, gradient not supported on single color prop in simpler config sometimes, but checking types
    cornersDotOptions: { type: "dot", color: "#C13584" },
  },
  // 4. Blue Circles
  {
    id: 4,
    name: "Blue Circles",
    dotsOptions: { type: "rounded", color: "#4B7CB0" },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "extra-rounded", color: "#4B7CB0" },
    cornersDotOptions: { type: "dot", color: "#4B7CB0" },
  },
  // 5. Green Nature
  {
    id: 5,
    name: "Eco",
    dotsOptions: {
      type: "dots",
      color: "#4CAF50",
    },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "dot", color: "#43A047" },
    cornersDotOptions: { type: "dot", color: "#2E7D32" },
    containerClassName:
      "rounded-full overflow-hidden border-4 border-[#4CAF50]",
  },
  // 6. Navy Blue with Footer
  {
    id: 6,
    name: "Corporate",
    dotsOptions: { type: "rounded", color: "#1E3A8A" }, // tailwind blue-900
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "dot", color: "#1E3A8A" },
    cornersDotOptions: { type: "dot", color: "#1E3A8A" },
    containerClassName:
      "rounded-full overflow-hidden border-4 border-[#1E3A8A]",
  },
  // 7. Lime/Purple
  {
    id: 7,
    name: "Vibrant",
    dotsOptions: { type: "classy", color: "#5F2EEA" },
    backgroundOptions: { color: "#CCF381" },
    cornersSquareOptions: { type: "extra-rounded", color: "#5F2EEA" },
    cornersDotOptions: { type: "dot", color: "#5F2EEA" },
  },
  // 8. Orange/Black
  {
    id: 8,
    name: "Abstract",
    dotsOptions: { type: "classy-rounded", color: "#000000" },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "extra-rounded", color: "#F97316" }, // orange-500
    cornersDotOptions: { type: "dot", color: "#F97316" },
  },
  // 9. Red Corners Download
  {
    id: 9,
    name: "Download",
    dotsOptions: { type: "square", color: "#000000" },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { type: "square", color: "#DC2626" }, // red-600
    cornersDotOptions: { type: "square", color: "#DC2626" },
    frame: { text: "SCAN TO DOWNLOAD", style: "black" },
  },
  // 10. Gold/Black Luxury
  {
    id: 10,
    name: "Prestige",
    dotsOptions: { type: "square", color: "#D4AF37" }, // Gold
    backgroundOptions: { color: "#000000" },
    cornersSquareOptions: { type: "extra-rounded", color: "#ffffff" },
    cornersDotOptions: { type: "dot", color: "#D4AF37" },
  },
];

type LogoItem = {
  id: string;
  icon?: React.ComponentType<import("lucide-react").LucideProps>;
  label: string;
  color?: string;
  svg?: string; // For custom SVG logos
};

export const logos: LogoItem[] = [
  // Row 1
  {
    id: "openai",
    label: "OpenAI",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>`,
    color: "#000000",
  },
  { id: "facebook", icon: Facebook, label: "Facebook", color: "#1877F2" },
  {
    id: "twitter",
    label: "X",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    color: "#000000",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
    color: "#25D366",
  },
  { id: "linkedin", icon: Linkedin, label: "LinkedIn", color: "#0A66C2" },
  { id: "instagram", icon: Instagram, label: "Instagram", color: "#E4405F" },
  {
    id: "appstore",
    label: "App Store",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.8 14.4l-3.5 6h2.3l.9-1.6h2.7l-1.3-2.3-1.1 2h-.6l.9-1.7-1.3-2.4zm6.8-6L12 14.6l-1.3-2.3-2.3 4.1 1.3 2.3 1-1.8 1 1.8h2.6L12 14.6l2.3-4.1h2.6l-3.5-6h-2.3l1.3 2.3 1.2-2.3zm-7.4 0l-3.5 6h2.6l3.5-6H8.2zm13.3 6l-3.5-6h-2.3l3.5 6h2.3z"/></svg>`,
    color: "#007AFF",
  },
  {
    id: "googleplay",
    label: "Google Play",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5.31 0 .6.1.85.26l13.87 8.5c.5.31.78.85.78 1.24s-.28.93-.78 1.24l-13.87 8.5c-.25.16-.54.26-.85.26-.83 0-1.5-.67-1.5-1.5zm2-.5l10-6.5L5 7v13zm10-6.5L5 7l10 6.5z"/></svg>`,
    color: "#34A853",
  },
  {
    id: "calendar",
    label: "Calendar",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>`,
    color: "#EA4335",
  },
  {
    id: "slack",
    label: "Slack",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>`,
    color: "#4A154B",
  },
  {
    id: "xcode",
    label: "Xcode",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 3a7 7 0 100 14 7 7 0 000-14z"/></svg>`,
    color: "#FF6B35",
  },
  { id: "youtube", icon: Youtube, label: "YouTube", color: "#FF0000" },
  {
    id: "pinterest",
    label: "Pinterest",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>`,
    color: "#E60023",
  },
  // Row 2
  {
    id: "bitbucket",
    label: "Bitbucket",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.778 1.211a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z"/></svg>`,
    color: "#0052CC",
  },
  {
    id: "cashapp",
    label: "Cash App",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.59 3.47A5.1 5.1 0 0020.55.33a24.68 24.68 0 00-4.87-.33c-2.74 0-5.27.17-5.27.17a24.68 24.68 0 00-4.87.33A5.1 5.1 0 002.5 3.47a24.68 24.68 0 00-.33 4.87c0 2.74.17 5.28.17 5.28a24.68 24.68 0 00.33 4.87 5.1 5.1 0 003.04 3.14c1.56.44 4.87.33 4.87.33s3.31.11 4.87-.33a5.1 5.1 0 003.04-3.14c.44-1.56.33-4.87.33-4.87s.11-3.31-.33-4.87zm-6.94 6.79c-.17.38-.42.72-.72 1.01-.3.29-.65.52-1.05.69-.4.17-.83.28-1.28.33v1.22h-1.5v-1.22a5.28 5.28 0 01-2.28-.83l.62-1.3c.56.36 1.2.59 1.87.68v-2.04a4.75 4.75 0 01-1.05-.4 2.43 2.43 0 01-.72-.56 2.08 2.08 0 01-.43-.72 2.8 2.8 0 01-.14-.92c0-.4.07-.75.21-1.07.14-.32.35-.6.61-.83.26-.23.57-.41.93-.54a3.8 3.8 0 011.17-.22V5.37h1.5v1.09c.63.08 1.23.27 1.78.56l-.5 1.34a4.19 4.19 0 00-1.57-.46v1.93c.45.12.84.27 1.17.43.33.16.61.35.82.57.21.22.37.47.47.75.1.28.16.6.16.95a2.81 2.81 0 01-.21 1.12zm-2.19-.26c.22-.09.4-.22.54-.38a1.1 1.1 0 00.29-.73c0-.28-.1-.5-.29-.68-.19-.18-.47-.33-.84-.46v2.37a1.79 1.79 0 01-.5.22zm-2.46-4.26c0 .24.09.44.26.6.17.16.43.3.78.41V5.5a1.4 1.4 0 00-.76.26.87.87 0 00-.28.67z"/></svg>`,
    color: "#00D632",
  },
  {
    id: "paypal",
    label: "PayPal",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.72a.778.778 0 01.768-.654h6.399c2.077 0 3.527.373 4.399 1.32.87.946 1.06 2.24.58 4.134l-.02.086c-.476 2.482-1.582 4.01-3.138 4.785-1.406.701-3.28.849-5.085.849H7.01a.78.78 0 00-.769.654l-.97 5.39a.64.64 0 01-.634.654l-.56-.001zm12.22-14.53c-.276 1.79-.792 3.011-1.63 3.853-.955.957-2.472 1.425-4.51 1.425h-1.5l-1.16 7.313h1.78c.345 0 .639-.252.692-.593l.03-.151.545-3.448.035-.191a.703.703 0 01.692-.593h.436c2.822 0 5.032-.877 5.94-3.417.38-1.062.488-1.943.344-2.649a2.265 2.265 0 00-.694-1.549z"/></svg>`,
    color: "#003087",
  },
  {
    id: "venmo",
    label: "Venmo",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.616 1.36c.796 1.313 1.153 2.666 1.153 4.378 0 5.453-4.656 12.534-8.433 17.502H5.122L2.122 2.05l6.558-.61 1.755 14.094c1.635-2.665 3.667-6.85 3.667-9.71 0-1.633-.278-2.747-.716-3.634z"/></svg>`,
    color: "#008CFF",
  },
  {
    id: "figma",
    label: "Figma",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zM8.148 24c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.588 4.539zm-.029-7.51a3.023 3.023 0 00-3.019 3.019 3.023 3.023 0 003.019 3.019c1.678 0 3.057-1.344 3.057-3.019v-3.019H8.119zM8.148 8.981c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981H8.148zm-.029-7.51a3.023 3.023 0 00-3.019 3.019 3.023 3.023 0 003.019 3.019h3.117V1.471H8.119zM15.852 24c-2.476 0-4.49-2.014-4.49-4.49v-4.49h4.49c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm0-7.51h-3.019v3.019a3.023 3.023 0 003.019 3.019 3.023 3.023 0 003.019-3.019 3.023 3.023 0 00-3.019-3.019zM8.148 15.02c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98H8.148zm-.029-7.51a3.023 3.023 0 00-3.019 3.019 3.023 3.023 0 003.019 3.019h3.117V7.51H8.119z"/></svg>`,
    color: "#F24E1E",
  },
  {
    id: "yourlogo1",
    label: "Your Logo",
    svg: `<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="4" fill="#E5E7EB"/><text x="20" y="16" text-anchor="middle" font-size="6" fill="#6B7280">YOUR</text><text x="20" y="26" text-anchor="middle" font-size="6" fill="#6B7280">LOGO</text></svg>`,
    color: "#6B7280",
  },
  {
    id: "yourlogo2",
    label: "Your Logo",
    svg: `<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="4" fill="#D4A574"/><text x="20" y="16" text-anchor="middle" font-size="6" fill="#FFFFFF">YOUR</text><text x="20" y="26" text-anchor="middle" font-size="6" fill="#FFFFFF">LOGO</text></svg>`,
    color: "#D4A574",
  },
  {
    id: "trello",
    label: "Trello",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.656 1.343 3 3 3h18c1.656 0 3-1.344 3-3V3c0-1.657-1.344-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .794-.645 1.44-1.44 1.44H15c-.795 0-1.44-.646-1.44-1.44V4.56c0-.795.646-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z"/></svg>`,
    color: "#0052CC",
  },
  {
    id: "scanme",
    label: "Scan Me",
    svg: `<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="4" fill="#1F2937"/><text x="20" y="16" text-anchor="middle" font-size="6" fill="#FFFFFF" font-weight="bold">SCAN</text><text x="20" y="26" text-anchor="middle" font-size="6" fill="#FFFFFF" font-weight="bold">ME</text></svg>`,
    color: "#1F2937",
  },
  {
    id: "globe",
    label: "Website",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    color: "#6B7280",
  },
  { id: "phone", icon: Phone, label: "Phone", color: "#000000" },
  { id: "email", icon: Mail, label: "Email", color: "#000000" },
  // Row 3
  { id: "share", icon: Share2, label: "Share", color: "#000000" },
];

export const templatesWithDesign = templates.map((template) => ({
  id: template.id,
  name: template.name,
  design: {
    ...defaultDesign,
    templateId: template.id,
    dotsOptions: { ...defaultDesign.dotsOptions, ...template.dotsOptions },
    cornersSquareOptions: {
      ...defaultDesign.cornersSquareOptions,
      ...template.cornersSquareOptions,
    },
    cornersDotOptions: {
      ...defaultDesign.cornersDotOptions,
      ...template.cornersDotOptions,
    },
    backgroundOptions: {
      ...defaultDesign.backgroundOptions,
      ...template.backgroundOptions,
    },
    frame: template.containerClassName
      ? { style: template.id === 5 ? "circle-green" : "circle-navy", text: "" }
      : {
          style: template.frame?.style || "none",
          text: template.frame?.text || "",
        },
  } as QRDesign,
}));
