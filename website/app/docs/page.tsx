import Link from "next/link";

import { getAllDocs } from "@/lib/docs";

export const dynamic = "force-static";

export default function DocsIndexPage() {
  const docs = getAllDocs();
  const guides = docs;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
          Documentation
        </h1>
        <p className="text-muted-foreground mb-8">
          These pages are sourced from the repository <code>docs/</code> folder.
        </p>

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents found in <code>docs/</code>. Add .md or .txt files to
            populate this section.
          </p>
        ) : (
          <ul className="space-y-3">
            {guides.map(doc => (
              <li
                key={doc.slug}
                className="border rounded-lg p-4 hover:bg-muted/50"
              >
                <Link href={`/docs/${doc.slug}`} className="font-medium">
                  {doc.title}
                </Link>
                <div className="text-xs text-muted-foreground mt-1">
                  {doc.filename}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
