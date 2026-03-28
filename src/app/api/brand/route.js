// Brand API - Firebase Token Authentication
// Brand management: name + logo (Admin CRUD, Public GET)
import { NextResponse } from "next/server";
import {
  verifyApiToken,
  requireRole,
  createAuthError,
  checkRateLimit,
} from "@/lib/auth";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import clientPromise from "@/lib/mongodb";
import { setRedisData, getRedisData, R_1HRS } from "@/lib/redis";

// 🔐 SECURITY CONSTANTS
const MAX_NAME_LENGTH = 150;
const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100 MB

const writeRequestCounts = new Map();
const WRITE_RATE_LIMIT = 30;
const WRITE_WINDOW_MS = 15 * 60 * 1000;

function getClientIP(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
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

function sanitizeString(value, maxLength = 200) {
  if (typeof value !== "string") return null;
  return value
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .slice(0, maxLength);
}

async function logAudit(action, data, req) {
  setImmediate(async () => {
    try {
      const client = await clientPromise;
      await client
        .db("ECOM2")
        .collection("audit_logs")
        .insertOne({
          action,
          ...data,
          timestamp: new Date(),
          ipAddress: getClientIP(req),
        });
    } catch (err) {
      console.error("Audit log error:", err);
    }
  });
}

// ── GET: All brands (Public) or single brand by id ──
export async function GET(req) {
  try {
    await checkRateLimit(req);

    const { searchParams } = new URL(req.url);
    const id = sanitizeString(searchParams.get("id") || "", 100);

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const { ObjectId } = await import("mongodb");
    const CACHE_KEY = `brand:${id}`;
    const CACHE_BRAND = await getRedisData(CACHE_KEY);
    if (CACHE_BRAND) {
      return NextResponse.json(CACHE_BRAND, { status: 200 });
    }

    if (id) {
      if (id.length !== 24 || !/^[a-f0-9]+$/i.test(id)) {
        return NextResponse.json(
          { error: "Invalid brand id" },
          { status: 400 },
        );
      }
      let oid;
      try {
        oid = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { error: "Invalid brand id format" },
          { status: 400 },
        );
      }
      const brand = await db.collection("brands").findOne({ _id: oid });
      if (!brand)
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      return NextResponse.json({ brand });
    }

    const brands = await db
      .collection("brands")
      .find({})
      .sort({ name: 1 })
      .toArray();
    const result = { brands };
    await setRedisData(CACHE_KEY, result, R_1HRS);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("❌ GET /api/brand error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch brands",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── POST: Create brand with name + optional logo image (Admin only) ──
// FormData: { name, logo? (file) }
export async function POST(req) {
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
    const contentType = req.headers.get("content-type") || "";

    // ── FormData path: create brand with optional logo ──
    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/octet-stream")
    ) {
      const formData = await req.formData();
      const name = sanitizeString(formData.get("name") || "", MAX_NAME_LENGTH);
      const logoFile = formData.get("logo");

      if (!name || name.length < 1) {
        return NextResponse.json(
          { error: "Brand name is required" },
          { status: 400 },
        );
      }
      if (
        logoFile &&
        typeof logoFile !== "string" &&
        logoFile.size > MAX_IMAGE_SIZE
      ) {
        return NextResponse.json(
          { error: "Logo too large (max 100MB)" },
          { status: 400 },
        );
      }

      const { ObjectId } = await import("mongodb");
      const client = await clientPromise;
      const db = client.db("ECOM2");

      // Uniqueness check
      const existing = await db
        .collection("brands")
        .findOne({ name: { $regex: `^${name}$`, $options: "i" } });
      if (existing)
        return NextResponse.json(
          { error: `Brand "${name}" already exists` },
          { status: 409 },
        );

      let logoUrl = null;
      let logoPublicId = null;

      // Upload logo to Cloudinary if provided
      if (logoFile && typeof logoFile !== "string" && logoFile.size > 0) {
        const buffer = Buffer.from(await logoFile.arrayBuffer());
        const uploaded = await uploadImage(buffer, {
          folder: "ecom2/brands",
          publicId: `brand_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
          transformation: [
            { width: 200, height: 200, crop: "pad", background: "white" },
          ],
        });
        logoUrl = uploaded.secure_url || uploaded.url;
        logoPublicId = uploaded.publicId;
      }

      const newBrand = {
        name,
        logo: logoUrl,
        logoPublicId,
        createdBy: user.dbUserId || user.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("brands").insertOne(newBrand);
      const created = await db
        .collection("brands")
        .findOne({ _id: result.insertedId });

      logAudit(
        "BRAND_CREATED",
        {
          userId: user.userId,
          userEmail: user.email,
          brandId: result.insertedId.toString(),
          name,
        },
        req,
      );
      return NextResponse.json(
        { message: "Brand created successfully", brand: created },
        { status: 201 },
      );
    }

    // ── JSON path: quick-create brand (no logo) ──
    const contentLength = parseInt(
      req.headers.get("content-length") || "0",
      10,
    );
    if (contentLength > 20_000)
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );

    const body = await req.json();
    const name = sanitizeString(body.name || "", MAX_NAME_LENGTH);

    if (!name || name.length < 1) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const existing = await db
      .collection("brands")
      .findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (existing)
      return NextResponse.json(
        { message: "Brand already exists", brand: existing },
        { status: 200 },
      );

    const newBrand = {
      name,
      logo: null,
      logoPublicId: null,
      createdBy: user.dbUserId || user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("brands").insertOne(newBrand);
    const created = await db
      .collection("brands")
      .findOne({ _id: result.insertedId });

    logAudit(
      "BRAND_CREATED_NO_LOGO",
      { userId: user.userId, userEmail: user.email, name },
      req,
    );
    return NextResponse.json(
      { message: "Brand created successfully", brand: created },
      { status: 201 },
    );
  } catch (err) {
    console.error("❌ POST /api/brand error:", err);
    return NextResponse.json(
      {
        error: "Failed to create brand",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── PUT: Rename brand (JSON) or update logo (FormData) (Admin only) ──
// Rename: JSON    { id, name }
// Update logo:    FormData { id, logo (file) }
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
    const contentType = req.headers.get("content-type") || "";

    // ── FormData path: update brand logo ──
    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/octet-stream")
    ) {
      const formData = await req.formData();
      const id = sanitizeString(formData.get("id") || "", 100);
      const logoFile = formData.get("logo");

      if (!id)
        return NextResponse.json(
          { error: "Brand id is required" },
          { status: 400 },
        );
      if (!logoFile || typeof logoFile === "string")
        return NextResponse.json(
          { error: "Logo file is required" },
          { status: 400 },
        );
      if (logoFile.size > MAX_IMAGE_SIZE)
        return NextResponse.json(
          { error: "Logo too large (max 100MB)" },
          { status: 400 },
        );

      const { ObjectId } = await import("mongodb");
      let oid;
      try {
        oid = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { error: "Invalid brand id" },
          { status: 400 },
        );
      }

      const client = await clientPromise;
      const db = client.db("ECOM2");
      const brand = await db.collection("brands").findOne({ _id: oid });
      if (!brand)
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });

      // Delete old logo
      if (brand.logoPublicId) await deleteImage(brand.logoPublicId);

      // Upload new logo
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const uploaded = await uploadImage(buffer, {
        folder: "ecom2/brands",
        publicId: `brand_${brand.name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
        transformation: [
          { width: 200, height: 200, crop: "pad", background: "white" },
        ],
      });
      const logoUrl = uploaded.secure_url || uploaded.url;

      await db.collection("brands").updateOne(
        { _id: oid },
        {
          $set: {
            logo: logoUrl,
            logoPublicId: uploaded.publicId,
            updatedAt: new Date(),
          },
        },
      );
      const updated = await db.collection("brands").findOne({ _id: oid });

      logAudit(
        "BRAND_LOGO_UPDATED",
        { userId: user.userId, userEmail: user.email, brandId: id },
        req,
      );
      return NextResponse.json({
        message: "Brand logo updated",
        brand: updated,
      });
    }

    // ── JSON path: rename brand ──
    const contentLength = parseInt(
      req.headers.get("content-length") || "0",
      10,
    );
    if (contentLength > 20_000)
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );

    const body = await req.json();
    const id = sanitizeString(body.id || "", 100);
    const name = sanitizeString(body.name || "", MAX_NAME_LENGTH);
    const logoScale =
      body.logoScale !== undefined
        ? Math.min(200, Math.max(50, Number(body.logoScale) || 100))
        : undefined;
    const logoOffsetX =
      body.logoOffsetX !== undefined
        ? Math.min(50, Math.max(-50, Number(body.logoOffsetX) || 0))
        : undefined;
    const logoOffsetY =
      body.logoOffsetY !== undefined
        ? Math.min(50, Math.max(-50, Number(body.logoOffsetY) || 0))
        : undefined;

    if (!id)
      return NextResponse.json(
        { error: "Brand id is required" },
        { status: 400 },
      );
    if (
      !name &&
      logoScale === undefined &&
      logoOffsetX === undefined &&
      logoOffsetY === undefined
    )
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const { ObjectId } = await import("mongodb");
    let oid;
    try {
      oid = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid brand id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const brand = await db.collection("brands").findOne({ _id: oid });
    if (!brand)
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });

    const updateFields = { updatedAt: new Date() };

    if (name) {
      // Check name conflict
      const conflict = await db.collection("brands").findOne({
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: oid },
      });
      if (conflict)
        return NextResponse.json(
          { error: `Brand name "${name}" already exists` },
          { status: 409 },
        );
      updateFields.name = name;
    }
    if (logoScale !== undefined) updateFields.logoScale = logoScale;
    if (logoOffsetX !== undefined) updateFields.logoOffsetX = logoOffsetX;
    if (logoOffsetY !== undefined) updateFields.logoOffsetY = logoOffsetY;

    await db
      .collection("brands")
      .updateOne({ _id: oid }, { $set: updateFields });
    const updated = await db.collection("brands").findOne({ _id: oid });

    logAudit(
      "BRAND_UPDATED",
      {
        userId: user.userId,
        userEmail: user.email,
        brandId: id,
        updates: Object.keys(updateFields),
      },
      req,
    );
    return NextResponse.json({
      message: "Brand updated successfully",
      brand: updated,
    });
  } catch (err) {
    console.error("❌ PUT /api/brand error:", err);
    return NextResponse.json(
      {
        error: "Failed to update brand",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── DELETE: Delete brand and its Cloudinary logo (Admin only) ──
// ?id=<brandId>
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
    const id = sanitizeString(searchParams.get("id") || "", 100);

    if (!id)
      return NextResponse.json(
        { error: "Brand id is required" },
        { status: 400 },
      );

    const { ObjectId } = await import("mongodb");
    let oid;
    try {
      oid = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid brand id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const brand = await db.collection("brands").findOne({ _id: oid });
    if (!brand)
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });

    // Delete Cloudinary logo if exists
    if (brand.logoPublicId) {
      try {
        await deleteImage(brand.logoPublicId);
      } catch (e) {
        console.error("Cloudinary delete error:", e);
      }
    }

    await db.collection("brands").deleteOne({ _id: oid });
    logAudit(
      "BRAND_DELETED",
      {
        userId: user.userId,
        userEmail: user.email,
        brandId: id,
        name: brand.name,
      },
      req,
    );
    return NextResponse.json({ message: `Brand "${brand.name}" deleted` });
  } catch (err) {
    console.error("❌ DELETE /api/brand error:", err);
    return NextResponse.json(
      {
        error: "Failed to delete brand",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}
