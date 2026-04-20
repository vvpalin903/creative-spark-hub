import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";

interface DashboardSection {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Props {
  title: string;
  sections: DashboardSection[];
  children: ReactNode;
}

export function DashboardLayout({ title, sections, children }: Props) {
  return (
    <Layout>
      <div className="container py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          <aside className="md:sticky md:top-20 md:self-start">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {sections.map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )
                  }
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </Layout>
  );
}
