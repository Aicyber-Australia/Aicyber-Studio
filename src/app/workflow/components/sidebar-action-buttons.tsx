'use client';

import Link from 'next/link';
import React from 'react';
import {
  CircleUserRound,
  CloudUpload,
  LogOut,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';

interface SidebarActionButtonsProps {
  onCloudUploadClick?: () => void;
  onUserClick?: () => void;
  onLogoutClick?: () => void;
}

export function SidebarActionButtons({
  onCloudUploadClick,
  onUserClick,
  onLogoutClick,
}: SidebarActionButtonsProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-12 shrink-0 px-3" aria-busy="true" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 px-3">
        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          Log in
        </Link>
        <Link
          href="/auth/signup"
          className="inline-flex h-10 items-center rounded-lg bg-sidebar-primary px-3 text-sm font-semibold text-sidebar-primary-foreground shadow-sm hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-2 px-3 justify-end">
      <button
        className="w-12 h-12 bg-transparent hover:bg-gray-100 rounded-xl shadow-sm hover:shadow-md flex items-center justify-center transition-all duration-200"
        onClick={onUserClick}
        title="User Profile"
      >
        <CircleUserRound className="size-5 text-gray-700" />
      </button>

      <button
        className="w-12 h-12 bg-transparent hover:bg-gray-100 rounded-xl shadow-sm hover:shadow-md flex items-center justify-center transition-all duration-200"
        onClick={onCloudUploadClick}
        title="Cloud Upload"
      >
        <CloudUpload className="size-5 text-gray-700" />
      </button>

      <button
        className="w-12 h-12 bg-transparent hover:bg-gray-100 rounded-xl shadow-sm hover:shadow-md flex items-center justify-center transition-all duration-200"
        onClick={onLogoutClick}
        title="Logout"
      >
        <LogOut className="size-5 text-gray-700" />
      </button>
    </div>
  );
}
