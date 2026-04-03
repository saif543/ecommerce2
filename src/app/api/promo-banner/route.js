// Promo Banner API - Admin-controlled promotional banner on homepage
import { NextResponse } from "next/server";
import {
  verifyApiToken,
  requireRole,
  createAuthError,
  checkRateLimit,
} from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { setRedisData, getRedisData, R_1HRS } from "@/lib/redis";

const COLLECTION = "promo_banner";
const CACHE_KEY = "promo_banner";

// ── GET: Fetch promo banner (Public) ──
export async function GET(req) {
  try {
    await checkRateLimit(req);

    const cached = await getRedisData(CACHE_KEY);
    if (cached) return NextResponse.json(cached, { status: 200 });

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const banner = await db.collection(COLLECTION).findOne({ active: true });

    const result = {
      success: true,
      banner: banner
        ? {
            badge: banner.badge || "",
            title: banner.title || "",
            highlight: banner.highlight || "",
            description: banner.description || "",
            primaryButtonText: banner.primaryButtonText || "",
            primaryButtonLink: banner.primaryButtonLink || "",
            secondaryButtonText: banner.secondaryButtonText || "",
            secondaryButtonLink: banner.secondaryButtonLink || "",
            active: banner.active,
          }
        : null,
    };

    await setRedisData(CACHE_KEY, result, R_1HRS);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error.message?.includes("Rate limit")) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    console.error("GET /api/promo-banner error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo banner" },
      { status: 500 }
    );
  }
}

// ── PUT: Create or update promo banner (Admin only) ──
export async function PUT(req) {
  try {
    await checkRateLimit(req);
    const authResult = await verifyApiToken(req);
    requireRole(authResult, ["admin"]);

    const body = await req.json();
    const {
      badge = "",
      title = "",
      highlight = "",
      description = "",
      primaryButtonText = "",
      primaryButtonLink = "",
      secondaryButtonText = "",
      secondaryButtonLink = "",
      active = true,
    } = body;

    if (!title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("ECOM2");

    const updateData = {
      badge: badge.trim(),
      title: title.trim(),
      highlight: highlight.trim(),
      description: description.trim(),
      primaryButtonText: primaryButtonText.trim(),
      primaryButtonLink: primaryButtonLink.trim(),
      secondaryButtonText: secondaryButtonText.trim(),
      secondaryButtonLink: secondaryButtonLink.trim(),
      active,
      updatedAt: new Date(),
    };

    // Upsert — only one promo banner at a time
    const result = await db.collection(COLLECTION).findOneAndUpdate(
      {},
      { $set: updateData, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after" }
    );

    // Clear cache
    await setRedisData(CACHE_KEY, null, 1);

    return NextResponse.json(
      { success: true, banner: result },
      { status: 200 }
    );
  } catch (error) {
    if (error.message?.includes("Authentication") || error.message?.includes("Token") || error.message?.includes("Access denied")) {
      return createAuthError(error.message, 401);
    }
    console.error("PUT /api/promo-banner error:", error);
    return NextResponse.json(
      { error: "Failed to update promo banner" },
      { status: 500 }
    );
  }
}
