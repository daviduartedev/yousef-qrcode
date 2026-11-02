import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
const defaultProfileImg = '/assets/bg-girl.png'; // Certifique-se que o caminho está correto
import {
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  Send,
  Youtube,
  Camera,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Globe
} from "lucide-react";

// Card design templates
const cardTemplates = [
  {
    id: 1,
    name: "Classic Left",
    layout: "classic-left",
    primaryColor: "#F59E0B",
    accentColor: "#FFFFFF",
    buttonColor: "#EA580C"
  },
  {
    id: 2,
    name: "Left Accent",
    layout: "left-accent",
    primaryColor: "#2563EB",
    accentColor: "#FFFFFF",
    buttonColor: "#EA580C"
  },
  {
    id: 3,
    name: "Center Focus",
    layout: "center-focus",
    primaryColor: "#DC2626",
    accentColor: "#FFFFFF",
    buttonColor: "#2563EB"
  },
  {
    id: 4,
    name: "Minimal Right",
    layout: "minimal-right",
    primaryColor: "#7C3AED",
    accentColor: "#FFFFFF",
    buttonColor: "#2563EB"
  },
  {
    id: 5,
    name: "Split Blue",
    layout: "split-blue",
    primaryColor: "#3B82F6",
    accentColor: "#FFFFFF",
    buttonColor: "#3B82F6"
  },
];

// Social links options
const socialOptions = [
  { id: "linkedin", icon: Linkedin, label: "LinkedIn", color: "#0A66C2" },
  { id: "facebook", icon: Facebook, label: "Facebook", color: "#1877F2" },
  { id: "instagram", icon: Instagram, label: "Instagram", color: "#E4405F" },
  { id: "twitter", icon: Twitter, label: "X (Twitter)", color: "#000000" },
  { id: "tiktok", icon: MessageCircle, label: "TikTok", color: "#000000" },
  { id: "whatsapp", icon: MessageCircle, label: "WhatsApp", color: "#25D366" },
  { id: "telegram", icon: Send, label: "Telegram", color: "#0088CC" },
  { id: "youtube", icon: Youtube, label: "YouTube", color: "#FF0000" },
  { id: "pinterest", icon: MessageCircle, label: "Pinterest", color: "#E60023" },
];

interface ContactData {
  firstName: string;
  lastName: string;
  designation: string;
  company: string;
  summary: string;
  website: string;
  phone: string;
  email: string;
  photo: string | null;
}

interface SocialLink {
  platform: string;
  url: string;
}

