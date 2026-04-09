"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";

interface WikiSource {
  title: string;
  url: string | null;
}

interface WikiConcept {
  display: string;
  links: string[];
  description: string;
}

interface WikiConnection {
  display: string;
  links: string[];
}

interface WikiSections {
  overview: string;
  key_concepts: WikiConcept[];
  key_concepts_raw: string;
  current_understanding: string;
  open_questions: string[];
  connections: WikiConnection[];
  sources: WikiSource[];
  sources_raw: string;
  gaps: string[];
  subcategories: { display: string; links: string[] }[];
}

interface WikiPage {
  slug: string;
  title: string;
  type: string;
  parent: string | null;
  depth: string;
  sources: number;
  created: string;
  updated: string;
  sections: WikiSections;
  raw_content: string;
  contradictions?: number;
}

const DEPTH_STYLE: Record<string, string> = {
  deep: "bg-green-100 text-green-700",
  working: "bg-amber-100 text-amber-700",
  surface: "bg-gray-100 text-gray-600",
};

const PILL_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-teal-100 text-teal-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-cyan-100 text-cyan-700",
];

function pillColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return PILL_COLORS[Math.abs(hash) % PILL_COLORS.length] ?? "bg-blue-100 text-blue-700";
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5 mt-5 first:mt-0">
      {children}
    </p>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8" id={id}>
      <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function WikiPageDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/learning/wiki/page?name=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error || d.detail) throw new Error(d.error ?? d.detail);
        setPage(d.page);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Build TOC items based on what sections have content
  const tocItems = page
    ? [
        page.sections.overview && { id: "overview", label: "Overview" },
        page.sections.key_concepts.length > 0 && { id: "key-concepts", label: "Key concepts" },
        page.sections.current_understanding && { id: "current-understanding", label: "Current understanding" },
        page.sections.open_questions.length > 0 && { id: "open-questions", label: "Open questions" },
        page.sections.connections.length > 0 && { id: "connections", label: "Connections" },
        page.sections.sources.length > 0 && { id: "sources", label: "Sources" },
        page.sections.gaps.length > 0 && { id: "gaps", label: "Gaps" },
        page.sections.subcategories.length > 0 && { id: "subcategories", label: "Subcategories" },
      ].filter(Boolean) as { id: string; label: string }[]
    : [];

  const updatedLabel = page?.updated
    ? (() => {
        const d = new Date(page.updated);
        const today = new Date();
        const isToday =
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
        return isToday ? "Updated today" : `Updated ${page.updated.slice(0, 10)}`;
      })()
    : null;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans text-sm">
      {/* Navbar */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-4 px-5 h-12">
          <Link href="/wiki" className="font-bold text-base text-gray-900 shrink-0">
            Techapedia
          </Link>
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search your knowledge bank..."
              className="w-full border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            />
          </div>
          <nav className="flex items-center gap-5 ml-auto text-sm">
            <Link href="/wiki" className="font-medium text-gray-900">Wiki</Link>
            <Link href="/app" className="text-gray-500 hover:text-gray-900">Chat</Link>
            <span className="text-gray-400 cursor-not-allowed">Digest</span>
            <div className="w-7 h-7 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center font-semibold select-none shrink-0">
              U
            </div>
          </nav>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-44 shrink-0 border-r border-gray-200 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto py-4 px-4">
          {tocItems.length > 0 && (
            <>
              <SidebarLabel>On this page</SidebarLabel>
              <ul className="space-y-1">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-blue-600 hover:underline">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          {page && page.sections.subcategories.length > 0 && (
            <>
              <SidebarLabel>Subcategories</SidebarLabel>
              <ul className="space-y-1">
                {page.sections.subcategories.map((sub, i) => (
                  <li key={i}>
                    {sub.links.length > 0 ? (
                      <Link href={`/wiki/${sub.links[0] ?? ""}`} className="text-blue-600 hover:underline">
                        {sub.display}
                      </Link>
                    ) : (
                      <span className="text-gray-600">{sub.display}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {page && (
            <>
              <SidebarLabel>Stats</SidebarLabel>
              <ul className="space-y-0.5 text-gray-600 text-xs">
                {page.sources > 0 && (
                  <li>{page.sources} source{page.sources !== 1 ? "s" : ""}</li>
                )}
                {page.depth && <li>depth: {page.depth}</li>}
                {updatedLabel && <li>{updatedLabel}</li>}
                {page.contradictions != null && page.contradictions > 0 && (
                  <li>{page.contradictions} contradiction{page.contradictions !== 1 ? "s" : ""}</li>
                )}
              </ul>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-10 py-8 max-w-4xl">
          {/* Loading */}
          {loading && (
            <div className="space-y-4">
              <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
              <div className="h-9 w-64 bg-gray-100 rounded animate-pulse mt-2" />
              <div className="h-32 bg-gray-100 rounded mt-8 animate-pulse" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-red-600 text-sm max-w-xl">
              {error.includes("not found") || error.includes("404")
                ? `No wiki page for "${slug}" yet. Memorize some URLs in this category first.`
                : error}
            </div>
          )}

          {/* Page content */}
          {page && (
            <>
              {/* Breadcrumb */}
              <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                <Link href="/wiki" className="text-blue-600 hover:underline">
                  Techapedia
                </Link>
                {page.parent && (
                  <>
                    <span>›</span>
                    <Link href={`/wiki/${page.parent}`} className="text-blue-600 hover:underline">
                      {page.parent}
                    </Link>
                  </>
                )}
                <span>›</span>
                <span className="text-gray-700">{page.title || slug}</span>
              </nav>

              {/* Title + TOC (float layout) */}
              <div className="overflow-hidden">
                {/* Floating TOC box */}
                {tocItems.length > 1 && (
                  <div className="float-right ml-8 mb-6 w-52 border border-gray-200 rounded bg-gray-50 p-3 text-sm">
                    <p className="font-semibold text-gray-800 mb-2">Contents</p>
                    <ol className="space-y-1">
                      {tocItems.map((item, i) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {i + 1}. {item.label}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Title */}
                <h1 className="text-4xl font-serif font-normal text-gray-900 mb-2">
                  {page.title || slug}
                </h1>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  {page.depth && (
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${DEPTH_STYLE[page.depth] ?? DEPTH_STYLE.working}`}
                    >
                      {page.depth}
                    </span>
                  )}
                  {page.sources > 0 && (
                    <span className="text-gray-500 text-xs">
                      {page.sources} source{page.sources !== 1 ? "s" : ""}
                    </span>
                  )}
                  {page.updated && (
                    <span className="text-gray-500 text-xs">{updatedLabel}</span>
                  )}
                </div>
              </div>

              {/* Overview */}
              {page.sections.overview && (
                <Section id="overview" title="Overview">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {page.sections.overview}
                  </p>
                </Section>
              )}

              {/* Key Concepts */}
              {page.sections.key_concepts.length > 0 && (
                <Section id="key-concepts" title="Key concepts">
                  <ul className="space-y-2.5">
                    {page.sections.key_concepts.map((concept, i) => {
                      const linkSlug = concept.links[0] ?? null;
                      const displayName = linkSlug ?? concept.display;
                      const color = pillColor(displayName);
                      return (
                        <li key={i} className="flex items-baseline gap-2 flex-wrap">
                          {linkSlug ? (
                            <Link
                              href={`/wiki/${linkSlug}`}
                              className={`inline-block text-xs font-medium px-2 py-0.5 rounded shrink-0 ${color}`}
                            >
                              {displayName}
                            </Link>
                          ) : (
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded shrink-0 ${color}`}>
                              {displayName}
                            </span>
                          )}
                          {concept.description && (
                            <span className="text-gray-700 leading-relaxed">
                              {" "}— {concept.description}
                              {/* Render additional links inside description (e.g. "See also: [[RAG]]") */}
                              {concept.links.slice(1).map((extra, j) => (
                                <span key={j}>
                                  {" "}
                                  <Link
                                    href={`/wiki/${extra}`}
                                    className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${pillColor(extra)}`}
                                  >
                                    {extra}
                                  </Link>
                                </span>
                              ))}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}

              {/* Current Understanding */}
              {page.sections.current_understanding && (
                <Section id="current-understanding" title="Current understanding">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {page.sections.current_understanding}
                  </p>
                </Section>
              )}

              {/* Open Questions */}
              {page.sections.open_questions.length > 0 && (
                <Section id="open-questions" title="Open questions">
                  <ul className="space-y-2">
                    {page.sections.open_questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-gray-400 mt-0.5 shrink-0">?</span>
                        <span className="leading-relaxed">{q}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Connections */}
              {page.sections.connections.length > 0 && (
                <Section id="connections" title="Connections">
                  <ul className="space-y-2">
                    {page.sections.connections.map((conn, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-gray-400 mt-0.5 shrink-0">→</span>
                        <span className="leading-relaxed">
                          {conn.links.slice(0, 1).map((slug) => (
                            <Link
                              key={slug}
                              href={`/wiki/${slug}`}
                              className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded mr-1.5 ${pillColor(slug)}`}
                            >
                              {slug}
                            </Link>
                          ))}
                          {conn.display.replace(/\[\[[^\]]+\]\]/g, "").trim()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Sources */}
              {page.sections.sources.length > 0 && (
                <Section id="sources" title="Sources">
                  <ul className="space-y-2">
                    {page.sections.sources.map((src, i) => (
                      <li key={i} className="text-gray-700">
                        {src.url ? (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {src.title || src.url}
                          </a>
                        ) : (
                          <span>{src.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Gaps */}
              {page.sections.gaps.length > 0 && (
                <Section id="gaps" title="Gaps">
                  <ul className="space-y-2">
                    {page.sections.gaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-gray-400 mt-0.5 shrink-0">·</span>
                        <span className="leading-relaxed">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Subcategories */}
              {page.sections.subcategories.length > 0 && (
                <Section id="subcategories" title="Subcategories">
                  <div className="flex flex-wrap gap-2">
                    {page.sections.subcategories.map((sub, i) => (
                      <div key={i}>
                        {sub.links.length > 0 ? (
                          <Link
                            href={`/wiki/${sub.links[0] ?? ""}`}
                            className="inline-block border border-gray-200 rounded px-3 py-1.5 text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors text-xs"
                          >
                            {sub.display}
                          </Link>
                        ) : (
                          <span className="inline-block border border-gray-200 rounded px-3 py-1.5 text-gray-600 text-xs">
                            {sub.display}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Empty state */}
              {!page.sections.overview &&
                page.sections.key_concepts.length === 0 &&
                page.sections.open_questions.length === 0 && (
                  <div className="mt-8 rounded border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
                    This page exists but has no content yet. Memorize some URLs in this category to
                    populate it.
                  </div>
                )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
