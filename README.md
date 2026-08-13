# Plog Frontend

기록은 남기고, 기여는 증명한다.
팀 프로젝트 속 보이지 않는 노력을 데이터로 남기고, AI 기반 리포트로 정당한 기여를 증명하는 플랫폼 **Plog**의 프론트엔드 저장소입니다.

## 🔗 링크

| 구분 | 링크 |
| --- | --- |
| 배포 | https://www.umc-plog.site |
| API 문서 | https://api.umc-plog.site/swagger-ui/index.html |

## 📌 프로젝트 소개

Plog는 팀 프로젝트에서 결과물 뒤에 가려지는 개인의 기여(자료조사, 회의 조율, 갈등 중재 등)를 업무카드·활동 로그·닉네임 기반 블라인드 평가로 기록하고, 프로젝트 종료 후 AI가 이를 분석해 설명 가능한 리포트로 제공합니다. 이 리포트는 성적 이의 제기, 포트폴리오, 자기소개서 등에 활용할 수 있습니다.

- 타겟: 팀 프로젝트를 자주 수행하는 대학생, 협업 경험을 커리어 자산화하고 싶은 취준생
- 형태: **모바일 웹 전용** (데스크톱 반응형 미지원)

## 👥 팀원 및 역할 분담

| 담당 | 닉네임 | 담당 영역 |
| --- | --- | --- |
| A | 성재 | 인증 / 온보딩 |
| B | 져니 | 홈 · 마이페이지 · 프로젝트 설정 · 외부 툴 연동 |
| C | 다민 | 프로젝트 상세 - 피드 · 업무 · 공지 · 게시글 |
| D | 맥스 | 프로젝트 상세 - 채팅 · 리포트 · Peer 평가 · 알림 |

## 🛠 기술 스택

| 구분 | 기술 |
| --- | --- |
| 코어 | React 19 + TypeScript + Vite |
| 라우팅 | React Router v6 (`react-router-dom`) |
| 상태관리 | Zustand |
| 스타일링 | Tailwind CSS |
| 실시간 통신 | STOMP over SockJS (`@stomp/stompjs`, `sockjs-client`) |
| 푸시 알림 | Firebase Cloud Messaging |
| 린터 | oxlint |
| 배포 | Vercel |

### 선택 이유
- **Zustand**: 인증·프로젝트 목록·알림 배지 등 전역 상태가 여러 개지만, Redux 대비 보일러플레이트가 적어 팀 프로젝트 규모에 적합
- **Tailwind CSS**: 카드형 UI·뱃지·진행률바 등 반복 패턴이 많고 모바일 대응이 핵심이라, 클래스 기반 스타일링과 `tailwind.config.js` 디자인 토큰 통일이 유리
- **STOMP over SockJS**: 백엔드 채팅 서버가 STOMP 프로토콜을 사용하며, WebSocket 미지원 환경을 위한 폴백이 필요

## ✨ 주요 구현 기능

모든 기능은 실제 백엔드 API(`https://api.umc-plog.site`)와 연동되어 동작합니다.

### 인증
- 이메일 회원가입·로그인, 소셜 로그인(카카오 / 구글)
- accessToken 만료 시 refreshToken으로 자동 재발급 (동시 요청 시 재발급 1회만 수행, 토큰 회전 대응)
- 비밀번호 찾기·재설정, 회원 탈퇴

### 프로젝트
- 프로젝트 생성 · 설정 변경 · 나가기 (방장 권한 이전 포함)
- 초대 링크 및 QR 코드 생성, 초대 링크로 참여
- 진행률 · 남은 기간 기반 홈 카드 (리스트 / 갤러리 뷰)

### 피드 · 업무
- 게시글 · 공지 CRUD, 파일 첨부
- 칸반 보드 기반 업무카드 CRUD (예정 / 진행 중 / 완료), 마감일 관리

### 채팅
- STOMP 기반 실시간 메시지 송수신
- 파일 · 이미지 첨부 및 썸네일 비동기 수신
- 읽음 처리 및 안읽음 배지 동기화 (다중 기기 대응)

### 외부 툴 연동
- GitHub · Figma · Notion · Google Docs · Google Slides OAuth 연동
- 연동 리소스의 활동 로그 수집 및 진행 상태 폴링
- 수집된 활동의 외부 계정 ↔ 팀원 매핑

### Peer 평가
- 팀원별 4개 역량 별점 평가, 키워드 선택, 상세 피드백
- 자기 피드백 작성, 내 외부 계정 선택
- 최종 제출 및 전원 제출 시 프로젝트 완료 전환

