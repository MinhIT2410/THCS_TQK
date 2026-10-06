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

type ImportStatus = "CREATED" | "UPDATED" | "SKIPPED" | "CONFLICT" | "FAILED";

interface ProcessResult {
  row_number?: number;
  email?: string;
  student_code?: string;
  login_identifier?: string;
  temporary_password?: string;
  success: boolean;
  status?: ImportStatus;
  user_id?: string;
  error_code?: string;
  error?: string;
  message?: string;
}

interface ExistingAuthUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
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

  const isTeacher = roles.includes("TEACHER");
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (isStudent) {
    if (!user.class_id) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "Lớp học (class_id) là bắt buộc đối với vai trò Học sinh." };
    }
    if (!user.academic_year_id) {
      return { isValid: false, error_code: "VALIDATION_ERROR", message: "Năm học (academic_year_id) là bắt buộc đối với vai trò Học sinh." };
    }
  }

  if (isTeacher && user.class_id && !user.academic_year_id) {
    return { isValid: false, error_code: "VALIDATION_ERROR", message: "Giáo viên có lớp chủ nhiệm phải có academic_year_id." };
  }

  if (user.class_id && !uuidRegex.test(user.class_id)) {
    return { isValid: false, error_code: "VALIDATION_ERROR", message: "class_id phải là định dạng UUID hợp lệ." };
  }
  if (user.academic_year_id && !uuidRegex.test(user.academic_year_id)) {
    return { isValid: false, error_code: "VALIDATION_ERROR", message: "academic_year_id phải là định dạng UUID hợp lệ." };
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


function classNameToTeacherPasswordToken(className: string): string {
  // Preserve a dot so branch-class names like "6.1" remain distinguishable from "6/1".
  // Main-site classes such as "6/1" become "61", matching the requested gvcn@61 format.
  const normalized = className
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\//g, "")
    .replace(/[^a-z0-9.]/g, "");
  return normalized || "lop";
}

async function generatePasswordForUser(
  roles: string[],
  classId: string | null,
  supabaseAdmin: any
): Promise<string> {
  if (roles.includes("TEACHER") && classId) {
    const { data: classRow, error } = await supabaseAdmin
      .from("classes")
      .select("name")
      .eq("id", classId)
      .maybeSingle();

    if (!error && classRow?.name) {
      return `gvcn@${classNameToTeacherPasswordToken(classRow.name)}`;
    }
  }
  return generateTemporaryPassword();
}

async function loadExistingUsersByEmail(
  supabaseAdmin: any,
  requestedEmails: string[]
): Promise<Map<string, ExistingAuthUser>> {
  const targets = new Set(requestedEmails.map((e) => e.trim().toLowerCase()).filter(Boolean));
  const found = new Map<string, ExistingAuthUser>();
  if (targets.size === 0) return found;

  const perPage = 1000;
  for (let page = 1; page <= 100 && found.size < targets.size; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("Unable to scan existing auth users:", error);
      break;
    }

    const users = data?.users || [];
    for (const u of users) {
      const email = (u.email || "").trim().toLowerCase();
      if (email && targets.has(email)) {
        found.set(email, { id: u.id, email: u.email, user_metadata: u.user_metadata || {} });
      }
    }

    if (users.length < perPage) break;
  }

  return found;
}

