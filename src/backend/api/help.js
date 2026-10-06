// api/help.js — Phase 22. Public help centre API: categories, query-time full-text search, article fetch
// (bumps viewCount), and helpfulness votes. Search ranks with Postgres to_tsvector/websearch_to_tsquery +
// ts_rank over weighted title/keywords/summary/body (no stored generated column — fits db push).
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { HELP_CATEGORIES } = require("../db/seedHelp");

// GET /topics — §22l. Six topics, each with its questions + bodies (one call powers the whole /help page).
router.get("/topics", async (req, res, next) => {
  try {
    const articles = await prisma.helpArticle.findMany({
      where: { isPublished: true },
      orderBy: [{ topic: "asc" }, { order: "asc" }],
      select: { slug: true, topic: true, title: true, summary: true, body: true },
    });
    const byTopic = new Map();
    for (const a of articles) {
      if (!byTopic.has(a.topic)) byTopic.set(a.topic, []);
      byTopic.get(a.topic).push({ slug: a.slug, title: a.title, summary: a.summary, body: a.body });
    }
    const topics = HELP_CATEGORIES.map((c) => ({ ...c, articles: byTopic.get(c.slug) || [] }));
    res.json({ topics });
  } catch (err) {
    next(err);
  }
});

// GET /top-picks — §22l. The quick-link pills for /help/contact.
router.get("/top-picks", async (req, res, next) => {
  try {
    const picks = await prisma.helpArticle.findMany({
      where: { isPublished: true, isTopPick: true },
      orderBy: { order: "asc" },
      select: { slug: true, topic: true, title: true },
    });
    res.json({ picks });
  } catch (err) {
    next(err);
  }
});

// GET /categories — the six categories + a per-category published-article count.
router.get("/categories", async (req, res, next) => {
  try {
    const counts = await prisma.helpArticle.groupBy({ by: ["category"], where: { isPublished: true }, _count: { _all: true } });
    const countMap = Object.fromEntries(counts.map((c) => [c.category, c._count._all]));
    res.json({ categories: HELP_CATEGORIES.map((c) => ({ ...c, articleCount: countMap[c.slug] || 0 })) });
  } catch (err) {
    next(err);
  }
});

// GET /search?q= — ranked full-text results.
router.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ query: q, results: [] });
    const rows = await prisma.$queryRaw`
      SELECT slug, category, title, summary,
        ts_rank(
          setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
          setweight(to_tsvector('english', array_to_string(keywords,' ')), 'B') ||
          setweight(to_tsvector('english', coalesce(summary,'')), 'C') ||
          setweight(to_tsvector('english', coalesce(body,'')), 'D'),
          websearch_to_tsquery('english', ${q})
        ) AS rank
      FROM "HelpArticle"
      WHERE "isPublished" = true
        AND (
          setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
          setweight(to_tsvector('english', array_to_string(keywords,' ')), 'B') ||
          setweight(to_tsvector('english', coalesce(summary,'')), 'C') ||
          setweight(to_tsvector('english', coalesce(body,'')), 'D')
        ) @@ websearch_to_tsquery('english', ${q})
      ORDER BY rank DESC
      LIMIT 10;`;
    res.json({ query: q, results: rows.map((r) => ({ slug: r.slug, category: r.category, title: r.title, summary: r.summary })) });
  } catch (err) {
    next(err);
  }
});

// GET /popular — the most-viewed published articles (for the help home).
router.get("/popular", async (req, res, next) => {
  try {
    const articles = await prisma.helpArticle.findMany({
      where: { isPublished: true },
      orderBy: [{ viewCount: "desc" }, { order: "asc" }],
      take: 8,
      select: { slug: true, category: true, title: true, summary: true },
    });
    res.json({ articles });
  } catch (err) {
    next(err);
  }
});

// GET /articles/:slug — one article (+ related), increments viewCount.
router.get("/articles/:slug", async (req, res, next) => {
  try {
    const article = await prisma.helpArticle.findUnique({ where: { slug: req.params.slug } });
    if (!article || !article.isPublished) return res.status(404).json({ error: { message: "Not found" } });
    prisma.helpArticle.update({ where: { slug: article.slug }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    const related = article.relatedSlugs.length
      ? await prisma.helpArticle.findMany({ where: { slug: { in: article.relatedSlugs }, isPublished: true }, select: { slug: true, category: true, title: true } })
      : [];
    const category = HELP_CATEGORIES.find((c) => c.slug === article.category) || null;
    res.json({ article: { slug: article.slug, category: article.category, title: article.title, summary: article.summary, body: article.body, updatedAt: article.updatedAt }, categoryName: category?.name || article.category, related });
  } catch (err) {
    next(err);
  }
});

// GET /category/:slug — a category's article list.
router.get("/category/:slug", async (req, res, next) => {
  try {
    const category = HELP_CATEGORIES.find((c) => c.slug === req.params.slug);
    if (!category) return res.status(404).json({ error: { message: "Not found" } });
    const articles = await prisma.helpArticle.findMany({
      where: { category: category.slug, isPublished: true },
      orderBy: { order: "asc" },
      select: { slug: true, title: true, summary: true },
    });
    res.json({ category, articles });
  } catch (err) {
    next(err);
  }
});

// POST /articles/:slug/helpful { helpful: bool }
router.post("/articles/:slug/helpful", async (req, res, next) => {
  try {
    const field = req.body?.helpful ? "helpfulYes" : "helpfulNo";
    await prisma.helpArticle.update({ where: { slug: req.params.slug }, data: { [field]: { increment: 1 } } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