### 리포트
- 팀 리포트: 업무 완수 현황, 기여도 분포, 팀원별 활동 요약, AI 인사이트
- 개인 리포트: 기여도 상세, 강점 · 취약점 분석, 성장 인사이트, AI 문장 변환
- 팀 · 개인 PDF를 묶은 ZIP 다운로드
- 리포트 생성 상태 폴링 및 생성 트리거

### 알림
- FCM 웹 푸시 (포그라운드 / 백그라운드, iOS 홈 화면 추가 환경 대응)
- 알림 목록, 단건 · 전체 읽음 처리, 타입별 화면 이동

## 📁 폴더 구조

```
src/
├── api/          # API 호출 함수, fetch 클라이언트, STOMP 클라이언트
├── assets/       # 이미지, 아이콘 등 정적 파일
├── components/   # 재사용 컴포넌트
│   ├── attachment/  notice/  post/  project/  report/  task/  my/
├── lib/          # 도메인 유틸 (날짜 계산, OAuth, 리포트 변환, 로컬 기록 등)
├── pages/        # 라우트 단위 화면 컴포넌트
│   ├── my/          # 마이페이지 하위 화면
│   ├── onboarding/  # 온보딩 화면
│   └── project/     # 프로젝트 상세 하위 화면
│       └── report/  # 팀 · 개인 리포트 상세
├── store/        # Zustand 스토어 (auth, project, integration, notificationBadge)
├── types/        # 공통 타입 정의
├── App.tsx       # 라우터 정의
└── main.tsx      # 엔트리 포인트

public/
└── firebase-messaging-sw.js   # FCM 백그라운드 푸시 서비스 워커
```

## 🚀 실행 방법

```bash
# 패키지 설치
npm install

# 환경 변수 설정 (.env.example 참고)
cp .env.example .env.local

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# 린트
npm run lint
```

### 환경 변수

`.env.local`에 아래 값이 필요합니다. 자세한 키 목록은 `.env.example`을 참고하세요.

| 키 | 용도 |
| --- | --- |
| `VITE_KAKAO_REST_API_KEY` | 카카오 소셜 로그인 |
| `VITE_GOOGLE_CLIENT_ID` | 구글 소셜 로그인 |
| `VITE_GOOGLE_PICKER_API_KEY` / `VITE_GOOGLE_PICKER_APP_ID` | 구글 드라이브 파일 선택 |
| `VITE_FIREBASE_*` | FCM 푸시 알림 |
| `VITE_FRONTEND_URL` | 초대 링크 생성 시 사용할 프론트 주소 |

> `.env.local`은 `.gitignore`에 포함되어 저장소에 올라가지 않습니다.

### 의존성 보안

`npm audit` 기준 4건이 보고되며, **모두 현재 메이저 버전에 패치가 없어** 해당 메이저의 최신 버전을 쓰고 있습니다.

| 패키지 | 등급 | 영향 범위 | 현재 조치 |
| --- | --- | --- | --- |
| `postcss`, `nanoid` | high | 빌드 도구 전용 — 배포 번들에 포함되지 않음 | 8.5.26 / 3.3.18 (각 메이저 최신) |
| `react-router-dom` | moderate | 런타임 | 6.30.4 (6.x 최신). 해결하려면 7.x 메이저 업그레이드 필요 |

React Router 7 마이그레이션은 50여 개 라우트 전체 재검증이 필요해 이번 범위에서 제외했습니다.

## 🌿 브랜치 전략

```
main        # 배포 가능한 안정 버전
 └─ dev     # 개발 통합 브랜치, 여기로 PR
     └─ {커밋타입}/#{이슈번호}   # 예: feat/#12, fix/#34
```

- `main`, `dev`는 직접 push 금지, 반드시 PR로만 병합
- 작업 시작 전 GitHub Issues에 이슈를 먼저 생성하고, 그 이슈 번호로 `dev`에서 브랜치 생성
- 브랜치명 형식: `컨벤션명/#이슈번호` (컨벤션명은 아래 커밋 타입과 동일)

## ✅ 커밋 컨벤션

`[타입] #이슈번호: 설명` 형식으로 작성합니다.

| 커밋 타입 | 설명 | 커밋 메시지 예시 |
| --- | --- | --- |
| ✨ Feat | 새로운 기능 추가 | `[FEAT] #이슈번호: 기능 추가` |
| 🐛 Fix | 버그 수정 | `[FIX] #이슈번호: 오류 수정` |
| 📄 Docs | 문서 수정 | `[DOCS] #이슈번호: README 파일 수정` |
| ♻️ Refactor | 코드 리팩토링 | `[REFACTOR] #이슈번호: 함수 구조 개선` |
| 📦 Chore | 빌드 업무 수정, 패키지 매니저 수정 등 production code와 무관한 변경 | `[CHORE] #이슈번호: .gitignore 파일 수정` |

