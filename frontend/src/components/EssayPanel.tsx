import { useState, useMemo } from "react";
import { Loader2, Sparkles, AlertCircle, FileText, FilePenLine, Copy, Check, RefreshCw } from "lucide-react";
import UploadBox from "./UploadBox";
import { correctEssay, EssayResult } from "../api";

export default function EssayPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EssayResult | null>(null);

  async function handleSubmit(keepResult = false) {
    if (!file) return;
    setLoading(true);
    setError(null);
    if (!keepResult) setResult(null);
    try {
      const res = await correctEssay(file);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? "批改失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-3">上传作文照片</h2>
        <UploadBox file={file} onChange={setFile} disabled={loading} />
        <button
          onClick={() => handleSubmit()}
          disabled={!file || loading}
          className="mt-4 w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              批改中（约 10-30 秒）...
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
  // 把错别字在原文里高亮出来：找到 wrong 串并替换为带标记的片段
  const annotatedOriginal = useMemo(
    () => annotateTypos(result.recognized_text, result.typos.map((t) => t.wrong)),
    [result.recognized_text, result.typos],
  );

  return (
    <div className="space-y-4">
      {/* 顶部摘要：标题、文体、字数、分数、总评 */}
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
              title="保留原图，让模型重新生成一次修改稿"
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

      {/* 核心：原文 vs 修改稿 左右对比 */}
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
          title="修改稿"
          subtitle="保留学生笔法，只改正错处和理顺逻辑"
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
            <p className="text-sm text-gray-400 italic">
              本次未生成修改稿
            </p>
          )}
        </TextPanel>
      </div>

      {/* 三维点评 */}
      <div className="grid sm:grid-cols-3 gap-4">
        <CommentCard title="结构" text={result.structure_comment} />
        <CommentCard title="立意" text={result.content_comment} />
        <CommentCard title="语言" text={result.language_comment} />
      </div>

      {/* 错别字详表 */}
      {result.typos.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-semibold mb-3">
            错别字（{result.typos.length}）
          </h3>
          <div className="space-y-2">
            {result.typos.map((t, i) => (
              <div
                key={i}
                className="text-sm border border-gray-100 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-500 line-through font-medium">
                    {t.wrong}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 font-medium">
                    {t.correct}
                  </span>
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

      {/* 病句详表 */}
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
                <div className="text-sm text-gray-500 line-through">
                  {s.original}
                </div>
                <div className="text-sm text-gray-900 mt-1">{s.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 给学生的下次写作建议 */}
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

/** 文本面板：左右对比的左侧或右侧卡片 */
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

/** 把错别字在原文里包成红色高亮 span */
function annotateTypos(text: string, wrongs: string[]): React.ReactNode {
  if (!text) return null;
  const uniqueWrongs = Array.from(new Set(wrongs.filter(Boolean)));
  if (uniqueWrongs.length === 0) return text;
  // 用正则一次性切分，escape 特殊字符
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
      <div className="text-sm text-gray-800 whitespace-pre-wrap">
        {text || "—"}
      </div>
    </div>
  );
}
