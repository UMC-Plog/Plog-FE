import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ReportPage from './pages/ReportPage'
import ChatPage from './pages/ChatPage'
import MyPage from './pages/MyPage'
import BottomTabBar from './components/BottomTabBar'
import ProjectTabBar from './components/ProjectTabBar'
import ProjectFeedPage from './pages/project/ProjectFeedPage'
import ProjectChatPage from './pages/project/ProjectChatPage'
import ProjectTaskPage from './pages/project/ProjectTaskPage'
import ProjectReportPage from './pages/project/ProjectReportPage'
import NoticeFormPage from './pages/project/notice/NoticeFormPage'
import NoticeDetailPage from './pages/project/notice/NoticeDetailPage'
import NoticeHistoryPage from './pages/project/notice/NoticeHistoryPage'
import PostFormPage from './pages/project/post/PostFormPage'
import PostDetailPage from './pages/project/post/PostDetailPage'
import { SplashPage } from './pages/SplashPage'
import { SignupPage } from './pages/SignupPage'
import { SignupSocialConsentPage } from './pages/SignupSocialConsentPage'
import { SignupEmailStepPage } from './pages/SignupEmailStepPage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { FindPasswordPage } from './pages/FindPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { CreateProjectPage } from './pages/project/CreateProjectPage'
import { ProjectSettingsPage } from './pages/project/ProjectSettingsPage'
import { ProfileEditPage } from './pages/my/ProfileEditPage'
import { AccountConnectionsPage } from './pages/my/AccountConnectionsPage'
import { NotificationSettingsPage } from './pages/my/NotificationSettingsPage'
import { WithdrawPage } from './pages/my/WithdrawPage'
import PeerEvalListPage from './pages/project/PeerEvalListPage'
import PeerEvalStarPage from './pages/project/PeerEvalStarPage'
import PeerEvalKeywordPage from './pages/project/PeerEvalKeywordPage'
import SelfFeedbackPage from './pages/project/SelfFeedbackPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 담당자 A — 인증/온보딩 (페이지 ID는 팀 노션 "역할 분담 상세" 문서 기준) */}
        <Route path="/" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/social-consent" element={<SignupSocialConsentPage />} />
        <Route path="/signup/email" element={<SignupEmailStepPage />} />
        <Route path="/signup/profile" element={<ProfileSetupPage />} />
        <Route path="/find-password" element={<FindPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/oauth/:provider" element={<OAuthCallbackPage />} />

        {/* 하단 탭바가 있는 화면들 */}
        <Route element={<BottomTabBar />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/my" element={<MyPage />} />
        </Route>

        <Route path="/my/profile" element={<ProfileEditPage />} />
        <Route path="/my/accounts" element={<AccountConnectionsPage />} />
        <Route path="/my/notifications" element={<NotificationSettingsPage />} />
        <Route path="/my/withdraw" element={<WithdrawPage />} />
        <Route path="/project/new" element={<CreateProjectPage />} />
        <Route path="/project/:id/settings" element={<ProjectSettingsPage />} />

        {/* Peer 평가 플로우 — ProjectTabBar 밖 독립 화면 */}
        <Route path="/project/:id/peer-eval" element={<PeerEvalListPage />} />
        <Route path="/project/:id/peer-eval/self" element={<SelfFeedbackPage />} />
        <Route path="/project/:id/peer-eval/:memberId/star" element={<PeerEvalStarPage />} />
        <Route path="/project/:id/peer-eval/:memberId/keyword" element={<PeerEvalKeywordPage />} />

        {/* 프로젝트 상세: 피드/채팅/업무/리포트 상단 탭 */}
        <Route path="/project/:id" element={<ProjectTabBar />}>
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<ProjectFeedPage />} />
          <Route path="chat" element={<ProjectChatPage />} />
          <Route path="tasks" element={<ProjectTaskPage />} />
          <Route path="report" element={<ProjectReportPage />} />
        </Route>

        <Route path="/project/:id/notices/new" element={<NoticeFormPage />} />
        <Route path="/project/:id/notices" element={<NoticeHistoryPage />} />
        <Route path="/project/:id/notices/:noticeId" element={<NoticeDetailPage />} />
        <Route path="/project/:id/notices/:noticeId/edit" element={<NoticeFormPage />} />
        <Route path="/project/:id/posts/new" element={<PostFormPage />} />
        <Route path="/project/:id/posts/:postId" element={<PostDetailPage />} />
        <Route path="/project/:id/posts/:postId/edit" element={<PostFormPage />} />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
