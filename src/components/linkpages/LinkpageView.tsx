import { Facebook, Github, Globe, Instagram, Linkedin, Mail, MessageCircle, Music2, Phone, Send, Twitter, Youtube } from 'lucide-react';
import type { LinkpageBlock, LinkpageContent } from '@/lib/linkpages';

const socialIcons = {
  instagram: Instagram, facebook: Facebook, x: Twitter, linkedin: Linkedin, youtube: Youtube, tiktok: Music2,
  whatsapp: MessageCircle, telegram: Send, github: Github, website: Globe,
} as const;
const socialNames = {
  instagram: 'Instagram', facebook: 'Facebook', x: 'X', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok',
  whatsapp: 'WhatsApp', telegram: 'Telegram', github: 'GitHub', website: 'Website',
} as const;

type Props = {
  content: LinkpageContent;
  /** Click address for a block, or null in the editor preview where links stay inert. */
  href: (block: LinkpageBlock) => string | null;
  media: (assetId: string) => string | null;
  className?: string;
};

/** Renders a Linkpage. Used by the public page (server) and the editor preview (client); it has no hooks. */
export function LinkpageView({ content, href, media, className = '' }: Props) {
  const { profile, theme, blocks } = content;
  const radius = theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '4px' : '12px';
  const outline = theme.buttonStyle === 'outline';
  const buttonStyle = {
    borderRadius: radius,
    background: outline ? 'transparent' : theme.button,
    color: outline ? theme.button : theme.buttonText,
    border: `2px solid ${theme.button}`,
  };
  const avatar = profile.avatarAssetId ? media(profile.avatarAssetId) : null;
  const cover = profile.coverAssetId ? media(profile.coverAssetId) : null;
  const socials = blocks.filter((block): block is Extract<LinkpageBlock, { type: 'social' }> => block.type === 'social');
  const body = blocks.filter(block => block.type !== 'social');
  const action = (block: LinkpageBlock, children: React.ReactNode, style: React.CSSProperties, label?: string) => {
    const target = href(block);
    const classes = 'flex min-h-12 w-full items-center justify-center gap-2 px-4 py-3 text-center font-medium transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
    return target
      ? <a href={target} className={classes} style={style} aria-label={label} rel="noopener noreferrer nofollow" data-block-id={block.id}>{children}</a>
      : <span className={classes} style={style} aria-label={label}>{children}</span>;
  };

  return (
    <div className={`min-h-full w-full ${className}`} style={{ background: theme.background, color: theme.text }}>
      {cover && <div className="h-36 w-full overflow-hidden sm:h-44">
        <img src={cover} alt="" className="h-full w-full object-cover" />
      </div>}
      <div className={`mx-auto flex w-full max-w-md flex-col items-center gap-4 px-5 pb-10 ${cover ? '-mt-12' : 'pt-10'}`}>
        {avatar && (
          <img src={avatar} alt="" className="size-24 rounded-full border-4 object-cover" style={{ borderColor: theme.background }} />
        )}
        {profile.name && <h1 className="text-center text-2xl font-bold" dir="auto">{profile.name}</h1>}
        {profile.bio && <p className="whitespace-pre-line text-center text-sm opacity-80" dir="auto">{profile.bio}</p>}
        {socials.length > 0 && <ul className="flex flex-wrap justify-center gap-2" aria-label="Social profiles">
          {socials.map(block => {
            const Icon = socialIcons[block.network];
            return <li key={block.id}>{action(block, <Icon className="size-5" aria-hidden="true" />,
              { ...buttonStyle, borderRadius: '9999px', width: '3rem', minHeight: '3rem', padding: 0 }, socialNames[block.network])}</li>;
          })}
        </ul>}
        <ul className="flex w-full flex-col gap-3">
          {body.map(block => <li key={block.id}>
            {block.type === 'separator' ? <hr className="my-2 border-current opacity-20" />
              : block.type === 'text' ? <p className="whitespace-pre-line text-center text-sm" dir="auto">{block.text}</p>
              : action(block, <>
                  {block.type === 'phone' && <Phone className="size-4 shrink-0" aria-hidden="true" />}
                  {block.type === 'email' && <Mail className="size-4 shrink-0" aria-hidden="true" />}
                  <span dir="auto">{block.label}</span>
                </>, buttonStyle)}
          </li>)}
        </ul>
      </div>
    </div>
  );
}
