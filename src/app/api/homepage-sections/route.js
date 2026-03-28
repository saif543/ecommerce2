// Homepage Sections & Video API
// Controls what product sections appear on the homepage and the video section config
import { NextResponse } from "next/server";
import {
  verifyApiToken,
  requireRole,
  createAuthError,
  checkRateLimit,
} from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { setRedisData, getRedisData, R_1HRS } from "@/lib/redis";

const writeRequestCounts = new Map();
const WRITE_RATE_LIMIT = 30;
const WRITE_WINDOW_MS = 15 * 60 * 1000;

function getClientIP(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function checkWriteRateLimit(req) {
  const ip = getClientIP(req);
  const now = Date.now();
  const current = writeRequestCounts.get(ip) || { count: 0, timestamp: now };
  if (current.timestamp < now - WRITE_WINDOW_MS) {
    current.count = 1;
    current.timestamp = now;
  } else current.count++;
  writeRequestCounts.set(ip, current);
  if (current.count > WRITE_RATE_LIMIT)
    throw new Error("Too many write requests");
}

// ── GET: Fetch all sections + video config (Public) ──
export async function GET(req) {
  try {
    await checkRateLimit(req);
    const client = await clientPromise;
    const db = client.db("ECOM2");
    const CACHE_KEY = `homepage_sections`;
    const CACHE_HS = await getRedisData(CACHE_KEY);
    if (CACHE_HS) {
      return NextResponse.json(CACHE_HS, { status: 200 });
    }

    const sections = await db
      .collection("homepage_sections")
      .find({})
      .sort({ order: 1 })
      .toArray();

    const videoDoc = await db.collection("homepage_video").findOne({});

    const result = {
      success: true,
      sections: sections || [],
      video: videoDoc || null,
    };
    await setRedisData(CACHE_KEY, result, R_1HRS);

    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ GET /api/homepage-sections error:", err);
    return NextResponse.json(
      { error: "Failed to fetch homepage sections" },
      { status: 500 },
    );
  }
}

// ── PUT: Create or update a section or video config (Admin only) ──
export async function PUT(req) {
  let user = null;
  try {
    await checkRateLimit(req);
    checkWriteRateLimit(req);
    user = await verifyApiToken(req);
    requireRole(user, ["admin"]);
  } catch (authErr) {
    return createAuthError(
      authErr.message,
      authErr.message.includes("rate") ? 429 : 401,
    );
  }

  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db("ECOM2");

    // Handle video config update
    if (body.type === "video") {
      const videoData = {
        youtubeUrl: (body.youtubeUrl || "").trim(),
        title: (body.title || "Watch & Explore").trim(),
        subtitle: (body.subtitle || "See our products in action").trim(),
        isActive: body.isActive !== false,
        updatedAt: new Date(),
        updatedBy: user.dbUserId || user.userId,
      };
      await db
        .collection("homepage_video")
        .updateOne(
          {},
          { $set: videoData, $setOnInsert: { createdAt: new Date() } },
          { upsert: true },
        );
      const updated = await db.collection("homepage_video").findOne({});
      return NextResponse.json({ success: true, video: updated });
    }

    // Handle section upsert
    if (!body.id) {
      // Create new section
      const newSection = {
        id: `section-${Date.now()}`,
        order: typeof body.order === "number" ? body.order : 99,
        title: (body.title || "Products").trim(),
        subtitle: (body.subtitle || "").trim(),
        filterType: body.filterType || "flag", // 'flag' | 'category'
        filterValue: (body.filterValue || "isLovedProduct").trim(),
        productLimit: Math.min(
          20,
          Math.max(4, parseInt(body.productLimit) || 8),
        ),
        bg: body.bg || "bg-white",
        sectionBannerKey: (body.sectionBannerKey || "").trim(),
        bannerGradient: (
          body.bannerGradient ||
          "linear-gradient(135deg, #111111 0%, #1a1a1a 40%, #222222 100%)"
        ).trim(),
        seeAllLink: (body.seeAllLink || "/products").trim(),
        isActive: body.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.dbUserId || user.userId,
      };
      await db.collection("homepage_sections").insertOne(newSection);
      return NextResponse.json({ success: true, section: newSection });
    }

    // Update existing section
    const updateData = {
      updatedAt: new Date(),
      updatedBy: user.dbUserId || user.userId,
    };
    const allowedFields = [
      "order",
      "title",
      "subtitle",
      "filterType",
      "filterValue",
      "productLimit",
      "bg",
      "sectionBannerKey",
      "bannerGradient",
      "seeAllLink",
      "isActive",
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] =
          field === "productLimit"
            ? Math.min(20, Math.max(4, parseInt(body[field]) || 8))
            : body[field];
      }
    }

    await db
      .collection("homepage_sections")
      .updateOne({ id: body.id }, { $set: updateData });
    const updated = await db
      .collection("homepage_sections")
      .findOne({ id: body.id });
    return NextResponse.json({ success: true, section: updated });
  } catch (err) {
    console.error("❌ PUT /api/homepage-sections error:", err);
    return NextResponse.json(
      { error: "Failed to save section" },
      { status: 500 },
    );
  }
}

// ── DELETE: Remove a section (Admin only) ──
export async function DELETE(req) {
  let user = null;
  try {
    await checkRateLimit(req);
    checkWriteRateLimit(req);
    user = await verifyApiToken(req);
    requireRole(user, ["admin"]);
  } catch (authErr) {
    return createAuthError(
      authErr.message,
      authErr.message.includes("rate") ? 429 : 401,
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const result = await db.collection("homepage_sections").deleteOne({ id });
    if (result.deletedCount === 0)
      return NextResponse.json({ error: "Section not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Section deleted" });
  } catch (err) {
    console.error("❌ DELETE /api/homepage-sections error:", err);
    return NextResponse.json(
      { error: "Failed to delete section" },
      { status: 500 },
    );
  }
}
