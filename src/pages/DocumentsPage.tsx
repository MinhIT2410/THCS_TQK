/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Documents from '../components/documents/Documents';
import { DocumentItem } from '../types';
import { documentApi } from '../features/documents/documentApi';
import { SchoolDocument, DocumentCategory } from '../features/documents/documentTypes';

export default function DocumentsPage() {
  const [dbDocuments, setDbDocuments] = useState<SchoolDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const docs = await documentApi.getDocuments();
      setDbDocuments(docs);
    } catch (err) {
      console.error('Error fetching published documents:', err);
      setError('Không thể tải danh sách tài liệu văn bản. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const categoryMap: Record<DocumentCategory, 'Kế hoạch' | 'Công văn' | 'Biểu mẫu' | 'Quyết định' | 'Khác'> = {
    ke_hoach: 'Kế hoạch',
    cong_van: 'Công văn',
    bieu_mau: 'Biểu mẫu',
    quyet_dinh: 'Quyết định',
    khac: 'Khác'
  };

  const formattedDocuments: DocumentItem[] = dbDocuments.map((doc) => {
    // Determine category display name
    const categoryName = categoryMap[doc.category] || 'Khác';

    // Format file size
    let sizeInMB = 'Không rõ';
    if (doc.file_size && doc.file_size > 0) {
      if (doc.file_size >= 1024 * 1024) {
        sizeInMB = `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        sizeInMB = `${(doc.file_size / 1024).toFixed(0)} KB`;
      }
    }

    // Format code
    const shortId = doc.id.substring(0, 4).toUpperCase();
    const codePrefix = doc.category === 'ke_hoach' ? 'KH' :
                     doc.category === 'cong_van' ? 'CV' :
                     doc.category === 'bieu_mau' ? 'BM' :
                     doc.category === 'quyet_dinh' ? 'QĐ' : 'VB';
    const docCode = `${codePrefix}-${shortId}`;

    // Format date
    const displayDate = doc.published_at 
      ? new Date(doc.published_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : new Date(doc.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return {
      id: doc.id,
      code: docCode,
      title: doc.title,
      category: categoryName as any,
      date: displayDate,
      issuingBody: 'Liên đội Trần Quang Khải',
      fileUrl: doc.file_url,
      fileSize: sizeInMB,
      fileType: doc.mime_type || 'application/pdf',
      fileName: doc.file_name || 'document.pdf',
    };
  });

  return (
    <Documents
      documents={formattedDocuments}
      loading={isLoading}
      error={error}
      onRetry={fetchDocs}
    />
  );
}
