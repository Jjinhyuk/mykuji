"use client";

import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface HeaderProps {
  user: User;
  profile: Profile | null;
}

export function Header({ user, profile }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName = profile?.display_name || user.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatar_url || "";

  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/seller">
              <h1 className="text-xl font-bold text-indigo-400">Mykuzi</h1>
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/seller">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  대시보드
                </Button>
              </Link>
              <Link href="/seller/boards/new">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  새 보드
                </Button>
              </Link>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-indigo-600">
                    {displayName[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-gray-300 hidden sm:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-gray-400 text-sm">
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {profile?.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">관리자</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
