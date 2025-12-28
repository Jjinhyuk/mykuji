"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  const supabase = createClient();

  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-indigo-400 mb-2">Mykuzi</h1>
          </Link>
          <CardTitle className="text-white">로그인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleKakaoLogin}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
          >
            카카오로 시작하기
          </Button>
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full border-gray-600 text-white hover:bg-gray-700"
          >
            Google로 시작하기
          </Button>
          <p className="text-center text-sm text-gray-400 mt-4">
            로그인하면{" "}
            <Link href="/terms" className="text-indigo-400 hover:underline">
              이용약관
            </Link>
            에 동의하게 됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
