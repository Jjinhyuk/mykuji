import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { BoardCard } from "@/components/dashboard/BoardCard";

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

  // 보드 목록 가져오기
  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  // 각 보드의 draw_events 존재 여부 확인
  const boardsWithDrawInfo = await Promise.all(
    (boards || []).map(async (board) => {
      const { count } = await supabase
        .from("draw_events")
        .select("*", { count: "exact", head: true })
        .eq("board_id", board.id);

      return {
        ...board,
        hasDrawEvents: (count || 0) > 0,
      };
    })
  );

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

      {boardsWithDrawInfo.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boardsWithDrawInfo.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              hasDrawEvents={board.hasDrawEvents}
            />
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
