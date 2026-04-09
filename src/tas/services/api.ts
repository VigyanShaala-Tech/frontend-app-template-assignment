/**
 * TAS API client
 *
 * Calls the real Django backend for template-types and templates.
 * Submissions, block-templates, and PDF endpoints are not yet implemented
 * on the backend — those remain mocked until the backend ships them.
 *
 * Base URL: {LMS_BASE_URL}/tas/api/v1/
 * Auth:     getAuthenticatedHttpClient() from @edx/frontend-platform/auth
 *           (automatically attaches the OpenEdX JWT bearer token)
 */

import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import type {
  TemplateType,
  Template,
  BlockTemplatesResponse,
  Submission,
  SubmissionStatus,
  SubmissionVersionsResponse,
  PdfStatusResponse,
  TemplateCreateBody,
  TemplateUpdateBody,
} from '../types';
import {
  MOCK_BLOCK_TEMPLATES,
  submissionStore,
  versionStore,
  makeSubmissionId,
  nextVersion,
} from './mockData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tasBase(): string {
  const lms = getConfig().LMS_BASE_URL as string;
  return `${lms}/tas/api/v1`;
}

function http() {
  return getAuthenticatedHttpClient();
}

/**
 * Map a raw backend Template object (uses `image`, `thumbnail`, integer id/template_type)
 * to the frontend Template shape (uses `image_url`, `thumbnail_url`, string ids).
 */
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

// ─── Template Types ───────────────────────────────────────────────────────────