async function ensureExistingUserBasics(
  userId: string,
  fullName: string,
  roles: string[],
  callerId: string,
  supabaseAdmin: any
): Promise<{ changed: boolean; error?: string }> {
  let changed = false;

  const { data: profile, error: profileReadError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profileReadError) {
    console.error("Error reading existing profile:", profileReadError);
    return { changed: false, error: "Không đọc được hồ sơ tài khoản hiện có." };
  }

  if (!profile) {
    const { error: insertProfileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      full_name: fullName,
      role: "viewer",
      is_active: true,
    });
    if (insertProfileError) {
      console.error("Error restoring missing profile:", insertProfileError);
      return { changed: false, error: "Không thể tạo hồ sơ cho tài khoản đã tồn tại." };
    }
    changed = true;
  } else {
    const patch: Record<string, any> = {};
    if (fullName && profile.full_name !== fullName) patch.full_name = fullName;
    if (profile.is_active !== true) patch.is_active = true;
    if (Object.keys(patch).length > 0) {
      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update(patch)
        .eq("id", userId);
      if (updateProfileError) {
        console.error("Error updating existing profile:", updateProfileError);
        return { changed: false, error: "Không thể cập nhật hồ sơ tài khoản đã tồn tại." };
      }
      changed = true;
    }
  }

  const { data: existingRoles, error: rolesReadError } = await supabaseAdmin
    .from("user_roles")
    .select("role_code")
    .eq("user_id", userId);

  if (rolesReadError) {
    console.error("Error reading existing roles:", rolesReadError);
    return { changed, error: "Không đọc được vai trò của tài khoản hiện có." };
  }

  const roleSet = new Set((existingRoles || []).map((r: any) => r.role_code));
  const missingRoles = roles.filter((r) => !roleSet.has(r));
  if (missingRoles.length > 0) {
    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert(
      missingRoles.map((roleCode) => ({
        user_id: userId,
        role_code: roleCode,
        created_by: callerId,
      }))
    );
    if (roleInsertError) {
      console.error("Error adding roles to existing user:", roleInsertError);
      return { changed, error: "Không thể bổ sung vai trò cho tài khoản đã tồn tại." };
    }
    changed = true;
  }

  return { changed };
}


async function checkHomeroomClassAvailability(
  classId: string | null,
  academicYearId: string | null,
  supabaseAdmin: any
): Promise<{ available: boolean; message?: string }> {
  if (!classId || !academicYearId) return { available: true };

  const { data: classRow } = await supabaseAdmin.from("classes").select("name").eq("id", classId).maybeSingle();
  const className = classRow?.name || "lớp đã chọn";
  const { data: activeForClass, error } = await supabaseAdmin
    .from("homeroom_assignments")
    .select("teacher_id")
    .eq("class_id", classId)
    .eq("academic_year_id", academicYearId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error prechecking homeroom class:", error);
    return { available: false, message: `Không kiểm tra được GVCN hiện tại của lớp ${className}.` };
  }
  if (!activeForClass?.teacher_id) return { available: true };

  const { data: teacher } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", activeForClass.teacher_id)
    .maybeSingle();
  return {
    available: false,
    message: `Lớp ${className} đang có GVCN${teacher?.full_name ? `: ${teacher.full_name}` : " khác"}. Hệ thống không tạo tài khoản/gán đè từ file nhập.`,
  };
}

async function ensureHomeroomAssignment(
  teacherId: string,
  classId: string | null,
  academicYearId: string | null,
  supabaseAdmin: any
): Promise<{ status: "NONE" | "CREATED" | "EXISTS" | "CONFLICT"; message?: string }> {
  if (!classId || !academicYearId) return { status: "NONE" };

  const { data: classRow } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .maybeSingle();
  const className = classRow?.name || "lớp đã chọn";

  const { data: activeForClass, error: classAssignmentError } = await supabaseAdmin
    .from("homeroom_assignments")
    .select("id, teacher_id")
    .eq("class_id", classId)
    .eq("academic_year_id", academicYearId)
    .eq("is_active", true)
    .maybeSingle();

  if (classAssignmentError) {
    console.error("Error checking homeroom class assignment:", classAssignmentError);
    return { status: "CONFLICT", message: `Không kiểm tra được GVCN hiện tại của lớp ${className}.` };
  }

  if (activeForClass?.teacher_id === teacherId) {
    return { status: "EXISTS", message: `Đã là GVCN lớp ${className}; không tạo bản ghi trùng.` };
  }

  if (activeForClass?.teacher_id && activeForClass.teacher_id !== teacherId) {
    const { data: otherTeacher } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", activeForClass.teacher_id)
      .maybeSingle();
    return {
      status: "CONFLICT",
      message: `Lớp ${className} đang có GVCN${otherTeacher?.full_name ? `: ${otherTeacher.full_name}` : " khác"}. Hệ thống không tự ghi đè.`,
    };
  }

  // Guard against assigning one teacher to two active homeroom classes in the same academic year by accident.
  const { data: teacherExisting, error: teacherAssignmentError } = await supabaseAdmin
    .from("homeroom_assignments")
    .select("id, class_id")
    .eq("teacher_id", teacherId)
    .eq("academic_year_id", academicYearId)
    .eq("is_active", true)
    .neq("class_id", classId)
    .limit(1);

  if (teacherAssignmentError) {
    console.error("Error checking teacher's other homeroom assignment:", teacherAssignmentError);
    return { status: "CONFLICT", message: "Không kiểm tra được lớp chủ nhiệm hiện tại của giáo viên." };
  }

  if (teacherExisting && teacherExisting.length > 0) {
    const otherClassId = teacherExisting[0].class_id;
    const { data: otherClass } = await supabaseAdmin.from("classes").select("name").eq("id", otherClassId).maybeSingle();
    return {
      status: "CONFLICT",
      message: `Giáo viên đang là GVCN lớp ${otherClass?.name || "khác"} trong cùng năm học. Không tự chuyển lớp để tránh gán nhầm.`,
    };
  }

  const { error: insertError } = await supabaseAdmin.from("homeroom_assignments").insert({
    teacher_id: teacherId,
    class_id: classId,
    academic_year_id: academicYearId,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    is_active: true,
    notes: "Gán tự động từ file nhập Giáo viên/Cán bộ",
  });

  if (insertError) {
    console.error("Error creating homeroom assignment:", insertError);
    return { status: "CONFLICT", message: `Không thể gán GVCN cho lớp ${className}. Có thể lớp vừa được gán bởi thao tác khác.` };
  }

  return { status: "CREATED", message: `Đã gán GVCN lớp ${className}.` };
}

