import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/seller";

  // OAuth 에러 처리
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || "")}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange error:", exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=session_error&message=${encodeURIComponent(exchangeError.message)}`
      );
    }

    // 성공 시 seller 페이지로 이동
    return NextResponse.redirect(`${origin}${next}`);
  }

  // code가 없는 경우
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
