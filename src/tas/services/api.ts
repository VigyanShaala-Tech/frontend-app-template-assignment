/**
 * TAS API client — all endpoints wired to the real Django backend.
 *
 * Base URL: {LMS_BASE_URL}/tas/api/v1/
 * Auth:     getAuthenticatedHttpClient() — attaches OpenEdX JWT automatically.
 */

import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import type {
  TemplateType,
  Template,
  Rubric,
  RubricCriterion,
  BlockTemplatesResponse,
  BlockRubricsResponse,
  RubricFeedbackEntry,
  Submission,
  SubmissionStatus,
  SubmissionVersionsResponse,
  PdfStatusResponse,
  TemplateCreateBody,
  TemplateUpdateBody,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tasBase(): string {
  const lms = getConfig().LMS_BASE_URL as string;
  return `${lms}/tas/api/v1`;
}

function http() {
  return getAuthenticatedHttpClient();
}

/** Extract a human-readable message from DRF / axios errors. */
export function formatApiError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) {
    return err?.message || fallback;
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  if (Array.isArray(data.detail)) {
    return data.detail.map(String).join('\n');
  }
  if (data.non_field_errors) {
    return Array.isArray(data.non_field_errors)
      ? data.non_field_errors.join('\n')
      : String(data.non_field_errors);
  }
  const fieldErrors = Object.entries(data)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join('\n');
  return fieldErrors || fallback;
}

function mapTemplateType(raw: any): TemplateType {
  return {
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? '',
    icon: raw.icon ?? '',
    is_active: raw.is_active,
  };
}

function mapTemplate(raw: any): Template {
  return {
    id: String(raw.id),
    template_type_id: String(raw.template_type),
    template_type: raw.template_type_detail
      ? {
          id: String(raw.template_type_detail.id),
          name: raw.template_type_detail.name,
          slug: raw.template_type_detail.slug,
          description: raw.template_type_detail.description ?? '',
          icon: raw.template_type_detail.icon ?? '',
          is_active: raw.template_type_detail.is_active,
        }
      : undefined,
    name: raw.name,
    description: raw.description ?? '',
    image_url: raw.image ?? '',
    image_width: raw.image_width,
    image_height: raw.image_height,
    thumbnail_url: raw.thumbnail ?? '',
    fields: raw.fields ?? [],
    field_positions: raw.field_positions ?? {},
    is_public: raw.is_public,
    is_active: raw.is_active,
    created_by: raw.created_by ?? '',
    created_at: raw.created ?? raw.created_at ?? '',
    updated_at: raw.modified ?? raw.updated_at ?? '',
  };
}

function mapSubmission(raw: any): Submission {
  return {
    id: String(raw.id),
    template_block_id: String(raw.template_block_id ?? ''),
    student_id: raw.student_id ?? '',
    course_id: raw.course_id ?? '',
    usage_key: String(raw.usage_key ?? ''),
    form_data: raw.form_data ?? {},
    status: raw.status as SubmissionStatus,
    version_number: raw.version_number ?? 1,
    submitted_at: raw.submitted_at ?? null,
    pdf_url: raw.pdf_url ?? '',
    feedback: raw.feedback ?? null,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? '',
  };
}

// ─── Template Types ───────────────────────────────────────────────────────────

