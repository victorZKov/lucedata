import { notFound } from "next/navigation";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getAllDocs, getDocBySlug } from "@/lib/docs";

export const dynamic = "force-static";

export function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map(d => ({ slug: d.slug }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getDocBySlug(slug);
  if (!data) return notFound();

  const { meta, content } = data;

  const plugins = [remarkGfm] as unknown as never[];

  return (
    <article className="prose prose-slate max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 dark:prose-invert prose-headings:scroll-mt-20">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{meta.title}</h1>
      <div className="overflow-x-auto">
        <ReactMarkdown
          remarkPlugins={plugins}
          components={{
            table: props => (
              <table
                className="w-full table-auto border-collapse my-4"
                {...props}
              />
            ),
            thead: props => <thead className="bg-muted/40" {...props} />,
            th: props => (
              <th
                className="border px-3 py-2 text-left font-semibold"
                {...props}
              />
            ),
            td: props => (
              <td className="border px-3 py-2 align-top" {...props} />
            ),
            ul: props => <ul className="list-disc pl-6 my-4" {...props} />,
            ol: props => <ol className="list-decimal pl-6 my-4" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
