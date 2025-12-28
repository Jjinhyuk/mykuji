"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, Minus, Trash2, ImagePlus, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface PrizeTier {
  id: string;
  tier: string;
  name: string;
  quantity: number;
  color: string;
  existingImages: string[];
  newImages: File[];
  newImagePreviews: string[];
}

const TIER_COLORS = [
  { name: "1등", color: "#FFD700", bgClass: "from-yellow-400 to-amber-500" },
  { name: "2등", color: "#C0C0C0", bgClass: "from-gray-300 to-gray-400" },
  { name: "3등", color: "#CD7F32", bgClass: "from-orange-400 to-orange-600" },
  { name: "4등", color: "#818CF8", bgClass: "from-indigo-400 to-indigo-600" },
  { name: "5등", color: "#34D399", bgClass: "from-emerald-400 to-emerald-600" },
  { name: "꽝", color: "#6B7280", bgClass: "from-gray-500 to-gray-600" },
];

export default function EditBoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.boardId as string;
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalDraws, setTotalDraws] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prizeTiers, setPrizeTiers] = useState<PrizeTier[]>([]);

  useEffect(() => {
    const loadBoard = async () => {
      // 보드 정보 가져오기
      const { data: board, error: boardError } = await supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .single();

      if (boardError || !board) {
        toast.error("쿠지판을 찾을 수 없습니다");
        router.push("/seller");
        return;
      }

      // draw_events 확인
      const { count } = await supabase
        .from("draw_events")
        .select("*", { count: "exact", head: true })
        .eq("board_id", boardId);

      if ((count || 0) > 0 || board.status !== "draft") {
        setCanEdit(false);
        setIsLoading(false);
        return;
      }

      setTitle(board.title);
      setDescription(board.description || "");

      // 경품 정보 가져오기
      const { data: prizes } = await supabase
        .from("prizes")
        .select("*")
        .eq("board_id", boardId)
        .order("sort_order");

      if (prizes) {
        const tiers: PrizeTier[] = [];
        let total = 0;

        prizes.forEach((prize, index) => {
          total += prize.qty_total;
          if (prize.tier !== "꽝") {
            const tierIndex = TIER_COLORS.findIndex((t) => t.name === prize.tier);
            tiers.push({
              id: prize.id,
              tier: prize.tier,
              name: prize.name,
              quantity: prize.qty_total,
              color: TIER_COLORS[tierIndex]?.color || TIER_COLORS[index]?.color || "#6B7280",
              existingImages: prize.images || [],
              newImages: [],
              newImagePreviews: [],
            });
          }
        });

        setPrizeTiers(tiers);
        setTotalDraws(total);
      }

      setIsLoading(false);
    };

    loadBoard();
  }, [boardId, supabase, router]);

  const totalPrizes = prizeTiers.reduce((sum, t) => sum + t.quantity, 0);
  const blankCount = Math.max(0, totalDraws - totalPrizes);

  const addTier = () => {
    const nextIndex = prizeTiers.length;
    if (nextIndex >= TIER_COLORS.length - 1) return;

    const tierInfo = TIER_COLORS[nextIndex];
    setPrizeTiers([
      ...prizeTiers,
      {
        id: `new-${Date.now()}`,
        tier: tierInfo.name,
        name: "",
        quantity: 1,
        color: tierInfo.color,
        existingImages: [],
        newImages: [],
        newImagePreviews: [],
      },
    ]);
  };

  const removeTier = (id: string) => {
    if (prizeTiers.length <= 1) return;
    setPrizeTiers(prizeTiers.filter((t) => t.id !== id));
  };

  const updateTier = (id: string, field: keyof PrizeTier, value: string | number) => {
    setPrizeTiers(
      prizeTiers.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleImageUpload = (id: string, files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    const previews = fileArray.map((file) => URL.createObjectURL(file));

    setPrizeTiers(
      prizeTiers.map((t) =>
        t.id === id
          ? {
              ...t,
              newImages: [...t.newImages, ...fileArray],
              newImagePreviews: [...t.newImagePreviews, ...previews],
            }
          : t
      )
    );
  };

  const removeExistingImage = (tierId: string, imageIndex: number) => {
    setPrizeTiers(
      prizeTiers.map((t) => {
        if (t.id !== tierId) return t;
        const newImages = [...t.existingImages];
        newImages.splice(imageIndex, 1);
        return { ...t, existingImages: newImages };
      })
    );
  };

  const removeNewImage = (tierId: string, imageIndex: number) => {
    setPrizeTiers(
      prizeTiers.map((t) => {
        if (t.id !== tierId) return t;
        const newImages = [...t.newImages];
        const newPreviews = [...t.newImagePreviews];
        newImages.splice(imageIndex, 1);
        newPreviews.splice(imageIndex, 1);
        return { ...t, newImages, newImagePreviews: newPreviews };
      })
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("쿠지판 이름을 입력해주세요");
      return;
    }

    if (prizeTiers.some((t) => !t.name.trim())) {
      toast.error("모든 등급의 경품 이름을 입력해주세요");
      return;
    }

    if (totalPrizes > totalDraws) {
      toast.error("당첨 개수가 총 뽑기 수보다 많습니다");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 보드 업데이트
      const { error: boardError } = await supabase
        .from("boards")
        .update({
          title,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", boardId);

      if (boardError) throw boardError;

      // 2. 기존 경품 삭제
      await supabase.from("prizes").delete().eq("board_id", boardId);

      // 3. 경품 재생성
      for (let i = 0; i < prizeTiers.length; i++) {
        const tier = prizeTiers[i];
        const imageUrls: string[] = [...tier.existingImages];

        // 새 이미지 업로드
        for (const image of tier.newImages) {
          const fileName = `${boardId}/${tier.id}/${Date.now()}-${image.name}`;
          const { error: uploadError } = await supabase.storage
            .from("prize-images")
            .upload(fileName, image);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("prize-images")
              .getPublicUrl(fileName);
            imageUrls.push(urlData.publicUrl);
          }
        }

        await supabase.from("prizes").insert({
          board_id: boardId,
          tier: tier.tier,
          name: tier.name,
          qty_total: tier.quantity,
          qty_left: tier.quantity,
          images: imageUrls,
          sort_order: i,
        });
      }

      // 4. 꽝 추가 (있다면)
      if (blankCount > 0) {
        await supabase.from("prizes").insert({
          board_id: boardId,
          tier: "꽝",
          name: "꽝",
          qty_total: blankCount,
          qty_left: blankCount,
          images: [],
          sort_order: prizeTiers.length,
        });
      }

      toast.success("쿠지판이 수정되었습니다!");
      router.push(`/seller/boards/${boardId}`);
    } catch (error) {
      console.error(error);
      toast.error("수정에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">수정할 수 없습니다</h2>
            <p className="text-gray-400 mb-6">
              추첨이 진행되었거나 초안 상태가 아닌 쿠지판은 수정할 수 없습니다.
            </p>
            <Link href={`/seller/boards/${boardId}`}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/seller/boards/${boardId}`}>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">쿠지판 수정</h1>
          <p className="text-gray-400 mt-1">경품과 당첨 개수를 수정하세요</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">쿠지판 이름</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 12월 피규어 쿠지"
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-300">설명 (선택)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 쿠지판에 대한 설명"
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* 뽑기 설정 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            뽑기 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 총 뽑기 개수 */}
          <div className="bg-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-lg text-white">총 뽑기 개수</Label>
                <p className="text-gray-400 text-sm">시청자가 뽑을 수 있는 총 횟수</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setTotalDraws(Math.max(1, totalDraws - 10))}
                  className="border-gray-600"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={totalDraws}
                  onChange={(e) => setTotalDraws(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-center bg-gray-700 border-gray-600 text-white text-xl font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setTotalDraws(totalDraws + 10)}
                  className="border-gray-600"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 현황 표시 */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-gray-400 text-xs">총 뽑기</p>
                <p className="text-2xl font-bold text-white">{totalDraws}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-gray-400 text-xs">당첨</p>
                <p className="text-2xl font-bold text-green-400">{totalPrizes}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-gray-400 text-xs">꽝</p>
                <p className="text-2xl font-bold text-gray-500">{blankCount}</p>
              </div>
            </div>

            {/* 진행바 */}
            <div className="mt-4 h-4 bg-gray-800 rounded-full overflow-hidden flex">
              {prizeTiers.map((tier, i) => (
                <div
                  key={tier.id}
                  className={`h-full bg-gradient-to-r ${TIER_COLORS[i]?.bgClass || "from-gray-500 to-gray-600"}`}
                  style={{ width: `${(tier.quantity / totalDraws) * 100}%` }}
                />
              ))}
              <div
                className="h-full bg-gray-600"
                style={{ width: `${(blankCount / totalDraws) * 100}%` }}
              />
            </div>
          </div>

          {/* 등급별 설정 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg text-white">등급별 당첨 설정</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTier}
                disabled={prizeTiers.length >= TIER_COLORS.length - 1}
                className="border-gray-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                등급 추가
              </Button>
            </div>

            {prizeTiers.map((tier, index) => (
              <div
                key={tier.id}
                className="bg-gray-700/50 rounded-xl p-4 border-l-4"
                style={{ borderColor: tier.color }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${TIER_COLORS[index]?.bgClass} flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white font-bold text-lg">{tier.tier}</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label className="text-gray-400 text-xs">경품 이름</Label>
                        <Input
                          value={tier.name}
                          onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                          placeholder="예: 한정판 피규어"
                          className="bg-gray-700 border-gray-600 text-white mt-1"
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-gray-400 text-xs">당첨 개수</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-gray-600"
                            onClick={() =>
                              updateTier(tier.id, "quantity", Math.max(1, tier.quantity - 1))
                            }
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={tier.quantity}
                            onChange={(e) =>
                              updateTier(tier.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="text-center bg-gray-700 border-gray-600 text-white font-bold"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-gray-600"
                            onClick={() => updateTier(tier.id, "quantity", tier.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {prizeTiers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTier(tier.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 mt-5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* 이미지 */}
                    <div>
                      <Label className="text-gray-400 text-xs">경품 이미지 (선택)</Label>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {tier.existingImages.map((url, i) => (
                          <div key={`existing-${i}`} className="relative w-16 h-16">
                            <img
                              src={url}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(tier.id, i)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {tier.newImagePreviews.map((preview, i) => (
                          <div key={`new-${i}`} className="relative w-16 h-16">
                            <img
                              src={preview}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewImage(tier.id, i)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <label className="w-16 h-16 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors">
                          <ImagePlus className="w-5 h-5 text-gray-500" />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleImageUpload(tier.id, e.target.files)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <Card className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-700">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">
                총 {totalDraws}개 중 {totalPrizes}개 당첨 ({((totalPrizes / totalDraws) * 100).toFixed(1)}%)
              </h3>
              <p className="text-gray-400 text-sm">
                {prizeTiers.map((t) => `${t.tier}: ${t.quantity}개`).join(" / ")}
                {blankCount > 0 && ` / 꽝: ${blankCount}개`}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href={`/seller/boards/${boardId}`}>
                <Button variant="outline" className="border-gray-600">
                  취소
                </Button>
              </Link>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 px-8"
                size="lg"
              >
                {isSubmitting ? "저장 중..." : "변경사항 저장"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
