import frogImg from "../assets/frog.png";
import ghostImg from "../assets/ghost.png";
import otterImg from "../assets/otter.png";
import pandaImg from "../assets/panda.png";
import penguinImg from "../assets/penguin.png";
import smileImg from "../assets/smile.png";
import tigerImg from "../assets/tiger.png";
import { getDateAfterDays } from "../lib/projectDate";
import type { Project } from "../types/project";

export const initialProjects: Project[] = [
  {
    id: "project-capstone-design",
    name: "캡스톤 디자인 2팀",
    type: "DEVELOPMENT",
    status: "IN_PROGRESS",
    progress: 30,
    expectedEndDate: getDateAfterDays(20),
    members: [
      { id: "member-1", nickname: "초록", profileImageUrl: frogImg },
      { id: "member-2", nickname: "펭귄", profileImageUrl: penguinImg },
      { id: "member-3", nickname: "수달", profileImageUrl: otterImg },
      { id: "member-4", nickname: "판다", profileImageUrl: pandaImg },
      { id: "member-5", nickname: "호랑", profileImageUrl: tigerImg },
    ],
    invitationLink: "https://plog.app/invite/project-capstone-design",
  },
  {
    id: "project-marketing-campaign",
    name: "마케팅 캠페인",
    type: "GENERAL",
    status: "COMPLETED",
    progress: 100,
    expectedEndDate: getDateAfterDays(0),
    members: [
      { id: "member-6", nickname: "초록", profileImageUrl: frogImg },
      { id: "member-7", nickname: "펭귄", profileImageUrl: penguinImg },
      { id: "member-8", nickname: "스마일", profileImageUrl: smileImg },
      { id: "member-9", nickname: "고스트", profileImageUrl: ghostImg },
      { id: "member-10", nickname: "판다", profileImageUrl: pandaImg },
    ],
    invitationLink: "https://plog.app/invite/project-marketing-campaign",
  },
  {
    id: "project-test",
    name: "테스트 프로젝트",
    type: "DEVELOPMENT",
    status: "IN_PROGRESS",
    progress: 72,
    expectedEndDate: getDateAfterDays(7),
    members: [
      { id: "member-11", nickname: "초록", profileImageUrl: frogImg },
      { id: "member-12", nickname: "펭귄", profileImageUrl: penguinImg },
      { id: "member-13", nickname: "수달", profileImageUrl: otterImg },
      { id: "member-14", nickname: "고스트", profileImageUrl: ghostImg },
      { id: "member-15", nickname: "호랑", profileImageUrl: tigerImg },
    ],
    invitationLink: "https://plog.app/invite/project-test",
  },
];
