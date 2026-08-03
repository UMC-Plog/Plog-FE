export type IntegrationProviderId = "github" | "figma" | "notion" | "docs" | "slides";

type StepLayout = {
  cardClass: string;
  cardPaddingClass?: string;
  infoHeightClass: string;
  accountRowClass?: string;
  guideClass?: string;
  guideHeadingClass?: string;
};

const DEFAULT_STEP_LAYOUT: StepLayout = {
  cardClass: "",
  infoHeightClass: "h-16",
};

export const INTEGRATION_STEP_LAYOUTS: Record<IntegrationProviderId, Partial<Record<1 | 2 | 3 | 4, StepLayout>>> = {
  github: {
    1: { cardClass: "min-h-[418px]", infoHeightClass: "h-20", guideClass: "h-[87px]", guideHeadingClass: "mt-6" },
    2: { cardClass: "min-h-[509px]", infoHeightClass: "h-20", accountRowClass: "py-[22.5px]" },
    4: { cardClass: "h-[429px]", infoHeightClass: "h-20" },
  },
  figma: {
    1: { cardClass: "min-h-[398px]", infoHeightClass: "h-20", guideClass: "h-[67px]", guideHeadingClass: "mt-6" },
    2: { cardClass: "min-h-[508px]", infoHeightClass: "h-20" },
    3: { cardClass: "", infoHeightClass: "h-20" },
    4: { cardClass: "", infoHeightClass: "h-20" },
  },
  notion: {
    1: { cardClass: "min-h-[378px]", infoHeightClass: "h-20", guideClass: "h-[47px]", guideHeadingClass: "mt-6" },
    2: { cardClass: "min-h-[508px]", infoHeightClass: "h-16" },
    3: { cardClass: "min-h-[641px]", infoHeightClass: "h-16" },
    4: { cardClass: "min-h-[434px]", cardPaddingClass: "pb-[22px] pt-[29px]", infoHeightClass: "h-20" },
  },
  docs: {
    1: { cardClass: "min-h-[367px]", infoHeightClass: "h-20", guideClass: "h-[47px]", guideHeadingClass: "mt-[13px]" },
    2: { cardClass: "min-h-[508px]", infoHeightClass: "h-16" },
    3: { cardClass: "", infoHeightClass: "h-16" },
    4: { cardClass: "", infoHeightClass: "h-20" },
  },
  slides: {
    1: { cardClass: "min-h-[367px]", infoHeightClass: "h-20", guideClass: "h-[47px]", guideHeadingClass: "mt-[13px]" },
    2: { cardClass: "min-h-[508px]", infoHeightClass: "h-16" },
    3: { cardClass: "", infoHeightClass: "h-16" },
    4: { cardClass: "", infoHeightClass: "h-20" },
  },
};

export function getIntegrationStepLayout(provider: IntegrationProviderId, step: number): StepLayout {
  return INTEGRATION_STEP_LAYOUTS[provider][step as 1 | 2 | 3 | 4] ?? DEFAULT_STEP_LAYOUT;
}
