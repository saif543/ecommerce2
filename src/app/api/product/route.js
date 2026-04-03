// Product API - Firebase Token Authentication
// Full CRUD for gadgets/electronics products with enterprise security
import { NextResponse } from "next/server";
import { setRedisData, getRedisData, R_1HRS } from "@/lib/redis";
import {
  verifyApiToken,
  requireRole,
  createAuthError,
  checkRateLimit,
} from "@/lib/auth";
import {
  uploadImage,
  deleteMultipleImages,
  deleteImage,
} from "@/lib/cloudinary";
import clientPromise from "@/lib/mongodb";

// 🔐 SECURITY CONSTANTS
const MAX_IMAGE_SIZE_ADMIN = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE_USER = 5 * 1024 * 1024;
const MAX_IMAGES_PER_UPLOAD = 15;
const MAX_REQUEST_BODY_SIZE = 100_000;
const MAX_SEARCH_LENGTH = 100;
const MAX_DESCRIPTION_WORDS = 3000;
const MAX_DESCRIPTION_IMAGES = 10;

// IP-based upload tracking
const uploadTracker = new Map();
const UPLOAD_LIMIT_PER_HOUR = 50;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

// Write rate limit
const writeRequestCounts = new Map();
const WRITE_RATE_LIMIT = 30;
const WRITE_WINDOW_MS = 15 * 60 * 1000;

const ALLOWED_IMAGE_TYPES = null; // All image types are accepted
const VALID_STOCK = ["in_stock", "out_of_stock", "limited"];
const VALID_CONDITIONS = ["new", "refurbished", "open_box", "used"];

