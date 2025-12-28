import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminApplicationList } from "@/components/control/AdminApplicationList";
import Link from "next/link";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/seller");
  }

  const { data: applications } = await supabase
    .from("seller_applications")
    .select("*, profiles(*)")
    .order("created_at", { ascending: false });

  const { data: stats } = await supabase.from("profiles").select("role");

  const sellerCount = stats?.filter((p) => p.role === "seller").length || 0;
  const userCount = stats?.filter((p) => p.role === "user").length || 0;

  const { data: boardStats } = await supabase.from("boards").select("status");
  const liveCount = boardStats?.filter((b) => b.status === "live").length || 0;
  const totalBoards = boardStats?.length || 0;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/seller">
                <h1 className="text-xl font-bold text-indigo-400">Mykuzi</h1>
              </Link>
              <span className="text-gray-400">관리자</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold text-white">관리자 대시보드</h1>

        {/* 통계 */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm">전체 사용자</p>
              <p className="text-3xl font-bold text-white">{userCount + sellerCount}</p>
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
            <CardTitle className="text-white">판매자 신청 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminApplicationList applications={applications || []} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