export const templateTypesApi = {
  list: async (): Promise<{ count: number; results: TemplateType[] }> => {
    const { data } = await http().get(`${tasBase()}/template-types/`, {
      params: { is_active: true, page_size: 24 },
    });
    return {
      count: data.count,
      results: (data.results as any[]).map(mapTemplateType),
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
    /** Admin: pass false to include inactive templates */
    active_only?: boolean;
  }): Promise<{ count: number; results: Template[] }> => {
    const query: Record<string, any> = { page_size: 24 };
    if (params?.template_type) query.template_type = params.template_type;
    if (params?.is_public !== undefined) query.is_public = params.is_public;
    // Backend doesn't have an active_only param — filter client-side when needed
    const { data } = await http().get(`${tasBase()}/templates/`, { params: query });
    let results: Template[] = (data.results as any[]).map(mapTemplate);
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
  /**
   * POST /tas/api/v1/templates/
   * Backend expects: template_type (int), name, description, image (file),
   * image_width, image_height, thumbnail (file), fields (JSON), field_positions (JSON),
   * is_public, is_active.
   *
   * We send JSON for now (image upload via URL is set on image_url field separately).
   */
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

  /**
   * Backend soft-deletes via DELETE (sets is_active=false).
   * To toggle active back on, use PATCH with is_active=true.
   */
  toggleActive: async (id: string, currentlyActive: boolean): Promise<Template> => {
    const { data } = await http().patch(`${tasBase()}/templates/${id}/`, {
      is_active: !currentlyActive,
    });
    return mapTemplate(data);
  },
};

// ─── Block ↔ Template Assignments ─────────────────────────────────────────────
// NOTE: Not yet implemented on the backend. Uses mock data.

export const blockTemplatesApi = {
  list: async (usageKey: string): Promise<BlockTemplatesResponse> => {
    const assigned = MOCK_BLOCK_TEMPLATES[usageKey];
    if (assigned) return assigned;

    // Fallback: return all active public templates for this block
    const { results } = await templatesApi.list({ is_public: true });
    return {
      usage_key: usageKey,
      course_id: 'course-v1:Demo+DemoX+Demo_Course',
      templates: results.map((t, i) => ({
        template_block_id: `tb-${t.id}`,
        sort_order: i,
        template: {
          id: t.id,
          name: t.name,
          template_type: {
            slug: t.template_type?.slug || 'unknown',
            name: t.template_type?.name || 'Unknown',
          },
          thumbnail_url: t.thumbnail_url,
          image_width: t.image_width,
          image_height: t.image_height,
        },
      })),
    };
  },
};

// ─── Submissions ──────────────────────────────────────────────────────────────
// NOTE: Not yet implemented on the backend. Uses in-memory mock store.

const MOCK_DELAY = 400;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const submissionsApi = {
  list: async (params?: {
    usage_key?: string;
    course_id?: string;
    status?: SubmissionStatus;
    student_id?: string;
  }): Promise<Submission[]> => {
    await delay(MOCK_DELAY);
    let results = Object.values(submissionStore);
    if (params?.usage_key) results = results.filter((s) => s.usage_key === params.usage_key);
    if (params?.course_id) results = results.filter((s) => s.course_id === params.course_id);
    if (params?.status) results = results.filter((s) => s.status === params.status);
    if (params?.student_id) results = results.filter((s) => s.student_id === params.student_id);
    return results;
  },

  createOrGetDraft: async (body: {
    template_block_id: string;
    form_data: Record<string, string>;
    usage_key: string;
    course_id: string;
    student_id: string;
  }): Promise<Submission> => {
    await delay(MOCK_DELAY);
    const existing = Object.values(submissionStore).find(
      (s) => s.template_block_id === body.template_block_id && s.student_id === body.student_id,
    );
    if (existing) return existing;

    const id = makeSubmissionId();
    const now = new Date().toISOString();
    const sub: Submission = {
      id,
      template_block_id: body.template_block_id,
      student_id: body.student_id,
      course_id: body.course_id,
      usage_key: body.usage_key,
      form_data: body.form_data,
      status: 'draft',
      version_number: 1,
      submitted_at: null,
      pdf_url: '',
      created_at: now,
      updated_at: now,
    };
    submissionStore[id] = sub;
    versionStore[id] = [{ version_number: 1, form_data: body.form_data, saved_at: now }];
    return sub;
  },

  get: async (id: string): Promise<Submission> => {
    await delay(MOCK_DELAY);
    const sub = submissionStore[id];
    if (!sub) throw new Error(`Submission ${id} not found`);
    return sub;
  },

  patch: async (id: string, form_data: Record<string, string>): Promise<Submission> => {
    await delay(MOCK_DELAY);
    const sub = submissionStore[id];
    if (!sub) throw new Error(`Submission ${id} not found`);
    if (sub.status === 'submitted') throw new Error('Cannot edit a submitted assignment');

    const version = nextVersion(id);
    const now = new Date().toISOString();
    const updated: Submission = { ...sub, form_data, version_number: version, updated_at: now };
    submissionStore[id] = updated;
    if (!versionStore[id]) versionStore[id] = [];
    versionStore[id].push({ version_number: version, form_data, saved_at: now });
    return updated;
  },

  submit: async (id: string): Promise<Submission> => {
    await delay(MOCK_DELAY);
    const sub = submissionStore[id];
    if (!sub) throw new Error(`Submission ${id} not found`);
    if (sub.status === 'submitted') throw new Error('Already submitted');

    const now = new Date().toISOString();
    const updated: Submission = { ...sub, status: 'submitted', submitted_at: now, updated_at: now, pdf_url: '' };
    submissionStore[id] = updated;
    setTimeout(() => {
      submissionStore[id] = {
        ...submissionStore[id],
        pdf_url: `https://mock-s3.example.com/submissions/${id}.pdf`,
      };
    }, 3000);
    return updated;
  },

  getPdf: async (id: string): Promise<PdfStatusResponse> => {
    await delay(MOCK_DELAY);
    const sub = submissionStore[id];
    if (!sub) throw new Error(`Submission ${id} not found`);
    if (sub.pdf_url) return { pdf_url: sub.pdf_url };
    return { pdf_url: null, status: 'generating' };
  },

  getVersions: async (id: string): Promise<SubmissionVersionsResponse> => {
    await delay(MOCK_DELAY);
    const versions = versionStore[id] || [];
    return {
      submission_id: id,
      versions: [...versions].sort((a, b) => b.version_number - a.version_number),
    };
  },
};

// ─── Admin: Submissions read ──────────────────────────────────────────────────
// NOTE: Not yet implemented on the backend. Uses in-memory mock store.

export const adminSubmissionsApi = {
  list: async (params?: {
    course_id?: string;
    usage_key?: string;
    status?: SubmissionStatus;
  }): Promise<Submission[]> => {
    await delay(MOCK_DELAY);
    let results = Object.values(submissionStore);
    if (params?.course_id) results = results.filter((s) => s.course_id === params.course_id);
    if (params?.usage_key) results = results.filter((s) => s.usage_key === params.usage_key);
    if (params?.status) results = results.filter((s) => s.status === params.status);
    return results.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  },
};
