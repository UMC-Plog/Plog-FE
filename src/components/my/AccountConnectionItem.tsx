import { cn } from "../../lib/utils";
import type { IntegrationProvider } from "../../store/integrationStore";

interface AccountConnectionItemProps {
  provider: IntegrationProvider;
  name: string;
  description?: string;
  icon: string;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function AccountConnectionItem({
  provider,
  name,
  description,
  icon,
  connected,
  onConnect,
  onDisconnect,
}: AccountConnectionItemProps) {
  return (
    <li className="flex min-h-[61px] items-center gap-3 px-4" data-provider={provider}>
      <img
        src={icon}
        alt={`${name} 로고`}
        className={cn(
          "h-8 w-8 shrink-0 rounded-md object-contain",
          provider === "notion" && "bg-white p-2"
        )}
      />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-body font-normal text-gray-900">{name}</strong>
        {description && (
          <span className="mt-0.5 block truncate text-caption font-normal text-gray-400">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={connected ? onDisconnect : onConnect}
        aria-label={connected ? `${name} 계정 연동 해지` : `${name} 계정 연동하기`}
        className={cn(
          "h-[26px] shrink-0 rounded-full px-3 text-caption transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1",
          connected
            ? "bg-success/10 text-success hover:bg-success/20"
            : "bg-error/10 text-error hover:bg-error/20"
        )}
      >
        {connected ? "연동" : "미연동"}
      </button>
    </li>
  );
}
