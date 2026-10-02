/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserImportMode = 'STUDENT' | 'STAFF' | 'MIXED';

export interface RawImportRow {
  full_name: string;
  student_code?: string;
  email?: string;
  roles: string;
  class_id?: string;
  academic_year_id?: string;
  class_name?: string;
  academic_year_name?: string;
  row_number: number;
}

export interface ValidatedImportRow {
  row_number: number;
  full_name: string;
  student_code?: string;
  email?: string;
  roles: string[];
  class_id?: string | null;
  academic_year_id?: string | null;
  class_name?: string | null;
  academic_year_name?: string | null;
  isValid: boolean;
  errors: string[];
}

export interface ImportResult {
  row_number: number;
  full_name: string;
  email?: string;
  student_code?: string;
  success: boolean;
  message?: string;
  user_id?: string;
  login_identifier?: string;
  temporary_password?: string;
}
