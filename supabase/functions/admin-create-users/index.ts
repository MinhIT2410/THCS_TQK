import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const allowedOrigins = [
  "https://thcs-tqk.vercel.app",
  "http://localhost:5173",
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

function getCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
}

interface UserInput {
  row_number?: number;
  full_name: string;
  email?: string;
  student_code?: string;
  roles: string[];
  class_id?: string | null;
  academic_year_id?: string | null;
}

interface ProcessResult {
  row_number?: number;
  email?: string;
  student_code?: string;
  login_identifier?: string;
  temporary_password?: string;
  success: boolean;
  user_id?: string;
  error_code?: string;
  error?: string;
}

interface ValidationResult {
  isValid: boolean;
  error_code?: string;
  message?: string;
}

function validateUserData(user: any): ValidationResult {
  if (!user) {
    return { isValid: false, error_code: "VALIDATION_ERROR", message: "Dữ liệu người dùng trống." };
  }

  const fullName = typeof user.full_name === "string" ? user.full_name.trim() : "";
  if (!fullName) {
    return { isValid: false, error_code: "VALIDATION_ERROR", message: "Họ và tên không được để trống." };
  }

  const email = typeof user.email === "string" ? user.email.trim() : "";
  const rawCode = typeof user.student_code === "string" ? user.student_code.trim() : "";
  const studentCode = rawCode ? rawCode.toUpperCase() : "";

  if (!email && !studentCode) {
    return { isValid: false, error_code: "VALIDATION_ERROR", message: "Phải cung cấp Email hoặc Mã học sinh." };
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: `Email không hợp lệ: ${email}` };
    }
  }

  if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
    return { isValid: false, error_code: "VALIDATION_ERROR", message: "Vai trò người dùng là bắt buộc." };
  }

  const allowedRoles = ["SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "CONTENT_EDITOR", "STAFF", "TEACHER", "STUDENT"];
  const rolesSet = new Set<string>();

  for (const role of user.roles) {
    if (typeof role !== "string") {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "Vai trò phải là chuỗi văn bản." };
    }
    const rUpper = role.trim().toUpperCase();
    if (!allowedRoles.includes(rUpper)) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: `Vai trò không hợp lệ: ${role}. Các vai trò hợp lệ: ${allowedRoles.join(", ")}` };
    }
    rolesSet.add(rUpper);
  }

  const roles = Array.from(rolesSet);
  user.roles = roles;

  const isStudent = roles.includes("STUDENT");

  if (!email) {
    if (!isStudent) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "Tạo tài khoản không email chỉ cho phép với vai trò học sinh (STUDENT)." };
    }
    if (roles.length > 1) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "Tài khoản học sinh không email chỉ được phép chứa vai trò STUDENT." };
    }
    if (!studentCode) {
      return { isValid: false, error_code: "STUDENT_CODE_REQUIRED", message: "Mã học sinh là bắt buộc khi không có email." };
    }
  }

  if (studentCode) {
    if (!isStudent) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "Chỉ vai trò học sinh (STUDENT) mới được khai báo Mã học sinh." };
    }
    if (!/^[A-Z0-9-]+$/.test(studentCode)) {
      return { isValid: false, error_code: "STUDENT_CODE_INVALID", message: "Mã học sinh chỉ được chứa chữ cái, số và dấu gạch ngang." };
    }
  }

  if (isStudent) {
    if (!user.class_id) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "Lớp học (class_id) là bắt buộc đối với vai trò Học sinh." };
    }
    if (!user.academic_year_id) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "Năm học (academic_year_id) là bắt buộc đối với vai trò Học sinh." };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.class_id)) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "class_id phải là định dạng UUID hợp lệ." };
    }
    if (!uuidRegex.test(user.academic_year_id)) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "academic_year_id phải là định dạng UUID hợp lệ." };
    }
  }

  return { isValid: true };
}

async function deleteUserCompensation(supabaseAdmin: any, userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`Failed to compensate (delete) user ${userId}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Error during compensation of user ${userId}:`, err);
    return false;
  }
}

