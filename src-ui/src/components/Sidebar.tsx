type TabType = 'proxy' | 'server' | 'client' | 'udp' | 'ws-server' | 'ws-client';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenConfig?: () => void;
}

const navItems: { key: TabType; label: string }[] = [
  { key: 'proxy', label: '代理' },
  { key: 'server', label: '服务端' },
  { key: 'client', label: '客户端' },
  { key: 'udp', label: 'UDP' },
  { key: 'ws-server', label: 'WS 服务' },
  { key: 'ws-client', label: 'WS 客户' },
];

function NavItem({ 
  label, 
  active, 
  onClick 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-3 py-2 rounded cursor-pointer
        font-mono text-[13px] transition-all text-left
        ${active 
          ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] font-medium' 
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
        }
      `}
    >
      <span className={`text-xs w-3 ${active ? 'text-[var(--color-accent)]' : 'text-transparent'}`}>
        {active ? '>' : ' '}
      </span>
      <span>{label}</span>
    </button>
  );
}

function ToolButton({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: string; 
  label: string; 
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        w-full flex items-center gap-2 px-3 py-2 rounded
        bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
        font-mono text-xs text-[var(--color-text-muted)]
        transition-all text-left
      "
    >
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="w-[240px] h-full flex flex-col bg-[var(--color-bg-primary)] border-r border-[var(--color-bg-elevated)]">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="text-[var(--color-accent)] font-mono text-2xl font-semibold">~</span>
        <span className="text-[var(--color-text-primary)] font-mono text-base font-semibold">netforge</span>
      </div>

      <nav className="px-6 py-4">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavItem
              key={item.key}
              label={item.label}
              active={activeTab === item.key}
              onClick={() => setActiveTab(item.key)}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}

export type { TabType };
