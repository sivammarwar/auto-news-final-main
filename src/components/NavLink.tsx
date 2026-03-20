'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
  [key: string]: any;
}

export function NavLink({ href, className, activeClassName, children, ...props }: NavLinkProps) {
  const pathname = usePathname();

  // Also mark as active for subcategory pages when on /category/history
  // e.g. /category/ancient-civilizations should highlight the History nav link
  const isActive =
    pathname === href ||
    (href === '/category/history' && pathname.startsWith('/category/'));

  return (
    <Link href={href} className={cn(className, isActive && activeClassName)} {...props}>
      {children}
    </Link>
  );
}