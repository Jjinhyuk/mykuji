import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { User } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, display_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const isSeller = profile?.role === "seller" || profile?.role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-400">Mykuzi</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {isSeller ? (
                  <Link href="/seller">
                    <Button variant="ghost" className="text-gray-300 hover:text-white">
                      대시보드
                    </Button>
                  </Link>
                ) : (
                  <Link href="/apply-seller">
                    <Button variant="ghost" className="text-gray-300 hover:text-white">
                      판매자 신청
                    </Button>
                  </Link>
                )}
                <Link href="/profile">
                  <div className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center cursor-pointer transition-colors overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="프로필"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-300 hover:text-white">
                    로그인
                  </Button>
                </Link>
                <Link href="/apply-seller">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    판매자 신청
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold mb-6">
            라이브 방송을 위한
            <br />
            <span className="text-indigo-400">쿠지 추첨 서비스</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            OBS 오버레이로 방송 화면에 바로 띄우고,
            <br />
            실시간으로 추첨 결과를 공개하세요.
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              isSeller ? (
                <Link href="/seller">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                    대시보드로 이동
                  </Button>
                </Link>
              ) : (
                <Link href="/apply-seller">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                    판매자 신청하기
                  </Button>
                </Link>
              )
            ) : (
              <Link href="/login">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                  시작하기
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">쉬운 쿠지판 제작</h3>
            <p className="text-gray-400">
              경품 이미지와 수량만 입력하면 바로 쿠지판이 완성됩니다.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="text-3xl mb-4">📺</div>
            <h3 className="text-xl font-semibold mb-2">OBS 오버레이</h3>
            <p className="text-gray-400">
              방송 화면에 바로 띄울 수 있는 오버레이 URL을 제공합니다.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="text-3xl mb-4">⏸️</div>
            <h3 className="text-xl font-semibold mb-2">언제든 재개</h3>
            <p className="text-gray-400">
              방송이 끊겨도 걱정 없이, 언제든 이어서 진행할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
