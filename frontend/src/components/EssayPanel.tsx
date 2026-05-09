import { useState, useMemo, useRef } from "react";
import {
  Loader2,
  Sparkles,
  AlertCircle,
  FileText,
  FilePenLine,
  Copy,
  Check,
  RefreshCw,
  Award,
  Printer,
  Settings2,
  Camera,
} from "lucide-react";
import UploadBox from "./UploadBox";
import {
  correctEssay,
  ocrTopic,
  EssayResult,
  EssayCorrectOptions,
} from "../api";

const GRADE_OPTIONS = [
  { value: "", label: "（按图中字迹推断）" },
  { value: "小学一年级", label: "小学一年级" },
  { value: "小学二年级", label: "小学二年级" },
  { value: "小学三年级", label: "小学三年级" },
  { value: "小学四年级", label: "小学四年级" },
  { value: "小学五年级", label: "小学五年级" },
  { value: "小学六年级", label: "小学六年级" },
  { value: "初中一年级", label: "初中一年级" },
  { value: "初中二年级", label: "初中二年级" },
  { value: "初中三年级", label: "初中三年级" },
];

const WORD_COUNT_OPTIONS = [
  { value: 0, label: "（按学段默认）" },
  { value: 150, label: "约 150 字（一二年级）" },
  { value: 300, label: "约 300 字（三年级）" },
  { value: 400, label: "约 400 字（四五年级）" },
  { value: 500, label: "约 500 字（五六年级）" },
  { value: 600, label: "约 600 字（初中低年级）" },
  { value: 700, label: "约 700 字（初中高年级）" },
];

