"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, LogOut, Settings, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/app/api/services/supabase/auth";
import { useRouter } from "next/navigation";

interface DashboardNavbarProps {
  userEmail?: string;
}

export function DashboardNavbar({ userEmail }: DashboardNavbarProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (email?: string) => {
    if (!email) return "U";
    return email[0].toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-zinc-200 z-30">
      <div className="h-full flex items-center justify-between px-6">
        {/* Left: Logo */}
        <div className="flex px-4 py-2">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logos/logo-black.svg"
              alt="AICyber Studio"
              width={120}
              height={32}
              className="h-7 w-auto"
            />
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-zinc-700 hover:bg-zinc-100 gap-1 h-8 px-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm">English</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem>Spanish</DropdownMenuItem>
              <DropdownMenuItem>French</DropdownMenuItem>
              <DropdownMenuItem>German</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100">
            <Bell className="h-4 w-4 text-zinc-700" />
          </Button>

          {/* Upgrade Button */}
          <Button
            size="sm"
            className="bg-black hover:bg-zinc-800 text-white h-8 px-3 text-sm font-medium"
          >
            Upgrade
            <span className="ml-1.5 bg-amber-400 text-black text-xs px-1.5 py-0.5 rounded font-bold">
              +100
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 hover:bg-zinc-100 h-8"
                disabled={isLoading}
              >
                <Avatar className="h-7 w-7 bg-zinc-900">
                  <AvatarFallback className="bg-zinc-900 text-white text-xs font-medium">
                    {getInitials(userEmail)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2">
                <p className="text-sm font-medium text-zinc-900">{userEmail || "User"}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Free Plan</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isLoading}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoading ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
