/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Plog 디자인 시스템 (2026.07 디자인팀 전달본 기준)
      // 컬러/폰트/spacing/radius/shadow는 반드시 여기서만 관리 - 컴포넌트에 하드코딩 금지
      colors: {
        // 메인 브랜드 컬러 (blue/500, teal/500, navy/700 기준 별칭)
        primary: {
          DEFAULT: "#2186FB", // Plog Blue
          50: "#EBF3FE",
          100: "#D6E7FE",
          200: "#ADCFFD",
          300: "#7DB2FC",
          400: "#4D9CFC",
          500: "#2186FB",
          600: "#0E6FE8",
          700: "#0B59BC",
          800: "#0E4790",
          900: "#123C73",
        },
        // primary와 동일한 팔레트의 별칭 (인증/온보딩 화면에서 blue-* 클래스로 사용)
        blue: {
          DEFAULT: "#2186FB",
          50: "#EBF3FE",
          100: "#D6E7FE",
          200: "#ADCFFD",
          300: "#7DB2FC",
          400: "#4D9CFC",
          500: "#2186FB",
          600: "#0E6FE8",
          700: "#0B59BC",
          800: "#0E4790",
          900: "#123C73",
        },
        aqua: {
          DEFAULT: "#06BCC4", // Plog Aqua
          50: "#E2FAFB",
          100: "#BCF2F4",
          200: "#8AE7EA",
          300: "#4FD8DD",
          400: "#18C6CD",
          500: "#06BCC4",
          600: "#069AA1",
          700: "#097A80",
          800: "#0C6064",
          900: "#0C4E52",
        },
        navy: {
          DEFAULT: "#173E8A", // Plog Navy
          50: "#EEF1F8",
          100: "#D6DFEF",
          200: "#ADBDDD",
          300: "#8194C4",
          400: "#5670AE",
          500: "#324F95",
          600: "#23407F",
          700: "#173E8A",
          800: "#142A57",
          900: "#0F2044",
        },
        gray: {
          25: "#FAFBFC",
          50: "#F4F6F8",
          100: "#ECEFF3",
          200: "#DDE2E9",
          300: "#C5CCD6",
          400: "#9AA4B2",
          500: "#6B7585",
          600: "#4D5663",
          700: "#3A424E",
          900: "#161A20",
        },
        // 상태/의미 컬러
        success: "#16A06B",
        warning: "#E1920E",
        error: "#E5484D",
        info: "#2186FB",
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        display: ["48px", { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "800" }],
        h1: ["36px", { lineHeight: "1.25", letterSpacing: "-0.025em", fontWeight: "800" }],
        h2: ["28px", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "700" }],
        h3: ["22px", { lineHeight: "1.35", letterSpacing: "-0.015em", fontWeight: "700" }],
        title: ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "600" }],
      },
      spacing: {
        // space-N 은 Tailwind 기본 스케일과 겹치지 않도록 값 그대로 노출
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        10: "40px",
        12: "48px",
        16: "64px",
      },
      borderRadius: {
        none: "0px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        full: "999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(22, 26, 32, 0.06)", // 인풋
        md: "0 4px 10px rgba(22, 26, 32, 0.08)", // 카드
        lg: "0 10px 24px rgba(22, 26, 32, 0.12)", // 팝오버/드롭다운
        xl: "0 20px 40px rgba(22, 26, 32, 0.16)", // 모달
      },
      backgroundImage: {
        "plog-gradient": "linear-gradient(95deg, #2186FB 0%, #06BCC4 52%, #173E8A 100%)",
      },
      maxWidth: {
        mobile: "430px",
      },
    },
  },
  plugins: [],
}