function generateTemporaryPassword(): string {
  const length = 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specials = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  let passwordArray: string[] = [];
  passwordArray.push(uppercase[array[0] % uppercase.length]);
  passwordArray.push(lowercase[array[1] % lowercase.length]);
  passwordArray.push(numbers[array[2] % numbers.length]);
  passwordArray.push(specials[array[3] % specials.length]);
  
  const allChars = uppercase + lowercase + numbers + specials;
  for (let i = 4; i < length; i++) {
    passwordArray.push(allChars[array[i] % allChars.length]);
  }
  
  const shuffleArray = new Uint32Array(length);
  crypto.getRandomValues(shuffleArray);
  for (let i = length - 1; i > 0; i--) {
    const j = shuffleArray[i] % (i + 1);
    const temp = passwordArray[i];
    passwordArray[i] = passwordArray[j];
    passwordArray[j] = temp;
  }
  
  return passwordArray.join("");
}

async function processSingleUser(
  user: UserInput,
  callerId: string,
  supabaseUser: any,
  supabaseAdmin: any,
  studentDomain: string
): Promise<ProcessResult> {
  const rowNum = user.row_number;
  const rawEmail = (user.email || "").trim().toLowerCase();
  const rawCode = (user.student_code || "").trim();
  const studentCode = rawCode ? rawCode.toUpperCase() : "";
  const fullName = (user.full_name || "").trim();
  const roles = user.roles || [];
  const classId = user.class_id || null;
  const academicYearId = user.academic_year_id || null;

  // 1. Verify caller permissions for each requested role using user-context RPC
  try {
    const permissionChecks = roles.map(async (roleCode) => {
      const { data, error } = await supabaseUser.rpc("can_manage_account_role", {
        requested_role: roleCode,
        target_class_id: classId,
        target_academic_year_id: academicYearId,
      });
      if (error) {
        throw new Error("Lỗi kiểm tra phân quyền.");
      }
      return { role: roleCode, allowed: !!data };
    });

    const results = await Promise.all(permissionChecks);
    const forbiddenRoles = results.filter((r) => !r.allowed).map((r) => r.role);

    if (forbiddenRoles.length > 0) {
      return {
        row_number: rowNum,
        email: rawEmail || undefined,
        student_code: studentCode || undefined,
        success: false,
        error_code: "FORBIDDEN",
        error: "Bạn không có quyền quản lý/tạo vai trò được yêu cầu trong phạm vi này.",
      };
    }
  } catch (err: any) {
    return {
      row_number: rowNum,
      email: rawEmail || undefined,
      student_code: studentCode || undefined,
      success: false,
      error_code: "FORBIDDEN",
      error: "Yêu cầu bị từ chối do không có quyền thực hiện hành động này.",
    };
  }

  // 2. Check if student_code is already declared / exists in profiles table
  if (studentCode) {
    try {
      const { data: existingStudent, error: checkError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("student_code", studentCode)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking student_code uniqueness:", checkError);
      }

      if (existingStudent) {
        return {
          row_number: rowNum,
          email: rawEmail || undefined,
          student_code: studentCode,
          success: false,
          error_code: "STUDENT_CODE_EXISTS",
          error: `Mã học sinh '${studentCode}' đã tồn tại trên hệ thống.`,
        };
      }
    } catch (err) {
      console.error("Unexpected error checking student_code:", err);
    }
  }

  let authUserId = "";
  const temporaryPassword = generateTemporaryPassword();
  const targetEmail = rawEmail ? rawEmail : `${studentCode.toLowerCase()}@${studentDomain}`;

  try {
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: targetEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        student_code: studentCode || undefined,
      },
    });

    if (createError) {
      console.error("auth.admin.createUser error:", createError);
      return {
        row_number: rowNum,
        email: rawEmail || undefined,
        student_code: studentCode || undefined,
        success: false,
        error_code: createError.status === 422 ? "EMAIL_EXISTS" : "ACCOUNT_CREATION_FAILED",
        error: createError.status === 422 
          ? (rawEmail ? "Email này đã tồn tại trong hệ thống." : `Tài khoản học sinh '${studentCode}' đã tồn tại.`)
          : "Tạo tài khoản không thành công.",
      };
    }

    if (!createData?.user) {
      return {
        row_number: rowNum,
        email: rawEmail || undefined,
        student_code: studentCode || undefined,
        success: false,
        error_code: "ACCOUNT_CREATION_FAILED",
        error: "Tạo tài khoản không thành công.",
      };
    }

    authUserId = createData.user.id;
  } catch (err: any) {
    console.error("Unexpected error creating user:", err);
    return {
      row_number: rowNum,
      email: rawEmail || undefined,
      student_code: studentCode || undefined,
      success: false,
      error_code: "ACCOUNT_CREATION_FAILED",
      error: "Lỗi kết nối khi tạo tài khoản.",
    };
  }

  // 3. Finalize User Setup using RPC
  try {
    const { error: rpcError } = await supabaseAdmin.rpc("finalize_invited_user", {
      target_user_id: authUserId,
      target_email: targetEmail,
      target_full_name: fullName,
      target_role_codes: roles,
      target_class_id: classId,
      target_academic_year_id: academicYearId,
      actor_user_id: callerId,
      target_student_code: studentCode || null,
    });

    if (rpcError) {
      console.error(`finalize_invited_user RPC error for ${authUserId}:`, rpcError);
      // Rollback Auth User
      const compensated = await deleteUserCompensation(supabaseAdmin, authUserId);
      return {
        row_number: rowNum,
        email: rawEmail || undefined,
        student_code: studentCode || undefined,
        success: false,
        error_code: compensated ? "DATABASE_FINALIZATION_FAILED" : "COMPENSATION_FAILED",
        error: compensated
          ? "Lỗi hoàn tất thông tin người dùng trong cơ sở dữ liệu. Tài khoản đã được hủy."
          : "Lỗi hoàn tất thông tin người dùng và quá trình dọn dẹp tài khoản thất bại.",
      };
    }

    return {
      row_number: rowNum,
      email: rawEmail || undefined,
      student_code: studentCode || undefined,
      login_identifier: studentCode || targetEmail,
      temporary_password: temporaryPassword || undefined,
      success: true,
      user_id: authUserId,
    };
  } catch (err: any) {
    console.error(`Unexpected setup error for user ${authUserId}:`, err);
    const compensated = await deleteUserCompensation(supabaseAdmin, authUserId);
    return {
      row_number: rowNum,
      email: rawEmail || undefined,
      student_code: studentCode || undefined,
      success: false,
      error_code: compensated ? "DATABASE_FINALIZATION_FAILED" : "COMPENSATION_FAILED",
      error: compensated
        ? "Đã xảy ra lỗi khi hoàn tất hồ sơ người dùng. Tài khoản đã được hủy."
        : "Đã xảy ra lỗi khi hoàn tất hồ sơ người dùng và quá trình dọn dẹp tài khoản thất bại.",
    };
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";

  // Guard against disallowed origins (OPTIONS and normal requests)
  if (!isOriginAllowed(origin)) {
    return new Response(
      JSON.stringify({
        success: false,
        error_code: "FORBIDDEN",
        message: "Origin không được phép truy cập.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  const corsHeaders = getCorsHeaders(origin);

  try {
    // 1. Authenticate caller and obtain true callerId from Bearer JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Yêu cầu phải có Authorization Bearer Token hợp lệ.",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const studentDomain = Deno.env.get("STUDENT_INTERNAL_EMAIL_DOMAIN")?.trim();

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !studentDomain) {
      const missingVar = !studentDomain ? "STUDENT_INTERNAL_EMAIL_DOMAIN" : "Supabase keys";
      console.error(`System configuration incomplete: missing ${missingVar}`);
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "INTERNAL_SERVER_ERROR",
          message: "Cấu hình hệ thống chưa hoàn chỉnh (Thiếu tên miền email kỹ thuật).",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // A. User Client (carries caller credentials, respects auth.uid())
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Token xác thực không hợp lệ hoặc đã hết hạn.",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const callerId = user.id;

    // B. Admin Client (carries service role permissions, bypasses RLS safely)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "VALIDATION_ERROR",
          message: "Yêu cầu thiếu thuộc tính action ('create_one' hoặc 'create_many').",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ==========================================
    // ACTION: CREATE_ONE
    // ==========================================
    if (action === "create_one") {
      const { user: userInput } = body;
      if (!userInput) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "VALIDATION_ERROR",
            message: "Thiếu thông tin người dùng trong payload ('user').",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      const validation = validateUserData(userInput);
      if (!validation.isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: validation.error_code,
            message: validation.message,
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await processSingleUser(userInput, callerId, supabaseUser, supabaseAdmin, studentDomain);

      if (!result.success) {
        const status = result.error_code === "FORBIDDEN" ? 403 : 400;
        return new Response(
          JSON.stringify({
            success: false,
            error_code: result.error_code,
            message: result.error,
          }),
          { status, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user_id: result.user_id,
            login_identifier: result.login_identifier,
            temporary_password: result.temporary_password,
            student_code: result.student_code,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ==========================================
    // ACTION: CREATE_MANY
    // ==========================================
    if (action === "create_many") {
      const { users } = body;
      if (!users || !Array.isArray(users)) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "VALIDATION_ERROR",
            message: "Thiếu danh sách người dùng hoặc định dạng không đúng ('users' phải là một mảng).",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      if (users.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "VALIDATION_ERROR",
            message: "Danh sách người dùng không được để trống.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      if (users.length > 100) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "VALIDATION_ERROR",
            message: "Giới hạn tối đa là 100 tài khoản cho mỗi yêu cầu.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Detect email duplicates in request payload - excluding blank/undefined values
      const emailsInBatch = users
        .map((u) => u?.email?.toLowerCase()?.trim())
        .filter((email) => !!email);
      const duplicateEmails = emailsInBatch.filter((item, index) => emailsInBatch.indexOf(item) !== index);

      // Detect student_code duplicates in request payload - excluding blank/undefined values
      const codesInBatch = users
        .map((u) => {
          const raw = u?.student_code?.trim() || "";
          return raw ? raw.toUpperCase() : "";
        })
        .filter((code) => !!code);
      const duplicateCodes = codesInBatch.filter((item, index) => codesInBatch.indexOf(item) !== index);

      const results: ProcessResult[] = [];

      for (const u of users) {
        const rowNum = u.row_number || (users.indexOf(u) + 1);

        if (u?.email && duplicateEmails.includes(u.email.toLowerCase().trim())) {
          results.push({
            row_number: rowNum,
            email: u.email,
            success: false,
            error_code: "VALIDATION_ERROR",
            error: "Email bị trùng lặp trong tệp tải lên.",
          });
          continue;
        }

        const rawCode = u?.student_code?.trim() || "";
        const studentCode = rawCode ? rawCode.toUpperCase() : "";

        if (studentCode && duplicateCodes.includes(studentCode)) {
          results.push({
            row_number: rowNum,
            email: u.email || undefined,
            student_code: studentCode,
            success: false,
            error_code: "VALIDATION_ERROR",
            error: `Mã học sinh '${studentCode}' bị trùng lặp trong tệp tải lên.`,
          });
          continue;
        }

        const validation = validateUserData(u);
        if (!validation.isValid) {
          results.push({
            row_number: rowNum,
            email: u?.email || undefined,
            student_code: studentCode || undefined,
            success: false,
            error_code: validation.error_code,
            error: validation.message,
          });
          continue;
        }

        const res = await processSingleUser(u, callerId, supabaseUser, supabaseAdmin, studentDomain);
        results.push({
          row_number: rowNum,
          email: u.email || undefined,
          student_code: res.student_code,
          login_identifier: res.login_identifier,
          temporary_password: res.temporary_password,
          success: res.success,
          user_id: res.user_id,
          error_code: res.error_code,
          error: res.error,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: results,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error_code: "VALIDATION_ERROR",
        message: `Hành động không hợp lệ: ${action}. Chỉ hỗ trợ 'create_one' và 'create_many'.`,
      }),
      { status: 400, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Critical function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error_code: "INTERNAL_SERVER_ERROR",
        message: "Có lỗi máy chủ xảy ra.",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
