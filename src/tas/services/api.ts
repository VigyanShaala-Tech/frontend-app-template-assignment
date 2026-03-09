/**
 * TAS API client
 *
 * All functions currently use mock data. To connect to the real Django backend,
 * replace the mock implementations with axios calls to process.env.TAS_API_URL.
 *
 * Base URL: /api/v1/tas/
 * Auth:     Authorization: Bearer <openedx_jwt>
 */

import type {
  TemplateType,
  TemplatesResponse,
  Template,
  BlockTemplatesResponse,
  Submission,
  SubmissionStatus,
  SubmissionVersionsResponse,
  PdfStatusResponse,
} from '../types';
import {
  MOCK_TEMPLATE_TYPES,
  MOCK_TEMPLATES,
  MOCK_BLOCK_TEMPLATES,
  submissionStore,
  versionStore,
  makeSubmissionId,
  nextVersion,
} from './mockData';

// Simulated network delay (ms) — set to 0 to disable
const MOCK_DELAY = 400;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Template Types ───────────────────────────────────────────────────────────

export const templateTypesApi = {
  list: async (): Promise<{ count: number; results: TemplateType[] }> => {
    await delay(MOCK_DELAY);
    const results = MOCK_TEMPLATE_TYPES.filter((t) => t.is_active);
    return { count: results.length, results };
  },
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const templatesApi = {
  list: async (params?: {
    template_type?: string;
    is_public?: boolean;
    search?: string;
  }): Promise<TemplatesResponse> => {
    await delay(MOCK_DELAY);
    let results = MOCK_TEMPLATES.filter((t) => t.is_active);
    if (params?.is_public) {
      results = results.filter((t) => t.is_public);
    }
    if (params?.template_type) {
      results = results.filter((t) => t.template_type?.slug === params.template_type);
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
    await delay(MOCK_DELAY);
    const tpl = MOCK_TEMPLATES.find((t) => t.id === id);
    if (!tpl) throw new Error(`Template ${id} not found`);
    return tpl;
  },
};

// ─── Block ↔ Template Assignments ─────────────────────────────────────────────

export const blockTemplatesApi = {
  /**
   * GET /blocks/{usage_key}/templates/
   * Returns all templates assigned to a given XBlock usage key.
   */
  list: async (usageKey: string): Promise<BlockTemplatesResponse> => {
    await delay(MOCK_DELAY);
    // Return assigned templates if found, otherwise return all public templates
    const assigned = MOCK_BLOCK_TEMPLATES[usageKey];
    if (assigned) return assigned;

    // Fallback: treat all public templates as assigned to this block
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

export const submissionsApi = {
  /**
   * GET /submissions/
   */
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

  /**
   * POST /submissions/  — create or return existing draft
   */
  createOrGetDraft: async (body: {
    template_block_id: string;
    form_data: Record<string, string>;
    usage_key: string;
    course_id: string;
    student_id: string;
  }): Promise<Submission> => {
    await delay(MOCK_DELAY);

    // Look for existing submission for this student + template_block
    const existing = Object.values(submissionStore).find(
      (s) => s.template_block_id === body.template_block_id && s.student_id === body.student_id,
    );
    if (existing) {
      // Return existing (even if submitted)
      return existing;
    }

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

  /**
   * GET /submissions/{id}/
   */
  get: async (id: string): Promise<Submission> => {
    await delay(MOCK_DELAY);
    const sub = submissionStore[id];
    if (!sub) throw new Error(`Submission ${id} not found`);
    return sub;
  },

  /**
   * PATCH /submissions/{id}/  — auto-save draft
   */
  patch: async (id: string, form_data: Record<string, string>): Promise<Submission> => {
    await delay(MOCK_DELAY);
    const sub = submissionStore[id];
    if (!sub) throw new Error(`Submission ${id} not found`);
    if (sub.status === 'submitted') throw new Error('Cannot edit a submitted assignment');

    const version = nextVersion(id);
    const now = new Date().toISOString();
    const updated: Submission = {
      ...sub,
      form_data,
      version_number: version,
      updated_at: now,
    };
    submissionStore[id] = updated;

    // Snapshot version
    if (!versionStore[id]) versionStore[id] = [];
    versionStore[id].push({ version_number: version, form_data, saved_at: now });

    return updated;
  },

  /**
   * POST /submissions/{id}/submit/  — finalize
   */
  submit: async (id: string): Promise<Submission> => {
    await delay(MOCK_DELAY);
    const sub = submissionStore[id];
    if (!sub) throw new Error(`Submission ${id} not found`);
    if (sub.status === 'submitted') throw new Error('Already submitted');

    const now = new Date().toISOString();
    const updated: Submission = {
      ...sub,
      status: 'submitted',
      submitted_at: now,
      updated_at: now,
      // Simulate PDF URL being generated
      pdf_url: '',
    };
    submissionStore[id] = updated;

    // Simulate async PDF generation completing after 3s
    setTimeout(() => {
      submissionStore[id] = {
        ...submissionStore[id],
        pdf_url: `https://mock-s3.example.com/submissions/${id}.pdf`,
      };
    }, 3000);

    return updated;
  },

  /**
   * GET /submissions/{id}/pdf/
   */
  getPdf: async (id: string): Promise<PdfStatusResponse> => {
    await delay(MOCK_DELAY);
    const sub = submissionStore[id];
    if (!sub) throw new Error(`Submission ${id} not found`);
    if (sub.pdf_url) return { pdf_url: sub.pdf_url };
    return { pdf_url: null, status: 'generating' };
  },

  /**
   * GET /submissions/{id}/versions/
   */
  getVersions: async (id: string): Promise<SubmissionVersionsResponse> => {
    await delay(MOCK_DELAY);
    const versions = versionStore[id] || [];
    return {
      submission_id: id,
      versions: [...versions].sort((a, b) => b.version_number - a.version_number),
    };
  },
};
