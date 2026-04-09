"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Subcategory {
  slug: string;
  name: string;
  description: string;
}

interface Category {
  name: string;
  slug: string;
  description: string;
  depth?: string;
  subcategories: Subcategory[];
}

interface Concept {
  slug: string;
  name: string;
  used_by: string[];
}

interface WikiIndex {
  categories: Category[];
  concepts: Concept[];
  total_pages: number;
  total_sources: number;
  total_concepts: number;
  updated: string;
}

const DEPTH_STYLE: Record<string, string> = {
  deep: "bg-green-100 text-green-700",
  working: "bg-amber-100 text-amber-700",
  surface: "bg-gray-100 text-gray-600",
};

function DepthBadge({ depth }: { depth: string }) {
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${DEPTH_STYLE[depth] ?? DEPTH_STYLE.working}`}>
      {depth}
    </span>
  );
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5 mt-5 first:mt-0">
      {children}
    </p>
  );
}

export default function WikiIndexPage() {
  const [data, setData] = useState<WikiIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/learning/wiki/index")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filteredCategories = (data?.categories ?? []).filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
  );
  const filteredConcepts = (data?.concepts ?? []).filter(
    (c) => !q || c.name.toLowerCase().includes(q)
  );

  const updatedLabel = data?.updated
    ? (() => {
        const d = new Date(data.updated);
        const today = new Date();
        const isToday =
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
        return isToday ? "Updated today" : `Updated ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
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
          <input
            type="text"
            placeholder="Search your knowledge bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-xs border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />
          <nav className="flex items-center gap-5 ml-auto text-sm">
            <span className="font-medium text-gray-900">Wiki</span>
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
        <aside className="w-44 shrink-0 border-r border-gray-200 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto py-4 px-4 space-y-0">
          <SidebarLabel>Navigation</SidebarLabel>
          <ul className="space-y-1 mb-0">
            <li>
              <Link href="/wiki" className="text-blue-600 hover:underline font-medium">
                Main page
              </Link>
            </li>
            <li className="text-gray-400">Random article</li>
          </ul>

          {data && data.categories.length > 0 && (
            <>
              <SidebarLabel>Categories</SidebarLabel>
              <ul className="space-y-1">
                {data.categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link href={`/wiki/${cat.slug}`} className="text-blue-600 hover:underline">
                      {cat.name}
                    </Link>
                    {cat.subcategories.map((sub) => (
                      <div key={sub.slug} className="pl-3 mt-0.5 flex items-center gap-0.5">
                        <span className="text-gray-400">—</span>
                        <Link href={`/wiki/${sub.slug}`} className="text-blue-600 hover:underline text-xs ml-1">
                          {sub.name}
                        </Link>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </>
          )}

          {data && data.concepts.length > 0 && (
            <>
              <SidebarLabel>Concepts</SidebarLabel>
              <ul className="space-y-1">
                {data.concepts.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/wiki/${c.slug}`} className="text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data && (
            <>
              <SidebarLabel>Stats</SidebarLabel>
              <ul className="space-y-0.5 text-gray-600 text-xs">
                <li>{data.total_pages} pages</li>
                <li>{data.total_sources} sources</li>
                {data.total_concepts > 0 && <li>{data.total_concepts} concept pages</li>}
                {updatedLabel && <li>{updatedLabel}</li>}
              </ul>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-10 py-8 max-w-4xl">
          {loading && (
            <div className="space-y-3">
              <div className="h-9 w-72 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-4 mt-8 max-w-2xl">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-36 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-red-600 text-sm max-w-xl">
              {error}
            </div>
          )}

          {data && (
            <>
              <h1 className="text-4xl font-serif font-normal mb-1 text-gray-900">
                Welcome to Techapedia
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                Your personal learning encyclopedia —{" "}
                {data.total_pages} articles across {data.categories.length} categories
                {data.total_sources > 0 && ` · ${data.total_sources} sources ingested`}
              </p>

              {(filteredCategories.length > 0 || filteredConcepts.length > 0) && (
                <>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Browse by category</h2>
                  <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    {filteredCategories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/wiki/${cat.slug}`}
                        className="block border border-gray-200 rounded-lg p-4 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">{cat.name}</span>
                          {cat.depth && <DepthBadge depth={cat.depth} />}
                        </div>
                        {cat.description && (
                          <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-4">
                            {cat.description}
                          </p>
                        )}
                        {cat.subcategories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-blue-700 font-medium">
                              {cat.slug}
                            </span>
                            {cat.subcategories.slice(0, 3).map((sub) => (
                              <span
                                key={sub.slug}
                                className="text-xs px-2 py-0.5 rounded bg-gray-100 text-blue-700 font-medium"
                              >
                                {sub.slug}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    ))}

                    {filteredConcepts.length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold text-gray-900 mb-2">Concept pages</div>
                        <p className="text-xs text-gray-500 leading-relaxed mb-3">
                          Auto-created cross-category concepts referenced across multiple articles.
                        </p>
                        <ul className="space-y-1">
                          {filteredConcepts.map((c) => (
                            <li key={c.slug}>
                              <Link
                                href={`/wiki/${c.slug}`}
                                className="text-blue-600 hover:underline"
                              >
                                {c.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}

              {filteredCategories.length === 0 && filteredConcepts.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  {search ? (
                    <p>No results for &ldquo;{search}&rdquo;</p>
                  ) : (
                    <>
                      <p className="text-lg mb-2">No categories yet</p>
                      <p className="text-sm">
                        Send a URL to Lumen to start building your knowledge base.
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
