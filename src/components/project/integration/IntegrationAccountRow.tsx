import accountAvatarIcon from "../../../assets/integrations/account-avatar.svg";

export function IntegrationAccountRow({
  account,
  className = "py-[22px]",
}: {
  account: string;
  accountType: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <img src={accountAvatarIcon} alt="" className="h-[46px] w-[46px] shrink-0" />
      <div className="ml-[13px] min-w-0">
        <p className="truncate text-[18px] text-gray-900">{account}</p>
      </div>
      <span className="ml-auto shrink-0 rounded-full bg-[#E9F8F0] px-[14px] py-[5px] text-[12px] text-success">
        계정 확인
      </span>
    </div>
  );
}
