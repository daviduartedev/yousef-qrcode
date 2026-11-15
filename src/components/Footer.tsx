'use client';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

// Only destinations that exist. Company, legal and social pages need owner-approved content before they are linked.
const footerLinks = [
  { title: 'Product', links: [
    { href: '/#features', label: 'Dynamic QR Codes' },
    { href: '/#analytics', label: 'Analytics' },
    { href: '/#integrations', label: 'Integrations' },
    { href: '/#pricing', label: 'Pricing' },
  ] },
  { title: 'Solutions', links: [
    { href: '/#industries', label: 'Industries' },
    { href: '/#security', label: 'Security' },
    { href: '/#faq', label: 'FAQ' },
  ] },
  { title: 'Account', links: [
    { href: '/auth?mode=signup', label: 'Create account' },
    { href: '/auth', label: 'Login' },
    { href: '/auth/forgot-password', label: 'Reset password' },
  ] },
];

export const Footer = () => {
  const { t: copy } = useTranslation('copy');
  return (
    <footer className="bg-foreground text-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <p className="text-xl font-bold mb-4">QRConnect</p>
            <p className="text-background/70 text-sm">
              {copy('Modern QR Code and Digital Business Card platform for forward-thinking teams.')}
            </p>
          </div>
          {footerLinks.map((group) => (
            <nav key={group.title} aria-label={copy(group.title)}>
              <h2 className="font-semibold mb-4 text-sm">{copy(group.title)}</h2>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith('/#')
                      ? <a href={link.href} className="text-background/70 text-sm hover:text-background transition-colors">{copy(link.label)}</a>
                      : <Link href={link.href} className="text-background/70 text-sm hover:text-background transition-colors">{copy(link.label)}</Link>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-background/10 pt-8 text-center">
          <p className="text-background/70 text-sm">{copy('© 2026 QRConnect. All rights reserved.')}</p>
        </div>
      </div>
    </footer>
  );
};