// ── Helpers ──
function getClientIP(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkUploadRateLimit(req) {
  const ip = getClientIP(req);
  const now = Date.now();
  const tracker = uploadTracker.get(ip) || { count: 0, windowStart: now };
  if (tracker.windowStart < now - UPLOAD_WINDOW_MS) {
    tracker.count = 1;
    tracker.windowStart = now;
  } else tracker.count++;
  uploadTracker.set(ip, tracker);
  if (tracker.count > UPLOAD_LIMIT_PER_HOUR)
    throw new Error("Upload rate limit exceeded");
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

function sanitizeString(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  return value
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .slice(0, maxLength);
}

function countWords(str) {
  return str ? str.trim().split(/\s+/).filter(Boolean).length : 0;
}

function isValidPrice(price) {
  return typeof price === "number" && isFinite(price) && price >= 0;
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

// Native Promise-based resolver for payload token/security handshake
const resolveSecurityPolicies = () =>
  new Promise((resolve) => setTimeout(resolve, 3000));

// ── GET: List / Filter / Single Product (Public + Admin) ──
export async function GET(req) {
  try {
    // await resolveSecurityPolicies();
    await checkRateLimit(req);
    const { searchParams } = new URL(req.url);

    let id = sanitizeString(searchParams.get("id") || "", 100);
    let search = sanitizeString(
      searchParams.get("search") || "",
      MAX_SEARCH_LENGTH,
    );
    let category = sanitizeString(searchParams.get("category") || "", 200);
    let subcategory = sanitizeString(
      searchParams.get("subcategory") || "",
      200,
    );
    let minPrice = searchParams.get("minPrice");
    let maxPrice = searchParams.get("maxPrice");
    let isNewArrival = searchParams.get("isNewArrival");
    let isLovedProduct = searchParams.get("isLovedProduct");
    let isTrending = searchParams.get("isTrending");
    let statusFilter = searchParams.get("status");
    let sliderId = sanitizeString(searchParams.get("slider") || "", 100);
    let page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    let limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );

    if (search && search.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json(
        { error: `Search query too long (max ${MAX_SEARCH_LENGTH} chars)` },
        { status: 400 },
      );
    }

    // Check if admin is requesting (bypass isActive filter)
    let isAdminRequest = false;
    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const adminUser = await verifyApiToken(req);
        if (adminUser.role === "admin") isAdminRequest = true;
      } catch {
        // Not admin, continue as public
      }
    }

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const { ObjectId } = await import("mongodb");
    const CACHE_KEY = `product:${id}:${category}:${subcategory}:${minPrice}:${maxPrice}:${isNewArrival}:${isLovedProduct}:${isTrending}:${statusFilter}:${sliderId}:${search}:${page}:${limit}`;

    const CACHE_PRODUCTS = await getRedisData(CACHE_KEY);

    // Single product by _id
    if (id) {
      if (!id || id.length !== 24 || !/^[a-f0-9]+$/i.test(id)) {
        return NextResponse.json(
          { error: "Invalid product id" },
          { status: 400 },
        );
      }
      let oid;
      try {
        oid = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { error: "Invalid product id format" },
          { status: 400 },
        );
      }
      const productQuery = isAdminRequest
        ? { _id: oid }
        : { _id: oid, isActive: true };
      const product = await db.collection("products").findOne(productQuery);
      if (!product)
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 },
        );
      return NextResponse.json({ product });
    }

    // Build filter — admin sees all products, public sees only active
    const query = isAdminRequest ? {} : { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }
    if (category) query.category = { $regex: `^${category}$`, $options: "i" };
    if (subcategory)
      query.subcategory = { $regex: `^${subcategory}$`, $options: "i" };
    if (isNewArrival === "true") query.isNewArrival = true;
    if (isLovedProduct === "true") query.isLovedProduct = true;
    if (isTrending === "true") query.isTrending = true;

    // Admin status filter
    if (isAdminRequest && statusFilter && statusFilter !== "all") {
      if (statusFilter === "active") query.isActive = true;
      else if (statusFilter === "archived") query.isActive = false;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      const min = parseFloat(minPrice);
      const max = parseFloat(maxPrice);
      if (!isNaN(min) && min >= 0) query.price.$gte = min;
      if (!isNaN(max) && max >= 0) query.price.$lte = max;
    }

    // ── Slider-based offer filtering ──
    let sliderInfo = null;
    if (sliderId) {
      const slider = await db
        .collection("sliders")
        .findOne({ id: sliderId, isActive: true });
      if (slider) {
        sliderInfo = {
          id: slider.id,
          offerType: slider.offerType,
          customOfferScope: slider.customOfferScope,
          targetBrands: slider.targetBrands || [],
          targetCategories: slider.targetCategories || [],
          globalDiscountPercentage: slider.globalDiscountPercentage,
          title: slider.title || null,
        };
        if (slider.offerType === "custom") {
          if (
            slider.customOfferScope === "brand" &&
            Array.isArray(slider.targetBrands) &&
            slider.targetBrands.length > 0
          ) {
            query.brand = {
              $in: slider.targetBrands.map((b) => new RegExp(`^${b}$`, "i")),
            };
          } else if (
            slider.customOfferScope === "category" &&
            Array.isArray(slider.targetCategories) &&
            slider.targetCategories.length > 0
          ) {
            query.category = {
              $in: slider.targetCategories.map(
                (c) => new RegExp(`^${c}$`, "i"),
              ),
            };
          }
          if (
            Array.isArray(slider.targetProducts) &&
            slider.targetProducts.length > 0
          ) {
            const { ObjectId } = await import("mongodb");
            const oids = slider.targetProducts
              .map((e) => {
                try {
                  return new ObjectId(String(e.productId));
                } catch {
                  return null;
                }
              })
              .filter(Boolean);
            if (oids.length > 0) {
              query._id = { $in: oids };
            }
            sliderInfo.targetProducts = slider.targetProducts;
          }
          if (!isAdminRequest) query.isActive = true;
        }
      }
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      db
        .collection("products")
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray(),
      db.collection("products").countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);
    const result = {
      success: true,
      products,
      sliderInfo,
      pagination: { total, page, limit, pages, totalPages: pages },
    };
    await setRedisData(CACHE_KEY, result, R_1HRS);
    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ GET /api/product error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── POST: Create Product (Admin only) ──
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
    const contentLength = parseInt(
      req.headers.get("content-length") || "0",
      10,
    );
    if (contentLength > MAX_REQUEST_BODY_SIZE)
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );

    const body = await req.json();

    // Required fields
    if (
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim().length < 2
    ) {
      return NextResponse.json(
        { error: "Product name is required (min 2 chars)" },
        { status: 400 },
      );
    }
    if (body.price === undefined || !isValidPrice(Number(body.price))) {
      return NextResponse.json(
        { error: "Valid price is required" },
        { status: 400 },
      );
    }
    if (
      !body.category ||
      typeof body.category !== "string" ||
      body.category.trim().length < 1
    ) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 },
      );
    }

    // Sanitize
    const name = sanitizeString(body.name, 200);
    const description = sanitizeString(body.description || "", 1000);
    const category = sanitizeString(body.category, 200); // free text — from admin's dynamic categories
    const subcategory = sanitizeString(body.subcategory || "", 200);
    const condition = VALID_CONDITIONS.includes(body.condition)
      ? body.condition
      : "new";
    const stock = VALID_STOCK.includes(body.stock) ? body.stock : "in_stock";
    const stockQty =
      body.stockQty !== undefined
        ? Math.max(0, parseInt(body.stockQty, 10) || 0)
        : body.inventory?.totalStock !== undefined
          ? Math.max(0, parseInt(body.inventory.totalStock, 10) || 0)
          : 0;
    const sku = sanitizeString(body.sku || "", 100);
    const brand = sanitizeString(body.brand || "", 200);
    const inventory =
      body.inventory && typeof body.inventory === "object"
        ? {
            totalStock: stockQty,
            lowStockThreshold: Math.max(
              0,
              parseInt(body.inventory.lowStockThreshold, 10) || 10,
            ),
            trackInventory: body.inventory.trackInventory !== false,
          }
        : { totalStock: stockQty, lowStockThreshold: 10, trackInventory: true };

    // Pricing:
    //   price        = regular (selling) price
    //   originalPrice = cost per item (what admin paid)
    //   discount     = sale price offered to customer
    const price = parseFloat(body.price);
    const originalPrice =
      body.originalPrice !== undefined &&
      isValidPrice(Number(body.originalPrice))
        ? parseFloat(body.originalPrice)
        : 0;
    const discount =
      body.discount !== undefined && isValidPrice(Number(body.discount))
        ? parseFloat(body.discount)
        : 0;

    const isNewArrival = body.isNewArrival === true;
    const isLovedProduct = body.isLovedProduct === true;
    const isTrending = body.isTrending === true;
    const isActive = body.isActive !== false;
    const status = ["active", "draft", "archived"].includes(body.status)
      ? body.status
      : isActive
        ? "active"
        : "draft";

    const features = Array.isArray(body.features)
      ? body.features
          .map((f) => sanitizeString(f, 300))
          .filter(Boolean)
          .slice(0, 50)
      : [];
    const specifications =
      body.specifications &&
      typeof body.specifications === "object" &&
      !Array.isArray(body.specifications)
        ? Object.fromEntries(
            Object.entries(body.specifications)
              .slice(0, 50)
              .map(([k, v]) => {
                if (typeof v === "object" && !Array.isArray(v)) {
                  return [
                    sanitizeString(k, 100),
                    Object.fromEntries(
                      Object.entries(v).map(([sk, sv]) => [
                        sanitizeString(sk, 100),
                        sanitizeString(String(sv), 300),
                      ]),
                    ),
                  ];
                }
                return [sanitizeString(k, 100), sanitizeString(String(v), 300)];
              })
              .filter(([k]) => k),
          )
        : {};

    const customFields =
      body.customFields &&
      typeof body.customFields === "object" &&
      !Array.isArray(body.customFields)
        ? Object.fromEntries(
            Object.entries(body.customFields)
              .slice(0, 30)
              .map(([k, v]) => [
                sanitizeString(k, 100),
                sanitizeString(String(v), 500),
              ])
              .filter(([k]) => k),
          )
        : {};

    // descriptions: array of { id, title, body, imageUrl, imagePublicId }
    const descriptions = Array.isArray(body.descriptions)
      ? body.descriptions
          .slice(0, 20)
          .map((s) => ({
            id: sanitizeString(String(s.id || ""), 100) || crypto.randomUUID(),
            title: sanitizeString(String(s.title || ""), 300),
            body: sanitizeString(String(s.body || ""), 10000),
            imageUrl: s.imageUrl
              ? sanitizeString(String(s.imageUrl), 500)
              : null,
            imagePublicId: s.imagePublicId
              ? sanitizeString(String(s.imagePublicId), 300)
              : null,
          }))
          .filter((s) => s.title || s.body)
      : [];

    const client = await clientPromise;
    const db = client.db("ECOM2");

    const newProduct = {
      name,
      description,
      brand,
      category,
      subcategory,
      sku,
      condition,
      stock,
      stockQty,
      inventory,
      price,
      originalPrice,
      discount,
      features,
      specifications,
      customFields,
      descriptions,
      images: [],
      isNewArrival,
      isLovedProduct,
      isTrending,
      isActive,
      status,
      createdBy: user.dbUserId || user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("products").insertOne(newProduct);
    const created = await db
      .collection("products")
      .findOne({ _id: result.insertedId });

    logAudit(
      "PRODUCT_CREATED",
      {
        userId: user.userId,
        userEmail: user.email,
        productId: result.insertedId.toString(),
        productName: name,
      },
      req,
    );
    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully",
        product: created,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("❌ POST /api/product error:", err);
    return NextResponse.json(
      {
        error: "Failed to create product",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── PUT: Update Product or Upload Images (Admin only) ──
export async function PUT(req) {
  let user = null;
  try {
    await checkRateLimit(req);
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
    const action = searchParams.get("action");
    const { ObjectId } = await import("mongodb");

    // ── Upload Images ──
    if (action === "upload-images") {
      checkUploadRateLimit(req);
      const formData = await req.formData();
      const productId = sanitizeString(formData.get("productId") || "", 100);
      if (!productId)
        return NextResponse.json(
          { error: "productId is required" },
          { status: 400 },
        );

      let oid;
      try {
        oid = new ObjectId(productId);
      } catch {
        return NextResponse.json(
          { error: "Invalid productId" },
          { status: 400 },
        );
      }

      const files = formData.getAll("files");
      if (!files?.length)
        return NextResponse.json(
          { error: "At least one file is required" },
          { status: 400 },
        );
      if (files.length > MAX_IMAGES_PER_UPLOAD) {
        return NextResponse.json(
          { error: `Max ${MAX_IMAGES_PER_UPLOAD} images per upload` },
          { status: 400 },
        );
      }

      const maxSize = MAX_IMAGE_SIZE_ADMIN; // admin only endpoint
      for (const file of files) {
        if (file.size > maxSize) {
          return NextResponse.json(
            { error: `File "${file.name}" exceeds 100MB limit` },
            { status: 400 },
          );
        }
      }

      const client = await clientPromise;
      const db = client.db("ECOM2");
      const product = await db.collection("products").findOne({ _id: oid });
      if (!product)
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 },
        );

      if (
        (product.images?.length || 0) + files.length >
        MAX_IMAGES_PER_UPLOAD
      ) {
        return NextResponse.json(
          {
            error: `Product already has ${product.images?.length} images. Max ${MAX_IMAGES_PER_UPLOAD} total.`,
          },
          { status: 400 },
        );
      }

      const isPrimarySet = (product.images?.length || 0) > 0;
      const uploadedImages = [];
      for (let i = 0; i < files.length; i++) {
        const buffer = Buffer.from(await files[i].arrayBuffer());
        const result = await uploadImage(buffer, {
          folder: "ecom2/products",
          publicId: `product_${productId}_${Date.now()}_${i}`,
          transformation: [{ width: 1200, height: 1200, crop: "limit" }],
        });
        uploadedImages.push({
          url: result.url,
          publicId: result.publicId,
          isPrimary: i === 0 && !isPrimarySet,
        });
      }

      await db.collection("products").updateOne(
        { _id: oid },
        {
          $push: { images: { $each: uploadedImages } },
          $set: { updatedAt: new Date() },
        },
      );
      const updated = await db.collection("products").findOne({ _id: oid });

      logAudit(
        "PRODUCT_IMAGES_UPLOADED",
        {
          userId: user.userId,
          userEmail: user.email,
          productId,
          count: uploadedImages.length,
        },
        req,
      );
      return NextResponse.json({
        success: true,
        message: "Images uploaded successfully",
        images: uploadedImages,
        product: updated,
      });
    }

    // ── Upload description section image ──
    if (action === "upload-description-image") {
      checkUploadRateLimit(req);
      const formData = await req.formData();
      const productId = sanitizeString(formData.get("productId") || "", 100);
      const sectionId = sanitizeString(formData.get("sectionId") || "", 100);
      const imageFile = formData.get("image");

      if (!productId || !sectionId)
        return NextResponse.json(
          { error: "productId and sectionId are required" },
          { status: 400 },
        );
      if (!imageFile || typeof imageFile === "string")
        return NextResponse.json(
          { error: "image file is required" },
          { status: 400 },
        );
      if (imageFile.size > MAX_IMAGE_SIZE_ADMIN)
        return NextResponse.json(
          { error: "Image too large (max 100MB)" },
          { status: 400 },
        );

      let oid;
      try {
        oid = new ObjectId(productId);
      } catch {
        return NextResponse.json(
          { error: "Invalid productId" },
          { status: 400 },
        );
      }

      const client = await clientPromise;
      const db = client.db("ECOM2");
      const product = await db.collection("products").findOne({ _id: oid });
      if (!product)
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 },
        );

      // Delete old image for this section if it exists
      const existingSection = (product.descriptions || []).find(
        (s) => s.id === sectionId,
      );
      if (existingSection?.imagePublicId) {
        try {
          await deleteImage(existingSection.imagePublicId);
        } catch (e) {
          console.error("Old desc image delete error:", e);
        }
      }

      // Upload new image
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const result = await uploadImage(buffer, {
        folder: "ecom2/products/descriptions",
        publicId: `desc_${productId}_${sectionId.slice(0, 8)}_${Date.now()}`,
        transformation: [{ width: 1200, crop: "limit" }],
      });
      const imageUrl = result.secure_url || result.url;
      const imagePublicId = result.publicId;

      // Update the matching section in the descriptions array
      const updatedDescriptions = (product.descriptions || []).map((s) =>
        s.id === sectionId ? { ...s, imageUrl, imagePublicId } : s,
      );
      // If section not yet in DB (new product just created), append it
      if (!updatedDescriptions.find((s) => s.id === sectionId)) {
        updatedDescriptions.push({
          id: sectionId,
          title: "",
          body: "",
          imageUrl,
          imagePublicId,
        });
      }

      await db.collection("products").updateOne(
        { _id: oid },
        {
          $set: { descriptions: updatedDescriptions, updatedAt: new Date() },
        },
      );
      logAudit(
        "PRODUCT_DESC_IMAGE_UPLOADED",
        { userId: user.userId, productId, sectionId },
        req,
      );
      return NextResponse.json({ success: true, imageUrl, imagePublicId });
    }

    // ── Delete description section image ──
    if (action === "delete-description-image") {
      const body = await req.json();
      const productId = sanitizeString(body.productId || "", 100);
      const sectionId = sanitizeString(body.sectionId || "", 100);
      const publicId = sanitizeString(body.publicId || "", 300);

      if (!productId || !sectionId || !publicId)
        return NextResponse.json(
          { error: "productId, sectionId and publicId are required" },
          { status: 400 },
        );

      let oid;
      try {
        oid = new ObjectId(productId);
      } catch {
        return NextResponse.json(
          { error: "Invalid productId" },
          { status: 400 },
        );
      }

      try {
        await deleteImage(publicId);
      } catch (e) {
        console.error("Desc image cloudinary delete error:", e);
      }

      const client = await clientPromise;
      const db = client.db("ECOM2");
      const product = await db.collection("products").findOne({ _id: oid });
      if (product) {
        const updatedDescriptions = (product.descriptions || []).map((s) =>
          s.id === sectionId
            ? { ...s, imageUrl: null, imagePublicId: null }
            : s,
        );
        await db.collection("products").updateOne(
          { _id: oid },
          {
            $set: {
              descriptions: updatedDescriptions,
              updatedAt: new Date(),
            },
          },
        );
      }
      logAudit(
        "PRODUCT_DESC_IMAGE_DELETED",
        { userId: user.userId, productId, sectionId },
        req,
      );
      return NextResponse.json({
        success: true,
        message: "Description image deleted",
      });
    }

    // ── Delete single image ──
    if (action === "delete-image") {
      const body = await req.json();
      const productId = sanitizeString(body.productId || "", 100);
      const publicId = sanitizeString(body.publicId || "", 300);
      if (!productId || !publicId)
        return NextResponse.json(
          { error: "productId and publicId are required" },
          { status: 400 },
        );

      let oid;
      try {
        oid = new ObjectId(productId);
      } catch {
        return NextResponse.json(
          { error: "Invalid productId" },
          { status: 400 },
        );
      }

      await deleteImage(publicId);
      const client = await clientPromise;
      const db = client.db("ECOM2");
      await db
        .collection("products")
        .updateOne(
          { _id: oid },
          { $pull: { images: { publicId } }, $set: { updatedAt: new Date() } },
        );
      logAudit(
        "PRODUCT_IMAGE_DELETED",
        { userId: user.userId, userEmail: user.email, productId, publicId },
        req,
      );
      return NextResponse.json({ message: "Image deleted successfully" });
    }

    // ── Standard product update ──
    const contentLength = parseInt(
      req.headers.get("content-length") || "0",
      10,
    );
    if (contentLength > MAX_REQUEST_BODY_SIZE)
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );

    const body = await req.json();
    const id = sanitizeString(body.id || "", 100);
    if (!id)
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 400 },
      );

    let oid;
    try {
      oid = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid id format" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const product = await db.collection("products").findOne({ _id: oid });
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const updateData = { updatedAt: new Date() };
    if (body.name !== undefined)
      updateData.name = sanitizeString(body.name, 200);
    if (body.description !== undefined)
      updateData.description = sanitizeString(body.description, 1000);
    if (body.brand !== undefined)
      updateData.brand = sanitizeString(body.brand || "", 200);
    if (body.category !== undefined)
      updateData.category = sanitizeString(body.category, 200);
    if (body.subcategory !== undefined)
      updateData.subcategory = sanitizeString(body.subcategory, 200);
    if (body.sku !== undefined)
      updateData.sku = sanitizeString(body.sku || "", 100);
    if (
      body.condition !== undefined &&
      VALID_CONDITIONS.includes(body.condition)
    )
      updateData.condition = body.condition;
    if (body.stock !== undefined && VALID_STOCK.includes(body.stock))
      updateData.stock = body.stock;
    if (body.stockQty !== undefined)
      updateData.stockQty = Math.max(0, parseInt(body.stockQty, 10) || 0);
    if (body.inventory !== undefined && typeof body.inventory === "object") {
      const sqty =
        body.inventory.totalStock !== undefined
          ? Math.max(0, parseInt(body.inventory.totalStock, 10) || 0)
          : updateData.stockQty || 0;
      updateData.inventory = {
        totalStock: sqty,
        lowStockThreshold: Math.max(
          0,
          parseInt(body.inventory.lowStockThreshold, 10) || 10,
        ),
        trackInventory: body.inventory.trackInventory !== false,
      };
      updateData.stockQty = sqty;
    }
    // Pricing: price=regular, originalPrice=costPerItem, discount=salePrice
    if (body.price !== undefined && isValidPrice(Number(body.price)))
      updateData.price = parseFloat(body.price);
    if (
      body.originalPrice !== undefined &&
      isValidPrice(Number(body.originalPrice))
    )
      updateData.originalPrice = parseFloat(body.originalPrice);
    if (body.discount !== undefined && isValidPrice(Number(body.discount)))
      updateData.discount = parseFloat(body.discount);
    if (body.isNewArrival !== undefined)
      updateData.isNewArrival = Boolean(body.isNewArrival);
    if (body.isLovedProduct !== undefined)
      updateData.isLovedProduct = Boolean(body.isLovedProduct);
    if (body.isTrending !== undefined)
      updateData.isTrending = Boolean(body.isTrending);
    if (body.isActive !== undefined)
      updateData.isActive = Boolean(body.isActive);
    if (
      body.status !== undefined &&
      ["active", "draft", "archived"].includes(body.status)
    ) {
      updateData.status = body.status;
    }
    if (body.features !== undefined && Array.isArray(body.features))
      updateData.features = body.features
        .map((f) => sanitizeString(f, 300))
        .filter(Boolean)
        .slice(0, 50);
    if (body.descriptions !== undefined && Array.isArray(body.descriptions)) {
      updateData.descriptions = body.descriptions
        .slice(0, 20)
        .map((s) => ({
          id: sanitizeString(String(s.id || ""), 100) || crypto.randomUUID(),
          title: sanitizeString(String(s.title || ""), 300),
          body: sanitizeString(String(s.body || ""), 10000),
          imageUrl: s.imageUrl ? sanitizeString(String(s.imageUrl), 500) : null,
          imagePublicId: s.imagePublicId
            ? sanitizeString(String(s.imagePublicId), 300)
            : null,
        }))
        .filter((s) => s.title || s.body);
    }
    if (
      body.customFields !== undefined &&
      typeof body.customFields === "object" &&
      !Array.isArray(body.customFields)
    ) {
      updateData.customFields = Object.fromEntries(
        Object.entries(body.customFields)
          .slice(0, 30)
          .map(([k, v]) => [
            sanitizeString(k, 100),
            sanitizeString(String(v), 500),
          ])
          .filter(([k]) => k),
      );
    }
    if (
      body.specifications &&
      typeof body.specifications === "object" &&
      !Array.isArray(body.specifications)
    ) {
      updateData.specifications = Object.fromEntries(
        Object.entries(body.specifications)
          .slice(0, 50)
          .map(([k, v]) => {
            if (typeof v === "object" && !Array.isArray(v)) {
              return [
                sanitizeString(k, 100),
                Object.fromEntries(
                  Object.entries(v).map(([sk, sv]) => [
                    sanitizeString(sk, 100),
                    sanitizeString(String(sv), 300),
                  ]),
                ),
              ];
            }
            return [sanitizeString(k, 100), sanitizeString(String(v), 300)];
          })
          .filter(([k]) => k),
      );
    }

    await db
      .collection("products")
      .updateOne({ _id: oid }, { $set: updateData });
    const updated = await db.collection("products").findOne({ _id: oid });

    logAudit(
      "PRODUCT_UPDATED",
      {
        userId: user.userId,
        userEmail: user.email,
        productId: id,
        updatedFields: Object.keys(updateData),
      },
      req,
    );
    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      product: updated,
    });
  } catch (err) {
    console.error("❌ PUT /api/product error:", err);
    return NextResponse.json(
      {
        error: "Failed to update product",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── DELETE: Soft-delete or hard-delete (Admin only) ──
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
    const hardDelete = searchParams.get("hard") === "true";

    if (!id)
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 400 },
      );

    const { ObjectId } = await import("mongodb");
    let oid;
    try {
      oid = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid id format" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const product = await db.collection("products").findOne({ _id: oid });
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });

    if (hardDelete) {
      if (product.images?.length) {
        const publicIds = product.images
          .map((img) => img.publicId)
          .filter(Boolean);
        if (publicIds.length) await deleteMultipleImages(publicIds);
      }
      await db.collection("products").deleteOne({ _id: oid });
      logAudit(
        "PRODUCT_HARD_DELETED",
        {
          userId: user.userId,
          userEmail: user.email,
          productId: id,
          name: product.name,
        },
        req,
      );
      return NextResponse.json({ message: "Product permanently deleted" });
    }

    await db
      .collection("products")
      .updateOne(
        { _id: oid },
        { $set: { isActive: false, updatedAt: new Date() } },
      );
    logAudit(
      "PRODUCT_SOFT_DELETED",
      {
        userId: user.userId,
        userEmail: user.email,
        productId: id,
        name: product.name,
      },
      req,
    );
    return NextResponse.json({ message: "Product deactivated successfully" });
  } catch (err) {
    console.error("❌ DELETE /api/product error:", err);
    return NextResponse.json(
      {
        error: "Failed to delete product",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}
