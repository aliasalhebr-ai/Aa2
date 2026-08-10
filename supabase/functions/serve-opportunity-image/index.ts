import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);

    // Expected: /serve-opportunity-image/{opportunityId}/{imageIndex}
    // Or:       /serve-opportunity-image/path/{encodedPath}
    if (segments.length < 3) {
      return jsonError(400, "معاملات غير كافية");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let imagePath: string | null = null;

    if (segments[segments.length - 2] === "path") {
      // Path-based: /serve-opportunity-image/path/{encodedPath}
      // Reconstruct the path from all remaining segments
      const pathSegments = segments.slice(0, segments.length - 2);
      // segments still has the last two as ["path", encodedPath] — we need everything before "path"
      // Actually: segments = [..., "serve-opportunity-image", "path", "encodedPath"]
      // We want everything after "path"
      const pathIdx = segments.indexOf("path");
      const encodedPath = segments.slice(pathIdx + 1).join("/");
      imagePath = decodeURIComponent(encodedPath);

      // Validate path format
      const pathParts = imagePath.split("/");
      if (pathParts.length < 3 || pathParts[0] !== "opportunities") {
        return jsonError(403, "مسار الصورة غير صالح");
      }
    } else {
      // Index-based: /serve-opportunity-image/{opportunityId}/{imageIndex}
      const opportunityId = segments[segments.length - 2];
      const imageIndex = parseInt(segments[segments.length - 1], 10);

      if (isNaN(imageIndex) || imageIndex < 0) {
        return jsonError(400, "فهرس الصورة غير صالح");
      }

      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .select("id, status, images")
        .eq("id", opportunityId)
        .maybeSingle();

      if (oppError) return jsonError(500, "خطأ في الاستعلام");
      if (!opp) return jsonError(404, "السجل غير موجود");
      if (opp.status !== "active") return jsonError(403, "الصور متاحة فقط للسجلات المنشورة");

      const images: string[] = Array.isArray(opp.images) ? opp.images : [];
      if (imageIndex >= images.length) return jsonError(404, "فهرس الصورة خارج النطاق");

      imagePath = images[imageIndex];
      if (!imagePath || typeof imagePath !== "string") {
        return jsonError(404, "مسار الصورة غير موجود");
      }
    }

    if (!imagePath) return jsonError(404, "مسار الصورة غير موجود");

    // Create short-lived signed URL (60 seconds)
    const { data: signedData, error: signedError } = await supabase
      .storage
      .from("opportunity-images")
      .createSignedUrl(imagePath, 60);

    if (signedError || !signedData?.signedUrl) {
      return jsonError(500, "فشل إنشاء رابط الصورة");
    }

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, expiresIn: 60 }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return jsonError(500, msg);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
