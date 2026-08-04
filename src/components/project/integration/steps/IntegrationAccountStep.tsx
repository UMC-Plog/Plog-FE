import { IntegrationAccountRow } from "../IntegrationAccountRow";
import { PermissionIcon, type PermissionIconName } from "../../PermissionIcon";

type Permission = { title: string; desc: string; icon: PermissionIconName };

export function IntegrationAccountStep({
  account,
  accountType,
  accountRowClass,
  permissions,
}: {
  account: string;
  accountType: string;
  accountRowClass?: string;
  permissions: Permission[];
}) {
  return (
    <>
      <IntegrationAccountRow account={account} accountType={accountType} className={accountRowClass} />
      <h3 className="text-[15px] text-gray-700">요청 권한</h3>
      <div className="mt-3 rounded-[12px] border border-gray-200 px-[18px] py-[9px]">
        {permissions.map(({ title, desc, icon }) => (
          <div key={title} className="flex min-h-[56px] items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <PermissionIcon name={icon} className="h-9 w-9 text-blue-500" />
            </span>
            <div>
              <p className="text-[12px] text-gray-700">{title}</p>
              <p className="mt-1 text-[11px] text-gray-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