## 🔀 PR 컨벤션

- 제목: `[화면명/기능명] 작업 내용 요약`
- 본문에 작업 내용, 스크린샷(UI 변경 시), 관련 이슈 번호 포함
- 최소 1인 이상 리뷰 승인 후 병합
- 병합 방식: Squash and merge 권장

## 📱 화면 목록

하단 탭 4개(프로젝트 / 리포트 / 채팅 / 마이) 구조입니다.

### 인증 · 온보딩

| 화면 | 라우트 |
| --- | --- |
| 스플래시 | `/` |
| 로그인 | `/login` |
| 회원가입 | `/signup` |
| 회원가입 - 소셜 동의 | `/signup/social-consent` |
| 회원가입 - 이메일 정보입력 | `/signup/email` |
| 프로필 설정 | `/signup/profile` |
| 가입 후 안내 | `/onboarding/welcome` |
| 비밀번호 찾기 / 재설정 | `/find-password`, `/reset-password` |
| 소셜 로그인 콜백 | `/oauth/:provider` |

### 홈 · 마이페이지 · 프로젝트 설정

| 화면 | 라우트 |
| --- | --- |
| 홈 (프로젝트 리스트/갤러리) | `/home` |
| 프로젝트 생성 | `/project/new` |
| 초대 링크 진입 | `/invite/:inviteCode` |
| 프로젝트 설정 | `/project/:id/settings` |
| 외부 툴 연동 | `/project/:id/settings/integrations/:provider` |
| 외부 툴 연동 콜백 | `/integrations/callback` |
| 마이페이지 | `/my` |
| 프로필 수정 / 계정 연동 / 알림 설정 / 회원 탈퇴 | `/my/profile`, `/my/accounts`, `/my/notifications`, `/my/withdraw` |
| 알림 목록 | `/notifications` |

### 프로젝트 상세 - 피드 · 업무

| 화면 | 라우트 |
| --- | --- |
| 피드 | `/project/:id/feed` |
| 업무 (칸반) | `/project/:id/tasks` |
| 공지 작성 / 이력 / 수정 | `/project/:id/notices/new`, `/project/:id/notices`, `/project/:id/notices/:noticeId/edit` |
| 게시글 작성 / 상세 / 수정 | `/project/:id/posts/new`, `/project/:id/posts/:postId`, `/project/:id/posts/:postId/edit` |

### 프로젝트 상세 - 채팅 · 리포트 · Peer 평가

| 화면 | 라우트 |
| --- | --- |
| 채팅 (전역) | `/chat` |
| 리포트 (전역) | `/report` |
| 프로젝트 채팅 | `/project/:id/chat` |
| 프로젝트 리포트 | `/project/:id/report` |
| 팀 리포트 상세 | `/project/:id/report/team` |
| 개인 리포트 상세 | `/project/:id/report/personal` |
| Peer 평가 - 목록 | `/project/:id/peer-eval` |
| Peer 평가 - 자기 피드백 | `/project/:id/peer-eval/self` |
| Peer 평가 - 내 계정 선택 | `/project/:id/peer-eval/accounts/:provider` |
| Peer 평가 - 별점 | `/project/:id/peer-eval/:memberId/star` |
| Peer 평가 - 키워드 · 피드백 | `/project/:id/peer-eval/:memberId/keyword` |

> `/internal/report-render/*`는 서버가 리포트 PDF를 렌더링할 때 사용하는 내부 전용 화면으로, 사용자 진입 경로가 없습니다.

### 전체 플로우

```
스플래시 ──▶ 로그인 ──▶ 홈(프로젝트 리스트) ──▶ 프로젝트 상세 (/project/:id)
                              │                        │
                              │                        ├─▶ 피드 ──▶ 공지 · 게시글 CRUD
                              │                        ├─▶ 채팅 (실시간)
                              │                        ├─▶ 업무 (칸반)
                              │                        └─▶ 리포트 ──▶ Peer 평가 ──▶ 팀 · 개인 리포트
                              │
                              ├─▶ 리포트 (전역) ──▶ ZIP 다운로드
                              ├─▶ 채팅 (전역)
                              └─▶ 마이 ──▶ 프로필 수정 / 계정 연동 / 알림 설정 / 회원 탈퇴
```
