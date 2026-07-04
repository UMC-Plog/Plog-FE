import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* 하단 탭바가 있는 화면들 */}
        <Route element={<BottomTabBar />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/my" element={<MyPage />} />
        </Route>

        {/* 프로젝트 상세: 피드/채팅/업무/리포트 상단 탭 */}
        <Route path="/project/:id" element={<ProjectTabBar />}>
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<ProjectFeedPage />} />
          <Route path="chat" element={<ProjectChatPage />} />
          <Route path="tasks" element={<ProjectTaskPage />} />
          <Route path="report" element={<ProjectReportPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