export const templateTypesApi = {
  list: async (): Promise<{ count: number; results: TemplateType[] }> => {
    const { data } = await http().get(`${tasBase()}/template-types/`, {
      params: { is_active: true, page_size: 100 },
    });
    // Backend may return paginated { count, results } or a plain array
    const raw: any[] = Array.isArray(data) ? data : (data.results ?? []);
    return {
      count: Array.isArray(data) ? data.length : (data.count ?? raw.length),
      results: raw.map(mapTemplateType),
    };
  },

  create: async (body: Omit<TemplateType, 'id'>): Promise<TemplateType> => {
    const { data } = await http().post(`${tasBase()}/template-types/`, body);
    return mapTemplateType(data);
  },

  update: async (id: string, body: Partial<Omit<TemplateType, 'id'>>): Promise<TemplateType> => {
    const { data } = await http().patch(`${tasBase()}/template-types/${id}/`, body);
    return mapTemplateType(data);
  },

  delete: async (id: string): Promise<void> => {
    await http().delete(`${tasBase()}/template-types/${id}/`);
  },
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const templatesApi = {
  list: async (params?: {
    template_type?: string;
    is_public?: boolean;
    search?: string;
    active_only?: boolean;
  }): Promise<{ count: number; results: Template[] }> => {
    const query: Record<string, any> = { page_size: 24 };
    if (params?.template_type) query.template_type = params.template_type;
    if (params?.is_public !== undefined) query.is_public = params.is_public;
    const { data } = await http().get(`${tasBase()}/templates/`, { params: query });
    const raw: any[] = Array.isArray(data) ? data : (data.results ?? []);
    let results: Template[] = raw.map(mapTemplate);
    if (params?.active_only !== false) {
      results = results.filter((t) => t.is_active);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return { count: results.length, results };
  },

  get: async (id: string): Promise<Template> => {
    const { data } = await http().get(`${tasBase()}/templates/${id}/`);
    return mapTemplate(data);
  },
};

// ─── Admin: Templates CRUD ────────────────────────────────────────────────────

export const adminTemplatesApi = {
  create: async (body: TemplateCreateBody): Promise<Template> => {
    const fd = new FormData();
    fd.append('template_type', String(Number(body.template_type_id)));
    fd.append('name', body.name);
    fd.append('description', body.description);
    fd.append('image_width', String(body.image_width));
    fd.append('image_height', String(body.image_height));
    fd.append('fields', JSON.stringify(body.fields));
    fd.append('field_positions', JSON.stringify(body.field_positions));
    fd.append('is_public', String(body.is_public));
    fd.append('is_active', 'true');
    if (body.imageFile) fd.append('image', body.imageFile);
    if (body.thumbnailFile) fd.append('thumbnail', body.thumbnailFile);
    const { data } = await http().post(`${tasBase()}/templates/`, fd);
    return mapTemplate(data);
  },

  update: async (id: string, body: TemplateUpdateBody): Promise<Template> => {
    const fd = new FormData();
    if (body.template_type_id !== undefined) fd.append('template_type', String(Number(body.template_type_id)));
    if (body.name !== undefined) fd.append('name', body.name);
    if (body.description !== undefined) fd.append('description', body.description);
    if (body.image_width !== undefined) fd.append('image_width', String(body.image_width));
    if (body.image_height !== undefined) fd.append('image_height', String(body.image_height));
    if (body.fields !== undefined) fd.append('fields', JSON.stringify(body.fields));
    if (body.field_positions !== undefined) fd.append('field_positions', JSON.stringify(body.field_positions));
    if (body.is_public !== undefined) fd.append('is_public', String(body.is_public));
    if (body.imageFile) fd.append('image', body.imageFile);
    if (body.thumbnailFile) fd.append('thumbnail', body.thumbnailFile);
    const { data } = await http().patch(`${tasBase()}/templates/${id}/`, fd);
    return mapTemplate(data);
  },

  delete: async (id: string): Promise<void> => {
    await http().delete(`${tasBase()}/templates/${id}/`);
  },

  toggleActive: async (id: string, currentlyActive: boolean): Promise<Template> => {
    const { data } = await http().patch(`${tasBase()}/templates/${id}/`, {
      is_active: !currentlyActive,
    });
    return mapTemplate(data);
  },
};

// ─── Block ↔ Template Assignments ─────────────────────────────────────────────

export const blockTemplatesApi = {
  list: async (usageKey: string): Promise<BlockTemplatesResponse> => {
    const { data } = await http().get(`${tasBase()}/blocks/${encodeURIComponent(usageKey)}/templates/`);
    // Backend returns a single TemplateBlock item — wrap in array for frontend shape
    const item = data.templates;
    return {
      usage_key: data.usage_key,
      course_id: data.course_id,
      templates: Array.isArray(item) ? item : [item],
    };
  },
};

// ─── Student Submissions ──────────────────────────────────────────────────────

export const submissionsApi = {
  createOrGetDraft: async (body: {
    template_block_id: string;
    usage_key: string;
    course_id: string;
    student_id: string;
  }): Promise<Submission> => {
    // Send empty form_data — backend preserves existing answers if draft already exists.
    const payload = {
      template_block_id: Number(body.template_block_id),
      course_key: body.course_id,
      usage_key: body.usage_key,
      form_data: {},
      status: 'draft',
    };
    const { data } = await http().post(`${tasBase()}/student-submission/`, payload);
    return mapSubmission(data);
  },

  get: async (id: string): Promise<Submission> => {
    const { data } = await http().get(`${tasBase()}/student-submission/${id}/`);
    return mapSubmission(data);
  },

  patch: async (id: string, form_data: Record<string, string>): Promise<Submission> => {
    const { data } = await http().patch(`${tasBase()}/student-submission/${id}/`, { form_data });
    return mapSubmission(data);
  },

  /** Reopen a rejected submission to draft without rewriting form_data. */
  reopen: async (id: string): Promise<Submission> => {
    const { data } = await http().patch(`${tasBase()}/student-submission/${id}/`, { action: 'reopen' });
    return mapSubmission(data);
  },

  submit: async (id: string): Promise<Submission> => {
    const { data } = await http().post(`${tasBase()}/student-submission/${id}/submit/`);
    return mapSubmission(data);
  },

  getPdf: async (id: string): Promise<PdfStatusResponse> => {
    const { data } = await http().get(`${tasBase()}/student-submission/${id}/pdf/`);
    return { pdf_url: data.pdf_url ?? null, status: data.status };
  },

  getVersions: async (id: string): Promise<SubmissionVersionsResponse> => {
    const { data } = await http().get(`${tasBase()}/student-submission/${id}/versions/`);
    const versions = (data.versions ?? []).map((v: any) => ({
      version_number: v.version_number,
      submitted_at: v.submitted_at ?? v.saved_at ?? null,
      feedback_available: Boolean(v.feedback_available),
      feedback_unavailable_reason: v.feedback_unavailable_reason ?? null,
      feedback_status: v.feedback_status ?? null,
      instructor_comment: v.instructor_comment ?? '',
      pdf_url: v.pdf_url ?? null,
      download_url: v.download_url ?? v.pdf_url ?? null,
      form_data: v.form_data ?? {},
      saved_at: v.saved_at ?? v.submitted_at ?? '',
    }));
    return {
      submission_id: String(data.submission_id),
      versions,
    };
  },
};

// ─── Admin: Rubrics CRUD ──────────────────────────────────────────────────────

function mapRubric(raw: any): Rubric {
  return {
    id: String(raw.id),
    name: raw.name,
    criteria: raw.criteria ?? [],
    is_active: raw.is_active,
  };
}

export const rubricsApi = {
  list: async (): Promise<{ count: number; results: Rubric[] }> => {
    const { data } = await http().get(`${tasBase()}/rubrics/`, {
      params: { is_active: true, page_size: 100 },
    });
    const raw: any[] = Array.isArray(data) ? data : (data.results ?? []);
    return {
      count: Array.isArray(data) ? data.length : (data.count ?? raw.length),
      results: raw.map(mapRubric),
    };
  },

  create: async (body: { name: string; criteria: RubricCriterion[] }): Promise<Rubric> => {
    const { data } = await http().post(`${tasBase()}/rubrics/`, body);
    return mapRubric(data);
  },

  update: async (id: string, body: { name?: string; criteria?: RubricCriterion[] }): Promise<Rubric> => {
    const { data } = await http().patch(`${tasBase()}/rubrics/${id}/`, body);
    return mapRubric(data);
  },

  delete: async (id: string): Promise<void> => {
    await http().delete(`${tasBase()}/rubrics/${id}/`);
  },
};

// ─── Admin: Submissions ───────────────────────────────────────────────────────

export const adminSubmissionsApi = {
  list: async (params?: {
    usage_key?: string;
    status?: SubmissionStatus;
  }): Promise<any[]> => {
    const usageKey = params?.usage_key ?? '';
    const { data } = await http().get(
      `${tasBase()}/block/${encodeURIComponent(usageKey)}/submissions/`,
      { params: { page_size: 24, ...(params?.status ? { status: params.status } : {}) } },
    );
    return data.results ?? data;
  },

  get: async (id: string): Promise<any> => {
    const { data } = await http().get(`${tasBase()}/submissions/${id}/`);
    return data;
  },

  getRubrics: async (usageKey: string): Promise<BlockRubricsResponse> => {
    const { data } = await http().get(
      `${tasBase()}/block/${encodeURIComponent(usageKey)}/rubrics/`,
    );
    return data;
  },

  submitFeedback: async (
    submissionId: string,
    payload: { rubrics?: RubricFeedbackEntry[]; comment?: string; status?: string },
  ): Promise<void> => {
    await http().post(`${tasBase()}/submissions/${submissionId}/feedback/`, payload);
  },

  withdrawFeedback: async (submissionId: string): Promise<void> => {
    await http().post(`${tasBase()}/submissions/${submissionId}/feedback/withdraw/`);
  },
};
