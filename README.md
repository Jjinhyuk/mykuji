# Mykuzi - 라이브 방송용 쿠지 추첨 서비스

라이브 스트리머를 위한 쿠지(뽑기) 추첨 서비스입니다. OBS 오버레이를 통해 방송 화면에 실시간으로 추첨 결과를 표시할 수 있습니다.

## 기술 스택

- **프레임워크**: Next.js 15 (App Router) + TypeScript
- **스타일링**: Tailwind CSS + shadcn/ui
- **백엔드**: Supabase (Auth, Database, Storage, Realtime)
- **인증**: 카카오 + 구글 OAuth
- **배포**: Vercel

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 환경변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 개발 일지

### 2024-12-28 작업 내역

#### 1. 로그인 플로우 수정
- 로그인 후 `/seller`로 강제 이동 → **메인 페이지(`/`)로 이동**하도록 변경
- 로그인 페이지에서 이미 로그인된 사용자는 메인으로 자동 리다이렉트
- 메인 페이지 헤더에 로그인 상태에 따른 버튼 표시:
  - 비로그인: `로그인` + `판매자 신청`
  - 로그인(일반): `판매자 신청` + `프로필 아이콘`
  - 로그인(판매자): `대시보드` + `프로필 아이콘`

#### 2. 프로필 페이지 추가 (`/profile`)
- 프로필 이미지, 닉네임 수정
- 계정 상태(일반/판매자/관리자) 표시
- 로그아웃 기능

#### 3. 판매자 신청 페이지 개선
- `channel_url` 필수 → **선택으로 변경**
- 플랫폼 선택 기능 추가 (13개 플랫폼 - YouTube, Twitch, 치지직, SOOP 등)
- 신청 완료 후 **5초 카운트다운 → 메인으로 자동 이동**
- "메인페이지로 이동" 버튼 추가
- 안내 문구: "이 페이지는 판매자 신청 버튼을 클릭하면 확인 가능합니다"

#### 4. 대시보드 수정/삭제 기능
- 쿠지판 카드에 수정/삭제 버튼 추가 (호버 시 표시)
- **수정**: 추첨 진행 전 + 초안 상태에서만 가능
- **삭제**: 확인 모달로 한번 더 확인
- 수정 페이지 생성 (`/seller/boards/[id]/edit`)

#### 5. 서버 에러 수정
- 보드 상세 페이지 `onClick` 에러 → `CopyButton` 클라이언트 컴포넌트 분리
- `overlayUrl` 환경변수 fallback 수정

#### 6. 관리자 대시보드 개선
- 에러 표시 UI 추가
- 통계 카드 5개로 확장 (전체/일반/판매자/보드/진행중)
- 대기중 신청 수 배지 표시
- 신청 목록 UI 개선 (프로필 이미지, 날짜/시간 상세)

#### 7. RLS 정책 추가 (Supabase에서 실행 필요)

```sql
-- channel_url nullable로 변경
ALTER TABLE seller_applications ALTER COLUMN channel_url DROP NOT NULL;

-- 관리자가 다른 사용자 profile 업데이트 가능하도록
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

### Git 커밋 이력

| 커밋 | 내용 |
|------|------|
| `bf626ee` | 로그인 후 메인으로 리다이렉트 |
| `49faecf` | 프로필 페이지 + 헤더 개선 |
| `026ffb6` | 보드 상세 서버 에러 수정 |
| `900126e` | 대시보드 수정/삭제 기능 |
| `ed5e831` | channel_url nullable 스키마 |
| `73700a7` | 판매자 신청 후 자동 이동 |
| `3a894a7` | 관리자 대시보드 개선 |
| `392e342` | RLS 정책 추가 |

---

### 다음에 해야 할 것

1. ~~Supabase에서 RLS 정책 실행~~ (완료)
2. **쿠지판 이용 모드 2가지 구현**:
   - **방송 송출 (오버레이)**: 현재 기능 - OBS 브라우저 소스로 방송 화면에 띄움
   - **바로 이용**: 웹페이지 자체에서 쿠지판을 보여주고 직접 추첨 (오버레이 없이)
3. 보드 생성/설정 시 모드 선택 기능 추가
4. "바로 이용" 모드용 공개 페이지 구현 (시청자가 볼 수 있는 페이지)
5. 컨트롤룸에서 채팅 참여자 이름 입력 → 추첨 플로우 완성
