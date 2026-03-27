import { Header } from "@/components/header";
import { getAllDocs } from "@/lib/docs";
import { SidebarLink } from "@/components/docs/SidebarLink";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const docs = getAllDocs();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="md:sticky md:top-20 h-max">
            <nav className="space-y-1">
              {docs.map(doc => (
                <SidebarLink
                  key={doc.slug}
                  href={`/docs/${doc.slug}`}
                  label={doc.title}
                />
              ))}
            </nav>
          </aside>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
