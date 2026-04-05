'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, List, Download, Settings } from 'lucide-react';

const items = [
  { href: '/', label: 'Hem', Icon: Home },
  { href: '/trips', label: 'Resor', Icon: List },
  { href: '/export', label: 'Exportera', Icon: Download },
  { href: '/settings', label: 'Inställningar', Icon: Settings },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="mx-auto max-w-lg flex">
        {items.map(({ href, label, Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
