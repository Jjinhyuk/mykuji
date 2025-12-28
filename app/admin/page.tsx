import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminApplicationList } from "@/components/control/AdminApplicationList";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 디버깅: profile 확인
  console.log("Admin page - User ID:", user.id);
  console.log("Admin page - Profile:", profile);
  console.log("Admin page - Profile Error:", profileError);

  if (profile?.role !== "admin") {
    redirect("/seller");
  }

  // seller_applications 조회 - user_id를 기반으로 profiles 조인
  const { data: applications, error: appError } = await supabase
    .from("seller_applications")
    .select(`
      *,
      profiles:user_id (
        id,
        display_name,
        avatar_url,
        role
      )
    `)
    .order("created_at", { ascending: false });

  console.log("Admin page - Applications:", applications);
  console.log("Admin page - Applications Error:", appError);

  // 통계 조회
  const { data: allProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("role");

  console.log("Admin page - All Profiles:", allProfiles);
  console.log("Admin page - Profiles Error:", profilesError);

  const sellerCount = allProfiles?.filter((p) => p.role === "seller").length || 0;
  const userCount = allProfiles?.filter((p) => p.role === "user").length || 0;
  const adminCount = allProfiles?.filter((p) => p.role === "admin").length || 0;

  const { data: boardStats, error: boardsError } = await supabase
    .from("boards")
    .select("status");

  const liveCount = boardStats?.filter((b) => b.status === "live").length || 0;
  const totalBoards = boardStats?.length || 0;

  // 대기중인 신청 수
  const pendingCount = applications?.filter((a) => a.status === "pending").length || 0;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/">
                <h1 className="text-xl font-bold text-indigo-400">Mykuzi</h1>
              </Link>
              <span className="text-gray-400">관리자 대시보드</span>
            </div>
            <Link href="/seller" className="text-gray-400 hover:text-white text-sm">
              판매자 대시보드 →
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">관리자 대시보드</h1>
          <div className="text-sm text-gray-400">
            로그인: {user.email}
          </div>
        </div>

        {/* 에러 표시 */}
        {(appError || profilesError || boardsError) && (
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>데이터 로딩 중 오류 발생</span>
              </div>
              {appError && <p className="text-red-300 text-sm mt-2">Applications: {appError.message}</p>}
              {profilesError && <p className="text-red-300 text-sm mt-2">Profiles: {profilesError.message}</p>}
              {boardsError && <p className="text-red-300 text-sm mt-2">Boards: {boardsError.message}</p>}
            </CardContent>
          </Card>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm">전체 사용자</p>
              <p className="text-3xl font-bold text-white">{(allProfiles?.length || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm">일반 회원</p>
              <p className="text-3xl font-bold text-gray-400">{userCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm">판매자</p>
              <p className="text-3xl font-bold text-indigo-400">{sellerCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm">전체 보드</p>
              <p className="text-3xl font-bold text-white">{totalBoards}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm">진행 중</p>
              <p className="text-3xl font-bold text-green-400">{liveCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* 판매자 신청 목록 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">판매자 신청 목록</CardTitle>
              {pendingCount > 0 && (
                <span className="bg-yellow-500 text-black text-sm font-semibold px-3 py-1 rounded-full">
                  {pendingCount}건 대기중
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {applications && applications.length > 0 ? (
              <AdminApplicationList applications={applications} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">신청 내역이 없습니다</p>
                {appError && (
                  <p className="text-gray-500 text-sm mt-2">
                    (데이터 조회 오류가 발생했을 수 있습니다)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