export default function EssayPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EssayResult | null>(null);

  // 用户输入：年级 / 字数 / 题目
  const [grade, setGrade] = useState<string>("");
  const [wordCount, setWordCount] = useState<number>(0);
  const [topic, setTopic] = useState<string>("");

  // 题目 OCR：拍题目图识别后回填 textarea
  const topicFileRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  async function handleTopicOcr(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (topicFileRef.current) topicFileRef.current.value = ""; // 让同一张图能再选
    if (!f) return;
    setOcrLoading(true);
    setOcrError(null);
    try {
      const r = await ocrTopic(f);
      const merged =
        r.combined?.trim() ||
        [r.title, r.requirements].filter(Boolean).join("\n");
      if (merged) {
        setTopic(merged);
      } else {
        setOcrError("未从图中识别出题目，请手动输入");
      }
    } catch (err: any) {
      setOcrError(err?.message ?? "题目识别失败");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleSubmit(keepResult = false) {
    if (!file) return;
    setLoading(true);
    setError(null);
    if (!keepResult) setResult(null);
    try {
      const opts: EssayCorrectOptions = {};
      if (grade) opts.grade = grade;
      if (wordCount) opts.wordCount = wordCount;
      if (topic.trim()) opts.topic = topic;
      const res = await correctEssay(file, opts);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? "批改失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-6 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-3">上传作文照片</h2>
          <UploadBox file={file} onChange={setFile} disabled={loading} />

          {/* 输入条件区 */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
              <Settings2 size={13} />
              生成条件（全部选填，留空则自动判断）
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-xs text-gray-600 mb-1">学生年级</span>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none disabled:bg-gray-50"
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-xs text-gray-600 mb-1">范文目标字数</span>
                <select
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  disabled={loading}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none disabled:bg-gray-50"
                >
                  {WORD_COUNT_OPTIONS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">
                  作文题目 / 主旨要求
                </span>
                <button
                  type="button"
                  onClick={() => topicFileRef.current?.click()}
                  disabled={loading || ocrLoading}
                  title="从试卷/习题册拍题目图，自动识别填入"
                  className="text-xs px-2 py-0.5 rounded border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition"
                >
                  {ocrLoading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      识别中...
                    </>
                  ) : (
                    <>
                      <Camera size={12} />
                      拍题目识别
                    </>
                  )}
                </button>
                <input
                  ref={topicFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleTopicOcr}
                />
              </div>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading || ocrLoading}
                rows={2}
                placeholder="例：题目「我的妈妈」，要写出妈妈的外貌、性格和让你感动的一件事。或点右上“拍题目识别”自动填入"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none resize-none disabled:bg-gray-50"
              />
              {ocrError && (
                <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {ocrError}
                </div>
              )}
              <span className="block text-xs text-gray-400 mt-1">
                填了之后，范文会严格按这个题目和要求生成；学生原作如有跑题会被纠正
              </span>
            </div>
          </div>

          <button
            onClick={() => handleSubmit()}
            disabled={!file || loading}
            className="mt-4 w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                批改中（约 60-90 秒）...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                开始批改
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="text-sm whitespace-pre-wrap">{error}</div>
          </div>
        )}

        {result && (
          <EssayReport
            result={result}
            onRegenerate={() => handleSubmit(true)}
            regenerating={loading}
          />
        )}
      </div>

      {/* 仅打印时显示的清洁版面：题目 + 过关范文 */}
      {result && result.model_essay && (
        <div className="print-only">
          <div className="print-essay-document">
            <h1>{result.title || "作文"}</h1>
            <div className="meta">
              {result.genre && <span>{result.genre}　</span>}
              <span>约 {countCnChars(result.model_essay)} 字</span>
            </div>
            {result.model_essay
              .split(/\n+/)
              .filter((p) => p.trim())
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

function EssayReport({
  result,
  onRegenerate,
  regenerating,
}: {
  result: EssayResult;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const annotatedOriginal = useMemo(
    () => annotateTypos(result.recognized_text, result.typos.map((t) => t.wrong)),
    [result.recognized_text, result.typos],
  );

  return (
    <div className="space-y-4">
      {/* 顶部摘要 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold">
              {result.title || "作文批改报告"}
            </h2>
            <div className="text-xs text-gray-500 mt-1">
              {result.genre && (
                <span className="mr-2 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {result.genre}
                </span>
              )}
              全文 {result.word_count} 字
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              title="保留原图与生成条件，让模型重新生成一次"
              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition shrink-0"
            >
              {regenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  重新批改中...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  重新批改
                </>
              )}
            </button>
            {result.score !== null && (
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-600 leading-none">
                  {result.score}
                  <span className="text-sm text-gray-400 ml-1">/ 100</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-amber-50 border-l-4 border-amber-300 px-4 py-3 rounded">
          <div className="text-xs text-amber-700 font-medium mb-1">总评</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {result.overall_comment}
          </div>
        </div>
      </div>

      {/* 过关范文（独占一行，最显眼，带打印 + 复制） */}
      <ModelEssayCard text={result.model_essay} title={result.title} genre={result.genre} />

      {/* 原文 vs 修改稿 左右对比 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <TextPanel
          title="原文识别"
          subtitle="模型从图片识别出的学生原文（错别字已标红）"
          icon={<FileText size={16} className="text-gray-500" />}
          accent="border-gray-200"
          headerBg="bg-gray-50"
        >
          <p className="text-sm leading-8 text-gray-800 whitespace-pre-wrap font-sans">
            {annotatedOriginal}
          </p>
        </TextPanel>

        <TextPanel
          title="修改稿（学生笔法版）"
          subtitle="保留学生原意原话，只改错别字和病句，给学生看"
          icon={<FilePenLine size={16} className="text-emerald-600" />}
          accent="border-emerald-200"
          headerBg="bg-emerald-50"
          copyText={result.revised_text}
        >
          {result.revised_text ? (
            <p className="text-sm leading-8 text-gray-900 whitespace-pre-wrap font-sans">
              {result.revised_text}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">本次未生成修改稿</p>
          )}
        </TextPanel>
      </div>

      {/* 三维点评 */}
      <div className="grid sm:grid-cols-3 gap-4">
        <CommentCard title="结构" text={result.structure_comment} />
        <CommentCard title="立意" text={result.content_comment} />
        <CommentCard title="语言" text={result.language_comment} />
      </div>

      {/* 错别字 */}
      {result.typos.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-semibold mb-3">
            错别字（{result.typos.length}）
          </h3>
          <div className="space-y-2">
            {result.typos.map((t, i) => (
              <div key={i} className="text-sm border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-500 line-through font-medium">
                    {t.wrong}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 font-medium">{t.correct}</span>
                </div>
                {t.context && (
                  <div className="text-xs text-gray-500">原句：{t.context}</div>
                )}
                {t.reason && (
                  <div className="text-xs text-gray-500">说明：{t.reason}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 病句 */}
      {result.sentence_issues.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-semibold mb-3">
            病句修改（{result.sentence_issues.length}）
          </h3>
          <div className="space-y-3">
            {result.sentence_issues.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                {s.issue_type && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 mb-2 inline-block">
                    {s.issue_type}
                  </span>
                )}
                <div className="text-sm text-gray-500 line-through">{s.original}</div>
                <div className="text-sm text-gray-900 mt-1">{s.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 下次写作建议 */}
      {result.suggestions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-semibold mb-3">下次写作建议</h3>
          <ul className="list-decimal list-inside space-y-1 text-sm text-gray-800">
            {result.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 过关范文卡片 —— 全宽显示，带打印 + 复制按钮，是托管老师最重要的产出 */
function ModelEssayCard({
  text,
  title,
  genre,
}: {
  text: string;
  title: string;
  genre: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function handlePrint() {
    window.print();
  }

  if (!text) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Award size={18} className="text-amber-600" />
          <h3 className="text-base font-semibold text-gray-800">过关范文</h3>
        </div>
        <p className="text-sm text-gray-400 italic">
          本次未生成过关范文。可点右上角"重新批改"再试一次。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-300 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-600" />
          <div>
            <div className="text-sm font-semibold text-gray-800">
              过关范文（可让学生抄录学习）
            </div>
            <div className="text-xs text-gray-500">
              {title && <span>题目：{title}　</span>}
              {genre && <span>{genre}　</span>}
              <span>约 {countCnChars(text)} 字</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-2.5 py-1.5 rounded-md bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 flex items-center gap-1 transition"
          >
            {copied ? (
              <>
                <Check size={12} /> 已复制
              </>
            ) : (
              <>
                <Copy size={12} /> 复制
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            title="调用系统打印对话框，可选择蓝牙打印机"
            className="text-xs px-2.5 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1 transition"
          >
            <Printer size={12} /> 打印
          </button>
        </div>
      </div>
      <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
        <p className="text-base leading-9 text-gray-900 whitespace-pre-wrap font-sans">
          {text}
        </p>
      </div>
    </div>
  );
}

function TextPanel({
  title,
  subtitle,
  icon,
  accent,
  headerBg,
  copyText,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  headerBg: string;
  copyText?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${accent}`}>
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-sm font-semibold text-gray-800">{title}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
        </div>
        {copyText && (
          <button
            onClick={handleCopy}
            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1 transition"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-600" /> 已复制
              </>
            ) : (
              <>
                <Copy size={12} /> 复制
              </>
            )}
          </button>
        )}
      </div>
      <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">{children}</div>
    </div>
  );
}

function annotateTypos(text: string, wrongs: string[]): React.ReactNode {
  if (!text) return null;
  const uniqueWrongs = Array.from(new Set(wrongs.filter(Boolean)));
  if (uniqueWrongs.length === 0) return text;
  const escaped = uniqueWrongs.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(re);
  return parts.map((part, i) =>
    uniqueWrongs.includes(part) ? (
      <mark key={i} className="bg-red-100 text-red-700 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function CommentCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className="text-sm text-gray-800 whitespace-pre-wrap">{text || "—"}</div>
    </div>
  );
}

/** 简易统计中文字符数（连续中文字符）*/
function countCnChars(s: string): number {
  if (!s) return 0;
  const m = s.match(/[\u4e00-\u9fa5]/g);
  return m ? m.length : 0;
}
