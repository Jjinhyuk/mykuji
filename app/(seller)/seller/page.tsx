import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const statusColors = {
  draft: "bg-gray-500",
  live: "bg-green-500",
  paused: "bg-yellow-500",
  closed: "bg-red-500",
};

const statusLabels = {
  draft: "초안",
  live: "진행중",
  paused: "일시중지",
  closed: "종료",
};

export default async function SellerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 판매자가 아니면 신청 페이지로
  if (profile?.role !== "seller" && profile?.role !== "admin") {
    redirect("/apply-seller");
  }

  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">대시보드</h1>
          <p className="text-gray-400 mt-1">쿠지판을 관리하세요</p>
        </div>
        <Link href="/seller/boards/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />새 보드 만들기
          </Button>
        </Link>
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link key={board.id} href={`/seller/boards/${board.id}`}>
              <Card className="bg-gray-800 border-gray-700 hover:border-indigo-500 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white text-lg">
                      {board.title}
                    </CardTitle>
                    <Badge
                      className={`${statusColors[board.status as keyof typeof statusColors]} text-white`}
                    >
                      {statusLabels[board.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {board.description || "설명 없음"}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(board.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 mb-4">아직 만든 쿠지판이 없습니다</p>
            <Link href="/seller/boards/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                첫 쿠지판 만들기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