async function processSingleUser(
  user: UserInput,
  callerId: string,
  supabaseUser: any,
  supabaseAdmin: any,
  studentDomain: string,
  existingByEmail?: Map<string, ExistingAuthUser>,
  resetExistingTeacherPasswords = false
): Promise<ProcessResult> {
  const rowNum = user.row_number;
  const rawEmail = (user.email || "").trim().toLowerCase();
  const rawCode = (user.student_code || "").trim();
  const studentCode = rawCode ? rawCode.toUpperCase() : "";
  const fullName = (user.full_name || "").trim();
  const roles = user.roles || [];
  const classId = user.class_id || null;
  const academicYearId = user.academic_year_id || null;
  const isStudent = roles.includes("STUDENT");
  const isTeacher = roles.includes("TEACHER");

  // 1. Verify caller permissions for each requested role using user-context RPC
  try {
    const permissionChecks = roles.map(async (roleCode) => {
      const { data, error } = await supabaseUser.rpc("can_manage_account_role", {
        requested_role: roleCode,
        target_class_id: classId,
        target_academic_year_id: academicYearId,
      });
      if (error) throw new Error("Lỗi kiểm tra phân quyền.");
      return { role: roleCode, allowed: !!data };
    });

    const permissionResults = await Promise.all(permissionChecks);
    const forbiddenRoles = permissionResults.filter((r) => !r.allowed).map((r) => r.role);
    if (forbiddenRoles.length > 0) {
      return {
        row_number: rowNum,
        email: rawEmail || undefined,
        student_code: studentCode || undefined,
        success: false,
        status: "FAILED",
        error_code: "FORBIDDEN",
        error: "Bạn không có quyền quản lý/tạo vai trò được yêu cầu trong phạm vi này.",
      };
    }
  } catch (_err) {
    return {
      row_number: rowNum,
      email: rawEmail || undefined,
      student_code: studentCode || undefined,
      success: false,
      status: "FAILED",
      error_code: "FORBIDDEN",
      error: "Yêu cầu bị từ chối do không có quyền thực hiện hành động này.",
    };
  }

  // 2. Existing non-student account by email -> idempotent update, never reset password.
  //    Student behavior is intentionally left strict because student_code/enrollment identity has different rules.
  const existingAuthUser = rawEmail ? existingByEmail?.get(rawEmail) : undefined;
  if (existingAuthUser && !isStudent) {
    const basic = await ensureExistingUserBasics(existingAuthUser.id, fullName, roles, callerId, supabaseAdmin);
    if (basic.error) {
      return {
        row_number: rowNum,
        email: rawEmail,
        success: false,
        status: "FAILED",
        user_id: existingAuthUser.id,
        error_code: "EXISTING_ACCOUNT_UPDATE_FAILED",
        error: basic.error,
      };
    }

    let assignmentStatus: "NONE" | "CREATED" | "EXISTS" | "CONFLICT" = "NONE";
    let assignmentMessage = "";
    if (isTeacher && classId && academicYearId) {
      const assignment = await ensureHomeroomAssignment(existingAuthUser.id, classId, academicYearId, supabaseAdmin);
      assignmentStatus = assignment.status;
      assignmentMessage = assignment.message || "";
      if (assignment.status === "CONFLICT") {
        return {
          row_number: rowNum,
          email: rawEmail,
          login_identifier: rawEmail,
          success: false,
          status: "CONFLICT",
          user_id: existingAuthUser.id,
          error_code: "HOMEROOM_CONFLICT",
          error: assignmentMessage,
          message: assignmentMessage,
        };
      }
    }

    let resetPassword: string | undefined;
    if (resetExistingTeacherPasswords && isTeacher && classId) {
      resetPassword = await generatePasswordForUser(roles, classId, supabaseAdmin);
      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        password: resetPassword,
      });
      if (resetError) {
        console.error("Error resetting existing teacher password:", resetError);
        return {
          row_number: rowNum,
          email: rawEmail,
          success: false,
          status: "FAILED",
          user_id: existingAuthUser.id,
          error_code: "PASSWORD_RESET_FAILED",
          error: "Đã cập nhật tài khoản/lớp nhưng không thể đặt lại mật khẩu GVCN.",
        };
      }
    }

    const changed = basic.changed || assignmentStatus === "CREATED" || !!resetPassword;
    const status: ImportStatus = changed ? "UPDATED" : "SKIPPED";
    const passwordMessage = resetPassword
      ? ` Mật khẩu đã được đặt lại thành ${resetPassword}.`
      : " Mật khẩu hiện tại được giữ nguyên.";
    const message = changed
      ? `Tài khoản đã tồn tại; đã cập nhật thông tin${assignmentMessage ? `; ${assignmentMessage}` : ""}.${passwordMessage}`
      : `Tài khoản đã tồn tại; không tạo trùng${assignmentMessage ? `; ${assignmentMessage}` : ""}.${passwordMessage}`;

    return {
      row_number: rowNum,
      email: rawEmail,
      login_identifier: rawEmail,
      temporary_password: resetPassword,
      success: true,
      status,
      user_id: existingAuthUser.id,
      message,
    };
  }

  // 3. Student code uniqueness keeps the original strict behavior.
  if (studentCode) {
    try {
      const { data: existingStudent, error: checkError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("student_code", studentCode)
        .maybeSingle();

      if (checkError) console.error("Error checking student_code uniqueness:", checkError);
      if (existingStudent) {
        return {
          row_number: rowNum,
          email: rawEmail || undefined,
          student_code: studentCode,
          success: false,
          status: "FAILED",
          error_code: "STUDENT_CODE_EXISTS",
          error: `Mã học sinh '${studentCode}' đã tồn tại trên hệ thống.`,
        };
      }
    } catch (err) {
      console.error("Unexpected error checking student_code:", err);
    }
  }

  // Preflight homeroom conflict before creating a brand-new teacher account.
  if (isTeacher && classId && academicYearId) {
    const availability = await checkHomeroomClassAvailability(classId, academicYearId, supabaseAdmin);
    if (!availability.available) {
      return {
        row_number: rowNum,
        email: rawEmail || undefined,
        success: false,
        status: "CONFLICT",
        error_code: "HOMEROOM_CONFLICT",
        error: availability.message || "Lớp đã có GVCN khác.",
        message: availability.message || "Lớp đã có GVCN khác.",
      };
    }
  }

  let authUserId = "";
  const temporaryPassword = await generatePasswordForUser(roles, classId, supabaseAdmin);
  const targetEmail = rawEmail ? rawEmail : `${studentCode.toLowerCase()}@${studentDomain}`;

  // If create_many preload missed a just-created duplicate, createUser still protects us.
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
        status: "FAILED",
        error_code: createError.status === 422 ? "EMAIL_EXISTS" : "ACCOUNT_CREATION_FAILED",
        error: createError.status === 422
          ? (rawEmail ? "Email này đã tồn tại. Hãy nhập lại file để hệ thống nhận diện/cập nhật tài khoản hiện có." : `Tài khoản học sinh '${studentCode}' đã tồn tại.`)
          : "Tạo tài khoản không thành công.",
      };
    }

    if (!createData?.user) {
      return {
        row_number: rowNum,
        email: rawEmail || undefined,
        student_code: studentCode || undefined,
        success: false,
        status: "FAILED",
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
      status: "FAILED",
      error_code: "ACCOUNT_CREATION_FAILED",
      error: "Lỗi kết nối khi tạo tài khoản.",
    };
  }

  // 4. Finalize profile / roles / student enrollment.
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
      const compensated = await deleteUserCompensation(supabaseAdmin, authUserId);
      return {
        row_number: rowNum,
        email: rawEmail || undefined,
        student_code: studentCode || undefined,
        success: false,
        status: "FAILED",
        error_code: compensated ? "DATABASE_FINALIZATION_FAILED" : "COMPENSATION_FAILED",
        error: compensated
          ? "Lỗi hoàn tất thông tin người dùng trong cơ sở dữ liệu. Tài khoản đã được hủy."
          : "Lỗi hoàn tất thông tin người dùng và quá trình dọn dẹp tài khoản thất bại.",
      };
    }

    // 5. Teacher + class means homeroom assignment. Never overwrite a different active teacher.
    let assignmentMessage = "";
    if (isTeacher && classId && academicYearId) {
      const assignment = await ensureHomeroomAssignment(authUserId, classId, academicYearId, supabaseAdmin);
      assignmentMessage = assignment.message || "";
      if (assignment.status === "CONFLICT") {
        // Keep the newly created account/profile; only the homeroom relationship is blocked.
        return {
          row_number: rowNum,
          email: rawEmail || undefined,
          login_identifier: targetEmail,
          temporary_password: temporaryPassword,
          success: false,
          status: "CONFLICT",
          user_id: authUserId,
          error_code: "HOMEROOM_CONFLICT",
          error: `Tài khoản đã được tạo nhưng chưa gán GVCN: ${assignmentMessage}`,
          message: `Tài khoản đã được tạo nhưng chưa gán GVCN: ${assignmentMessage}`,
        };
      }
    }

    return {
      row_number: rowNum,
      email: rawEmail || undefined,
      student_code: studentCode || undefined,
      login_identifier: studentCode || targetEmail,
      temporary_password: temporaryPassword || undefined,
      success: true,
      status: "CREATED",
      user_id: authUserId,
      message: assignmentMessage
        ? `Tạo tài khoản thành công; ${assignmentMessage}`
        : "Tạo tài khoản thành công.",
    };
  } catch (err: any) {
    console.error(`Unexpected setup error for user ${authUserId}:`, err);
    const compensated = await deleteUserCompensation(supabaseAdmin, authUserId);
    return {
      row_number: rowNum,
      email: rawEmail || undefined,
      student_code: studentCode || undefined,
      success: false,
      status: "FAILED",
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
            status: "FAILED",
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

      const existingByEmail = await loadExistingUsersByEmail(
        supabaseAdmin,
        userInput?.email ? [String(userInput.email)] : []
      );
      const result = await processSingleUser(
        userInput,
        callerId,
        supabaseUser,
        supabaseAdmin,
        studentDomain,
        existingByEmail,
        body?.reset_existing_teacher_passwords === true
      );

      if (!result.success) {
        const status = result.error_code === "FORBIDDEN" ? 403 : result.status === "CONFLICT" ? 409 : 400;
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
            status: result.status,
            message: result.message,
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
      const resetExistingTeacherPasswords = body?.reset_existing_teacher_passwords === true;
      if (!users || !Array.isArray(users)) {
        return new Response(
          JSON.stringify({
            success: false,
            status: "FAILED",
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
            status: "FAILED",
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
            status: "FAILED",
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

      const existingByEmail = await loadExistingUsersByEmail(
        supabaseAdmin,
        users.map((u) => u?.email || "").filter(Boolean)
      );

      const results: ProcessResult[] = [];

      for (const u of users) {
        const rowNum = u.row_number || (users.indexOf(u) + 1);

        if (u?.email && duplicateEmails.includes(u.email.toLowerCase().trim())) {
          results.push({
            row_number: rowNum,
            email: u.email,
            success: false,
            status: "FAILED",
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
            status: "FAILED",
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

        const res = await processSingleUser(
          u,
          callerId,
          supabaseUser,
          supabaseAdmin,
          studentDomain,
          existingByEmail,
          resetExistingTeacherPasswords
        );
        results.push({
          row_number: rowNum,
          email: u.email || undefined,
          student_code: res.student_code,
          login_identifier: res.login_identifier,
          temporary_password: res.temporary_password,
          success: res.success,
          status: res.status,
          user_id: res.user_id,
          error_code: res.error_code,
          error: res.error,
          message: res.message,
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
