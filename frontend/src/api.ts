export interface TypoItem {
  wrong: string;
  correct: string;
  context: string;
  reason: string;
}

export interface SentenceIssue {
  original: string;
  suggestion: string;
  issue_type: string;
}

export interface EssayCorrectOptions {
  topic?: string;
  grade?: string;
  wordCount?: number;
}

export interface EssayResult {
  recognized_text: string;
  title: string;
  genre: string;
  word_count: number;
  typos: TypoItem[];
  sentence_issues: SentenceIssue[];
  revised_text: string;
  model_essay: string;
  structure_comment: string;
  content_comment: string;
  language_comment: string;
  overall_comment: string;
  score: number | null;
  suggestions: string[];
}

export type CopyVerdict = "独立表达" | "照搬答案" | "答案错误" | "部分照搬";

export interface SubjectiveQuestionItem {
  question: string;
  student_answer: string;
  reference_answer: string;
  correctness: "正确" | "部分正确" | "错误";
  copy_verdict: CopyVerdict;
  similarity_explanation: string;
  teacher_comment: string;
}

export interface SubjectiveResult {
  items: SubjectiveQuestionItem[];
  summary: string;
}

export interface TopicOcrResult {
  title: string;
  requirements: string;
  combined: string;
}

// API 基础地址：
// - 本地开发：留空，走 Vite 代理（/api 转发到 localhost:8000）
// - 生产构建：通过 VITE_API_BASE_URL 注入后端公网地址，例如 https://xxx.onrender.com
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

// 访问令牌：服务端配置 ACCESS_TOKEN 时，前端必须在 X-Access-Token 头里带上一致的值
// 通过 VITE_ACCESS_TOKEN 在构建时注入；本地开发未配置时为空，请求头不会带这个字段
const ACCESS_TOKEN = (import.meta.env.VITE_ACCESS_TOKEN ?? "").trim();

function buildUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function buildHeaders(): HeadersInit {
  return ACCESS_TOKEN ? { "X-Access-Token": ACCESS_TOKEN } : {};
}

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const resp = await fetch(buildUrl(path), {
    method: "POST",
    body: form,
    headers: buildHeaders(),
  });
  if (!resp.ok) {
    let msg = `请求失败 ${resp.status}`;
    try {
      const j = await resp.json();
      msg = j.detail ?? JSON.stringify(j);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return resp.json();
}

export function correctEssay(
  image: File,
  options?: EssayCorrectOptions,
): Promise<EssayResult> {
  const fd = new FormData();
  fd.append("image", image);
  if (options?.topic && options.topic.trim()) fd.append("topic", options.topic.trim());
  if (options?.grade && options.grade.trim()) fd.append("grade", options.grade.trim());
  if (options?.wordCount && options.wordCount > 0)
    fd.append("target_word_count", String(options.wordCount));
  return postForm<EssayResult>("/api/correct/essay", fd);
}

export function ocrTopic(image: File): Promise<TopicOcrResult> {
  const fd = new FormData();
  fd.append("image", image);
  return postForm<TopicOcrResult>("/api/ocr/topic", fd);
}

export function correctSubjective(
  image: File,
  reference: string
): Promise<SubjectiveResult> {
  const fd = new FormData();
  fd.append("image", image);
  if (reference.trim()) fd.append("reference", reference);
  return postForm<SubjectiveResult>("/api/correct/subjective", fd);
}
