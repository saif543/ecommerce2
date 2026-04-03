// Cart API - Firebase Token Authentication
// Server-side persistent cart for authenticated users
import { NextResponse } from "next/server";
import { verifyApiToken, createAuthError, checkRateLimit } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { setRedisData, getRedisData, R_1HRS } from "@/lib/redis";

// 🔐 SECURITY CONSTANTS
const MAX_REQUEST_BODY_SIZE = 20_000;
const MAX_CART_ITEMS = 100;
const MAX_QUANTITY_PER_ITEM = 999;

const writeRequestCounts = new Map();
const WRITE_RATE_LIMIT = 60;
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
  if (current.count > WRITE_RATE_LIMIT) throw new Error("Too many requests");
}

function sanitizeString(value, maxLength = 200) {
  if (typeof value !== "string") return null;
  return value
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .slice(0, maxLength);
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

// ── GET: Get current user's cart ──
export async function GET(req) {
  let user = null;
  try {
    await checkRateLimit(req);
    user = await verifyApiToken(req);
  } catch (authErr) {
    return createAuthError(authErr.message, 401);
  }

  try {
    const client = await clientPromise;
    const db = client.db("ECOM2");
    const cart = await db
      .collection("carts")
      .findOne({ userEmail: user.email });
    const CACHE_KEY = `cart:${user.email}`;
    const CACHE_CART = await getRedisData(CACHE_KEY);
    if (CACHE_CART) {
      return NextResponse.json(CACHE_CART, { status: 200 });
    }

    // Return empty cart shape if none exists yet
    if (!cart) {
      return NextResponse.json({
        cart: {
          userEmail: user.email,
          items: [],
          totalAmount: 0,
          updatedAt: null,
        },
      });
    }

    // Recalculate total server-side on each fetch
    const totalAmount = parseFloat(
      (cart.items || [])
        .reduce((sum, item) => sum + item.price * item.quantity, 0)
        .toFixed(2),
    );

    const result = { cart: { ...cart, totalAmount } };
    // await setRedisData(CACHE_KEY, result, R_1HRS); // may lead to redundency

    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ GET /api/cart error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch cart",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── POST: Add item or set quantity ──
// If productId already in cart, quantity is added (not replaced). Use PUT to set exact quantity.
export async function POST(req) {
  let user = null;
  try {
    await checkRateLimit(req);
    checkWriteRateLimit(req);
    user = await verifyApiToken(req);
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

    const productId = sanitizeString(String(body.productId || ""), 100);
    const name = sanitizeString(String(body.name || ""), 300);
    const image = sanitizeString(String(body.image || ""), 500);
    const price = parseFloat(body.price);
    const quantity = parseInt(body.quantity || 1, 10);

    if (!productId)
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    if (!name)
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 },
      );
    if (!isValidPrice(price))
      return NextResponse.json(
        { error: "Valid price is required" },
        { status: 400 },
      );
    if (isNaN(quantity) || quantity < 1)
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 },
      );
    if (quantity > MAX_QUANTITY_PER_ITEM)
      return NextResponse.json(
        { error: `Quantity cannot exceed ${MAX_QUANTITY_PER_ITEM}` },
        { status: 400 },
      );

    const client = await clientPromise;
    const db = client.db("ECOM2");

    const cart = await db
      .collection("carts")
      .findOne({ userEmail: user.email });
    const existingItems = cart?.items || [];

    // Check if product already in cart
    const existingIdx = existingItems.findIndex(
      (i) => i.productId === productId,
    );

    if (existingIdx >= 0) {
      // Add quantity to existing item
      const newQty = Math.min(
        existingItems[existingIdx].quantity + quantity,
        MAX_QUANTITY_PER_ITEM,
      );
      existingItems[existingIdx].quantity = newQty;
      existingItems[existingIdx].price = price; // update price in case it changed
      existingItems[existingIdx].name = name;
      existingItems[existingIdx].image = image;
    } else {
      if (existingItems.length >= MAX_CART_ITEMS) {
        return NextResponse.json(
          { error: `Cart limit reached (max ${MAX_CART_ITEMS} items)` },
          { status: 400 },
        );
      }
      existingItems.push({
        productId,
        name,
        price,
        quantity,
        image,
        addedAt: new Date(),
      });
    }

    const totalAmount = parseFloat(
      existingItems
        .reduce((sum, i) => sum + i.price * i.quantity, 0)
        .toFixed(2),
    );

    await db.collection("carts").updateOne(
      { userEmail: user.email },
      {
        $set: {
          userEmail: user.email,
          userId: user.dbUserId || user.userId,
          items: existingItems,
          totalAmount,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    const updatedCart = await db
      .collection("carts")
      .findOne({ userEmail: user.email });
    logAudit(
      "CART_ITEM_ADDED",
      { userId: user.userId, userEmail: user.email, productId, quantity },
      req,
    );
    return NextResponse.json(
      { message: "Item added to cart", cart: updatedCart },
      { status: 200 },
    );
  } catch (err) {
    console.error("❌ POST /api/cart error:", err);
    return NextResponse.json(
      {
        error: "Failed to update cart",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── PUT: Set exact quantity for a specific item ──
export async function PUT(req) {
  let user = null;
  try {
    await checkRateLimit(req);
    checkWriteRateLimit(req);
    user = await verifyApiToken(req);
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
    const productId = sanitizeString(String(body.productId || ""), 100);
    const quantity = parseInt(body.quantity, 10);

    if (!productId)
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    if (isNaN(quantity) || quantity < 0)
      return NextResponse.json(
        { error: "Valid quantity is required (0 to remove)" },
        { status: 400 },
      );
    if (quantity > MAX_QUANTITY_PER_ITEM)
      return NextResponse.json(
        { error: `Quantity cannot exceed ${MAX_QUANTITY_PER_ITEM}` },
        { status: 400 },
      );

    const client = await clientPromise;
    const db = client.db("ECOM2");
    const cart = await db
      .collection("carts")
      .findOne({ userEmail: user.email });
    if (!cart)
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });

    let items = cart.items || [];
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0)
      return NextResponse.json({ error: "Item not in cart" }, { status: 404 });

    if (quantity === 0) {
      // Remove item
      items.splice(idx, 1);
    } else {
      items[idx].quantity = quantity;
    }

    const totalAmount = parseFloat(
      items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2),
    );

    await db
      .collection("carts")
      .updateOne(
        { userEmail: user.email },
        { $set: { items, totalAmount, updatedAt: new Date() } },
      );

    const updatedCart = await db
      .collection("carts")
      .findOne({ userEmail: user.email });
    logAudit(
      "CART_ITEM_UPDATED",
      {
        userId: user.userId,
        userEmail: user.email,
        productId,
        newQuantity: quantity,
      },
      req,
    );
    return NextResponse.json({ message: "Cart updated", cart: updatedCart });
  } catch (err) {
    console.error("❌ PUT /api/cart error:", err);
    return NextResponse.json(
      {
        error: "Failed to update cart",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// ── DELETE: Remove one item or clear entire cart ──
// Remove one item:  ?productId=<id>
// Clear all:        ?clearAll=true
export async function DELETE(req) {
  let user = null;
  try {
    await checkRateLimit(req);
    checkWriteRateLimit(req);
    user = await verifyApiToken(req);
  } catch (authErr) {
    return createAuthError(
      authErr.message,
      authErr.message.includes("rate") ? 429 : 401,
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const productId = sanitizeString(searchParams.get("productId") || "", 100);
    const clearAll = searchParams.get("clearAll") === "true";

    if (!productId && !clearAll) {
      return NextResponse.json(
        { error: "productId or clearAll=true is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("ECOM2");

    if (clearAll) {
      await db
        .collection("carts")
        .updateOne(
          { userEmail: user.email },
          { $set: { items: [], totalAmount: 0, updatedAt: new Date() } },
        );
      logAudit(
        "CART_CLEARED",
        { userId: user.userId, userEmail: user.email },
        req,
      );
      return NextResponse.json({
        message: "Cart cleared",
        cart: { userEmail: user.email, items: [], totalAmount: 0 },
      });
    }

    const cart = await db
      .collection("carts")
      .findOne({ userEmail: user.email });
    if (!cart)
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });

    const items = (cart.items || []).filter((i) => i.productId !== productId);
    if (items.length === (cart.items || []).length) {
      return NextResponse.json(
        { error: "Item not found in cart" },
        { status: 404 },
      );
    }

    const totalAmount = parseFloat(
      items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2),
    );
    await db
      .collection("carts")
      .updateOne(
        { userEmail: user.email },
        { $set: { items, totalAmount, updatedAt: new Date() } },
      );

    const updatedCart = await db
      .collection("carts")
      .findOne({ userEmail: user.email });
    logAudit(
      "CART_ITEM_REMOVED",
      { userId: user.userId, userEmail: user.email, productId },
      req,
    );
    return NextResponse.json({
      message: "Item removed from cart",
      cart: updatedCart,
    });
  } catch (err) {
    console.error("❌ DELETE /api/cart error:", err);
    return NextResponse.json(
      {
        error: "Failed to update cart",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}