const ContactCardEditor = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [primaryColor, setPrimaryColor] = useState("#FF9900");
  const [secondaryTextColor, setSecondaryTextColor] = useState("#16212F");
  const [profileTextColor, setProfileTextColor] = useState("#000000");
  const [updateLater, setUpdateLater] = useState(false);
  const [trackAnalytics, setTrackAnalytics] = useState(false);
  const [addToWallet, setAddToWallet] = useState(false);
  const [selectedSocial, setSelectedSocial] = useState<string | null>("linkedin");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
    { platform: "linkedin", url: "www.linkedin.com/ashleyjf" }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templatesScrollRef = useRef<HTMLDivElement>(null);

  const [contactData, setContactData] = useState<ContactData>({
    firstName: "Dr. Ashley",
    lastName: "James Fletcher",
    designation: "CXO, Founding Designer",
    company: "Schoen & Co.",
    summary: "I lead design across teams for Schoen & Co. and it's subsidiaries",
    website: "ashley@schoenco.com",
    phone: "(406) 555-0120",
    email: "ashley@schoenco.com",
    photo: defaultProfileImg
  });

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setContactData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateContactField = (field: keyof ContactData, value: string) => {
    setContactData(prev => ({ ...prev, [field]: value }));
  };

  const scrollTemplates = (direction: 'left' | 'right') => {
    if (templatesScrollRef.current) {
      const scrollAmount = 150;
      const currentScroll = templatesScrollRef.current.scrollLeft;
      const newScroll = direction === 'left'
        ? currentScroll - scrollAmount
        : currentScroll + scrollAmount;

      templatesScrollRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  const currentTemplate = cardTemplates.find(t => t.id === selectedTemplate) || cardTemplates[0];

  const updateSocialLink = (url: string) => {
    if (selectedSocial) {
      setSocialLinks(prev => {
        const existing = prev.find(s => s.platform === selectedSocial);
        if (existing) {
          return prev.map(s => s.platform === selectedSocial ? { ...s, url } : s);
        }
        return [...prev, { platform: selectedSocial, url }];
      });
    }
  };

  const getSocialLinkUrl = () => {
    const link = socialLinks.find(s => s.platform === selectedSocial);
    return link?.url || "";
  };

  return (
    <div className="grid md:grid-cols-[1fr,320px] gap-8">
      {/* Left Column - Editor */}
      <div className="space-y-6">
        {/* Select Design */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Select a Design</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTemplates('left')}
              className="p-1 hover:bg-muted rounded flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div
              ref={templatesScrollRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide flex-1 py-2"
            >
              {cardTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`border-2 rounded-lg p-2 cursor-pointer transition-all flex-shrink-0 ${
                    selectedTemplate === template.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {/* Mini preview card - Different layouts */}
                  <div
                    className="w-20 h-28 rounded overflow-hidden relative bg-white"
                  >
                    {template.layout === "classic-left" && (
                      <>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: template.primaryColor }} />
                        <div className="p-2 pt-3">
                          <div className="w-7 h-7 rounded bg-gray-200 mb-2" />
                          <div className="w-12 h-1.5 bg-gray-800 rounded mb-1" />
                          <div className="w-10 h-1 bg-gray-400 rounded mb-1" />
                          <div className="w-8 h-1 bg-gray-300 rounded" />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 h-3 rounded" style={{ backgroundColor: template.buttonColor }} />
                      </>
                    )}
                    {template.layout === "left-accent" && (
                      <>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: template.primaryColor }} />
                        <div className="absolute right-2 top-3 w-10 h-10 rounded bg-gray-200" />
                        <div className="p-2 pt-4">
                          <div className="w-10 h-1.5 rounded mb-1" style={{ color: '#7C3AED' }}>
                            <div className="w-full h-full bg-purple-600 rounded" />
                          </div>
                          <div className="w-8 h-1 bg-gray-400 rounded mb-3" />
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: template.primaryColor }} />
                            <div className="w-8 h-1 bg-gray-400 rounded" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 h-3 rounded" style={{ backgroundColor: template.buttonColor }} />
                      </>
                    )}
                    {template.layout === "center-focus" && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-6" style={{ backgroundColor: template.primaryColor }} />
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gray-200 border-2 border-white" />
                        <div className="pt-14 px-2 text-center">
                          <div className="w-12 h-1.5 bg-gray-800 rounded mx-auto mb-1" />
                          <div className="w-10 h-1 bg-gray-400 rounded mx-auto" />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 h-3 rounded" style={{ backgroundColor: template.buttonColor }} />
                      </>
                    )}
                    {template.layout === "minimal-right" && (
                      <>
                        {/* Purple curved header */}
                        <div className="absolute top-0 left-0 right-0">
                          <svg viewBox="0 0 80 24" className="w-full">
                            <path d="M0 0 L80 0 L80 16 Q40 28 0 16 Z" fill={template.primaryColor} />
                          </svg>
                        </div>
                        {/* Circular photo */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gray-200 border-2 border-white" />
                        <div className="pt-14 px-2 text-center">
                          <div className="w-12 h-1.5 bg-gray-800 rounded mx-auto mb-1" />
                          <div className="w-10 h-1 bg-gray-400 rounded mx-auto mb-1" />
                          <div className="w-8 h-0.5 bg-amber-500 rounded mx-auto mt-2" />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 h-3 rounded" style={{ backgroundColor: template.buttonColor }} />
                      </>
                    )}
                    {template.layout === "split-blue" && (
                      <>
                        {/* Blue header taking about 40% of card */}
                        <div className="absolute top-0 left-0 right-0 h-12" style={{ backgroundColor: template.primaryColor }} />
                        {/* Centered photo at bottom of blue section */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-8 rounded-sm bg-gray-200 border-2 border-white shadow-sm" />
                        <div className="pt-[52px] px-2 text-center">
                          <div className="w-12 h-1.5 bg-gray-800 rounded mx-auto mb-1" />
                          <div className="w-10 h-1 bg-gray-400 rounded mx-auto mb-0.5" />
                          <div className="w-8 h-1 bg-gray-400 rounded mx-auto mb-1" />
                          <div className="w-10 h-0.5 rounded mx-auto" style={{ color: template.primaryColor }}>
                            <div className="w-full h-full bg-blue-500 rounded" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 h-3 rounded" style={{ backgroundColor: template.buttonColor }} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => scrollTemplates('right')}
              className="p-1 hover:bg-muted rounded flex-shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Primary</label>
            <div className="flex items-center gap-2">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Profile Text</label>
            <div className="flex items-center gap-2">
              <Input
                value={profileTextColor}
                onChange={(e) => setProfileTextColor(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <input
                type="color"
                value={profileTextColor}
                onChange={(e) => setProfileTextColor(e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Secondary Text</label>
            <div className="flex items-center gap-2">
              <Input
                value={secondaryTextColor}
                onChange={(e) => setSecondaryTextColor(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <input
                type="color"
                value={secondaryTextColor}
                onChange={(e) => setSecondaryTextColor(e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="flex flex-col items-center gap-3">
  <div
    onClick={handlePhotoUpload}
    className="w-28 h-28 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors relative overflow-hidden group"
  >
    {/* Renderiza a imagem do estado (que começa com a sua bg-girl) */}
    <img
      src={contactData.photo || undefined}
      alt="Profile"
      className="w-full h-full object-cover transition-opacity group-hover:opacity-80"
    />

    {/* Overlay que aparece no hover para indicar que pode trocar */}
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      <Camera className="w-6 h-6 text-white" />
    </div>

    {/* Ícone fixo no canto inferior */}
    <div className="absolute bottom-1 right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-white shadow-sm">
      <Camera className="w-3.5 h-3.5 text-primary-foreground" />
    </div>
  </div>

  {/* Input invisível que mantém a funcionalidade de troca */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    onChange={handleFileChange}
    className="hidden"
  />

  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
    Clique na imagem para alterar
  </p>
</div>

        {/* Contact Form Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Name</label>
            <Input
              value={contactData.firstName}
              onChange={(e) => updateContactField('firstName', e.target.value)}
              placeholder="First Name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Last Name</label>
            <Input
              value={contactData.lastName}
              onChange={(e) => updateContactField('lastName', e.target.value)}
              placeholder="Last Name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Designation</label>
            <Input
              value={contactData.designation}
              onChange={(e) => updateContactField('designation', e.target.value)}
              placeholder="Job Title"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Company</label>
            <Input
              value={contactData.company}
              onChange={(e) => updateContactField('company', e.target.value)}
              placeholder="Company Name"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Summary</label>
          <Textarea
            value={contactData.summary}
            onChange={(e) => updateContactField('summary', e.target.value)}
            placeholder="Brief description about yourself"
            rows={2}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Website</label>
          <Input
            value={contactData.website}
            onChange={(e) => updateContactField('website', e.target.value)}
            placeholder="your-website.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Phone</label>
            <Input
              value={contactData.phone}
              onChange={(e) => updateContactField('phone', e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
            <Input
              value={contactData.email}
              onChange={(e) => updateContactField('email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-6 pt-2">
          <div className="flex items-center gap-2">
            <Switch checked={updateLater} onCheckedChange={setUpdateLater} />
            <span className="text-sm font-medium">Update later</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={trackAnalytics} onCheckedChange={setTrackAnalytics} />
            <span className="text-sm font-medium">Track analytics & GPS</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={addToWallet} onCheckedChange={setAddToWallet} />
            <span className="text-sm font-medium">Add to Apple/Google Wallet</span>
          </div>
        </div>

        {/* Social Links */}
        <div className="border-t border-border pt-4">
          <label className="text-xs font-medium text-muted-foreground block mb-3">Add Social Links</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {socialOptions.map((social) => {
              const Icon = social.icon;
              const isSelected = selectedSocial === social.id;
              const hasLink = socialLinks.some(s => s.platform === social.id);
              return (
                <button
                  key={social.id}
                  onClick={() => setSelectedSocial(social.id)}
                  className={`p-2.5 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : hasLink
                      ? "border-primary/30 bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className="w-5 h-5" style={{ color: social.color }} />
                </button>
              );
            })}
          </div>

          {selectedSocial && (
            <div className="flex items-center gap-2">
              {(() => {
                const social = socialOptions.find(s => s.id === selectedSocial);
                if (!social) return null;
                const Icon = social.icon;
                return <Icon className="w-5 h-5" style={{ color: social.color }} />;
              })()}
              <Input
                value={getSocialLinkUrl()}
                onChange={(e) => updateSocialLink(e.target.value)}
                placeholder={`Enter your ${socialOptions.find(s => s.id === selectedSocial)?.label} URL`}
                className="flex-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Card Preview */}
      <div className="space-y-4">
        <div
          className="rounded-xl overflow-hidden shadow-lg border border-border bg-white"
        >
          {/* Layout 1: Classic Left - Large photo with wave accent */}
          {currentTemplate.layout === "classic-left" && (
            <div className="relative">
              {/* Large Photo Section */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                {contactData.photo ? (
                  <img
                    src={contactData.photo}
                    alt="Profile"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-4xl font-bold">
                      {contactData.firstName.charAt(0)}{contactData.lastName.charAt(0)}
                    </span>
                  </div>
                )}
                {/* Wave decoration at bottom */}
                <svg
                  className="absolute bottom-0 left-0 right-0 w-full"
                  viewBox="0 0 320 40"
                  fill="none"
                  preserveAspectRatio="none"
                  style={{ height: '40px' }}
                >
                  <path
                    d="M0 40 L0 25 Q40 10 80 20 Q120 30 160 20 Q200 10 240 15 Q280 20 320 10 L320 40 Z"
                    fill="white"
                  />
                  <path
                    d="M0 30 Q40 15 80 25 Q120 35 160 25 Q200 15 240 20 Q280 25 320 15"
                    stroke={primaryColor}
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>

              {/* Content Section */}
              <div className="px-5 pb-5 pt-2">
                {/* Name */}
                <h3 className="text-xl font-bold" style={{ color: profileTextColor }}>
                  {contactData.firstName} {contactData.lastName}
                </h3>

                {/* Designation & Company */}
                <p className="text-sm mt-1" style={{ color: secondaryTextColor }}>
                  {contactData.designation}
                </p>
                <p className="text-sm" style={{ color: secondaryTextColor }}>
                  {contactData.company}
                </p>

                {/* Divider line */}
                <div className="my-4 border-t border-gray-200" />

                {/* Summary */}
                <p className="text-sm" style={{ color: primaryColor }}>
                  {contactData.summary}
                </p>

                {/* Divider line */}
                <div className="my-4 border-t border-gray-200" />

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: profileTextColor }}>
                      {contactData.phone}
                    </p>
                    <p className="text-xs text-gray-400">Work</p>
                  </div>
                </div>

                {/* Add to Contacts Button */}
                <Button
                  className="w-full mt-5 rounded-lg text-white font-medium py-3"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  <span className="mr-2">☰</span> Add to contacts
                </Button>
              </div>
            </div>
          )}

          {/* Layout 2: Left Accent - Red header with photo right */}
          {currentTemplate.layout === "left-accent" && (
            <div className="relative">
              {/* Red Header Section */}
              <div
                className="relative pt-5 pb-12 px-5"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h3 className="text-xl font-bold text-white">
                      {contactData.firstName} {contactData.lastName}
                    </h3>
                    <p className="text-sm text-white/90 mt-1">{contactData.designation}</p>
                    <p className="text-sm text-white/90 mt-2">{contactData.company}</p>
                  </div>
                  {/* Circular Photo */}
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border-4 border-white/30 absolute right-5 bottom-0 translate-y-1/2">
                    {contactData.photo ? (
                      <img src={contactData.photo} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">{contactData.firstName.charAt(0)}{contactData.lastName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="px-5 pt-6 pb-5">
                {/* Summary */}
                <p className="text-sm pr-16" style={{ color: secondaryTextColor }}>
                  {contactData.summary}
                </p>

                {/* Contact Info */}
                <div className="mt-5 space-y-3">
                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>{contactData.phone}</p>
                      <p className="text-xs text-gray-400">Work</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#22C55E' }}
                    >
                      <span className="text-white text-sm">@</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>{contactData.email}</p>
                      <p className="text-xs text-gray-400">Work</p>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#F59E0B' }}
                    >
                      <span className="text-white text-sm">🌐</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>{contactData.website}</p>
                      <p className="text-xs text-gray-400">Website</p>
                    </div>
                  </div>
                </div>

                {/* Connect with me */}
                <div className="mt-5 text-center">
                  <p className="text-sm text-gray-400">Connect with me on</p>
                  <div className="flex justify-center mt-2">
                    <Linkedin className="w-6 h-6" style={{ color: '#0A66C2' }} />
                  </div>
                </div>

                {/* Add to Contacts Button */}
                <Button
                  className="w-full mt-4 rounded-lg text-white font-medium py-3"
                  style={{ backgroundColor: '#3B82F6' }}
                >
                  + Add to Contacts
                </Button>
              </div>
            </div>
          )}

          {/* Layout 3: Center Focus - Red banner top, centered photo */}
          {currentTemplate.layout === "center-focus" && (
            <div className="relative">
              <div className="h-10" style={{ backgroundColor: primaryColor }} />
              <div className="flex justify-center">
                <div className="w-full h-50 overflow-hidden cover-image">
                  {contactData.photo ? (
                    <img src={contactData.photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">{contactData.firstName.charAt(0)}{contactData.lastName.charAt(0)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 text-left">
                <h3 className="text-lg font-bold" style={{ color: profileTextColor }}>
                  {contactData.firstName} {contactData.lastName}
                </h3>
                <p className="text-xs" style={{ color: secondaryTextColor }}>{contactData.designation}</p>
                <p className="text-xs" style={{ color: secondaryTextColor }}>{contactData.company}</p>
                <p className="text-xs mt-3" style={{ color: secondaryTextColor }}>{contactData.summary}</p>
                <div className="mt-4 flex items-left justify-left gap-2 text-sm" style={{ color: primaryColor }}>
                  <Phone className="w-4 h-4" />
                  <span>{contactData.phone}</span>
                </div>
                <p className="text-xs text-gray-400">Work</p>
                <p className="text-xs text-gray-400 mt-3">Saving to phone/camera roll</p>
                <Button className="w-full mt-2 rounded-lg text-white" style={{ backgroundColor: currentTemplate.buttonColor }}>
                  + Add to Contacts
                </Button>
              </div>
            </div>
          )}

          {/* Layout 4: Minimal Right - Purple curved header with centered photo */}
          {currentTemplate.layout === "minimal-right" && (
            <div className="relative bg-white">
              {/* Purple curved header */}
              <div className="relative">
                <svg viewBox="0 0 320 80" className="w-full" preserveAspectRatio="none" style={{ height: '80px' }}>
                  <path d="M0 0 L320 0 L320 50 Q160 90 0 50 Z" fill={primaryColor} />
                </svg>

                {/* Centered circular photo overlapping the curve */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                    {contactData.photo ? (
                      <img src={contactData.photo} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-300 to-purple-400 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">{contactData.firstName.charAt(0)}{contactData.lastName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="px-5 pb-5 pt-14 text-center">
                {/* Name */}
                <h3 className="text-xl font-bold" style={{ color: profileTextColor }}>
                  {contactData.firstName} {contactData.lastName}
                </h3>

                {/* Designation & Company */}
                <p className="text-sm text-gray-500 mt-1">
                  {contactData.designation}
                </p>
                <p className="text-sm text-gray-500">
                  {contactData.company}
                </p>

                {/* Summary in amber/orange color */}
                <p className="text-sm mt-4" style={{ color: '#D97706' }}>
                  {contactData.summary}
                </p>

                {/* Contact Info */}
                <div className="mt-5 space-y-3 text-left">
                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>
                        {contactData.phone}
                      </p>
                      <p className="text-xs" style={{ color: primaryColor }}>Work</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>
                        {contactData.email}
                      </p>
                      <p className="text-xs" style={{ color: primaryColor }}>Work</p>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>
                        {contactData.website}
                      </p>
                      <p className="text-xs" style={{ color: primaryColor }}>Website</p>
                    </div>
                  </div>
                </div>

                {/* Connect with me on */}
                <div className="mt-5 text-center">
                  <p className="text-sm text-gray-500 mb-2">Connect with me on</p>
                  <div className="flex justify-center">
                    <Linkedin className="w-6 h-6" style={{ color: '#0A66C2' }} />
                  </div>
                </div>

                {/* Add to Contacts Button */}
                <Button
                  className="w-full mt-4 rounded-lg text-white font-medium py-3 flex items-center justify-center gap-2"
                  style={{ backgroundColor: currentTemplate.buttonColor }}
                >
                  <span className="text-lg">⇄</span> Add to contacts
                </Button>
              </div>
            </div>
          )}

          {/* Layout 5: Split Blue - Blue header with centered photo */}
          {currentTemplate.layout === "split-blue" && (
            <div className="relative bg-white">
              {/* Blue header section taking about 40% */}
              <div
                className="h-32"
                style={{ backgroundColor: primaryColor }}
              />

              {/* Centered photo with white border, overlapping header */}
              <div className="flex justify-center -mt-12">
                <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                  {contactData.photo ? (
                    <img src={contactData.photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-300 to-blue-400 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">{contactData.firstName.charAt(0)}{contactData.lastName.charAt(0)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className="px-5 pb-5 pt-4 text-center">
                {/* Name */}
                <h3 className="text-xl font-bold" style={{ color: profileTextColor }}>
                  {contactData.firstName} {contactData.lastName}
                </h3>

                {/* Designation & Company */}
                <p className="text-sm text-gray-500 mt-1">
                  {contactData.designation}
                </p>
                <p className="text-sm text-gray-500">
                  {contactData.company}
                </p>

                {/* Summary in blue color */}
                <p className="text-sm mt-4" style={{ color: primaryColor }}>
                  {contactData.summary}
                </p>

                {/* Contact Info */}
                <div className="mt-5 space-y-3 text-left">
                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#22C55E' }}
                    >
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>
                        {contactData.phone}
                      </p>
                      <p className="text-xs text-gray-400">Work</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#22C55E' }}
                    >
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>
                        {contactData.email}
                      </p>
                      <p className="text-xs text-gray-400">Work</p>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#22C55E' }}
                    >
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: profileTextColor }}>
                        {contactData.website}
                      </p>
                      <p className="text-xs text-gray-400">Website</p>
                    </div>
                  </div>
                </div>

                {/* Connect with me on */}
                <div className="mt-5 text-center">
                  <p className="text-sm text-gray-400 mb-2">Connect with me on</p>
                  <div className="flex justify-center">
                    <Linkedin className="w-6 h-6" style={{ color: '#0A66C2' }} />
                  </div>
                </div>

                {/* Add to Contacts Button */}
                <Button
                  className="w-full mt-4 rounded-lg text-white font-medium py-3 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-lg">⇄</span> Add to contacts
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sign up section */}
        <Input
          placeholder="Enter your email address"
          type="email"
          className="w-full"
        />
        <Button size="lg" className="w-full">
          Sign up to save
        </Button>
        <p className="text-xs text-muted-foreground text-center">No credit card required</p>
      </div>
    </div>
  );
};

export default ContactCardEditor;
