import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const allowedOrigins = [
  "https://thcs-tqk.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
}

function jsonResponse(origin: string, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(origin),
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (!allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ success: false, message: "Origin không được phép." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(origin, 401, { success: false, message: "Thiếu Authorization Bearer Token." });
    }

    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(origin, 500, { success: false, message: "Thiếu cấu hình Supabase cho Edge Function." });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(origin, 401, { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }

    const callerId = authData.user.id;
    const { data: isSuperAdmin, error: roleError } = await adminClient.rpc("has_app_role", {
      p_user_id: callerId,
      p_role_code: "SUPER_ADMIN",
    });

    if (roleError || !isSuperAdmin) {
      return jsonResponse(origin, 403, { success: false, message: "Chỉ SUPER_ADMIN được phép reset tài khoản học sinh." });
    }

    const body = await req.json();
    const action = body?.action;

    if (action === "count_remaining") {
      const { data, error } = await userClient.rpc("count_resettable_student_accounts");
      if (error) {
        console.error("count_resettable_student_accounts failed:", error);
        return jsonResponse(origin, 400, { success: false, message: error.message || "Không thể đếm tài khoản học sinh còn lại." });
      }

      return jsonResponse(origin, 200, {
        success: true,
        remaining: Number(data || 0),
      });
    }

    if (action === "prepare_batch") {
      // Keep each RPC result below PostgREST's row cap. The RPC itself also limits
      // the destructive database cleanup to the exact same STUDENT-only batch.
      const requestedLimit = Number(body?.limit || 500);
      const limit = Math.max(1, Math.min(500, Number.isFinite(requestedLimit) ? requestedLimit : 500));
      const { data, error } = await userClient.rpc("prepare_student_account_reset_batch", {
        p_limit: limit,
      });
      if (error) {
        console.error("prepare_student_account_reset_batch failed:", error);
        return jsonResponse(origin, 400, { success: false, message: error.message || "Không thể chuẩn bị batch reset học sinh." });
      }

      const userIds = (data || []).map((row: any) => row.user_id).filter(Boolean);
      return jsonResponse(origin, 200, {
        success: true,
        user_ids: userIds,
        total: userIds.length,
      });
    }

    if (action === "delete_batch") {
      const userIds = Array.isArray(body?.user_ids) ? body.user_ids.filter((id: unknown) => typeof id === "string") : [];
      if (userIds.length === 0 || userIds.length > 50) {
        return jsonResponse(origin, 400, { success: false, message: "Mỗi batch phải có từ 1 đến 50 user_id." });
      }

      // Protect against arbitrary account deletion. Only STUDENT-only accounts are accepted.
      const { data: roleRows, error: roleRowsError } = await adminClient
        .from("user_roles")
        .select("user_id, role_code")
        .in("user_id", userIds);

      if (roleRowsError) {
        return jsonResponse(origin, 400, { success: false, message: "Không thể kiểm tra vai trò tài khoản trước khi xóa." });
      }

      const rolesByUser = new Map<string, Set<string>>();
      for (const row of roleRows || []) {
        const set = rolesByUser.get(row.user_id) || new Set<string>();
        set.add(row.role_code);
        rolesByUser.set(row.user_id, set);
      }

      const protectedIds: string[] = [];
      const deletableIds: string[] = [];
      for (const id of userIds) {
        const roles = rolesByUser.get(id) || new Set<string>();
        if (roles.size === 1 && roles.has("STUDENT")) deletableIds.push(id);
        else protectedIds.push(id);
      }

      const deletedIds: string[] = [];
      const failed: Array<{ user_id: string; message: string }> = [];

      // Small concurrent groups keep each Edge Function call short and avoid flooding Auth Admin API.
      for (let i = 0; i < deletableIds.length; i += 10) {
        const group = deletableIds.slice(i, i + 10);
        const settled = await Promise.allSettled(
          group.map(async (id) => {
            const { error } = await adminClient.auth.admin.deleteUser(id);
            if (error) throw new Error(error.message);
            return id;
          }),
        );

        settled.forEach((result, index) => {
          const id = group[index];
          if (result.status === "fulfilled") deletedIds.push(id);
          else failed.push({ user_id: id, message: result.reason?.message || "Không thể xóa tài khoản Auth." });
        });
      }

      return jsonResponse(origin, 200, {
        success: failed.length === 0,
        deleted_ids: deletedIds,
        protected_ids: protectedIds,
        failed,
      });
    }

    return jsonResponse(origin, 400, { success: false, message: "Action không hợp lệ." });
  } catch (error) {
    console.error("admin-reset-students unexpected error:", error);
    return jsonResponse(origin, 500, { success: false, message: "Lỗi hệ thống khi reset tài khoản học sinh." });
  }
});
