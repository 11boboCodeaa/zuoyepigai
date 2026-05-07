import { useState } from "react";
import { Loader2, Sparkles, AlertCircle, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import UploadBox from "./UploadBox";
import { correctSubjective, SubjectiveResult, CopyVerdict } from "../api";

export default function SubjectivePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubjectiveResult | null>(null);

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await correctSubjective(file, reference);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? "批改失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold mb-2">上传学生作答</h2>
          <UploadBox file={file} onChange={setFile} disabled={loading} />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            参考答案
            <span className="text-xs font-normal text-gray-400">
              （可选，但提供后查重判定更准）
            </span>
          </label>
          <textarea
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={loading}
            placeholder={
              "把每道题的标准答案粘贴到这里。\n多题之间空行或编号分隔，例如：\n1. 表达了作者对故乡的思念之情。\n2. 通过对比手法突出了人物性格。"
            }
            rows={6}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              批改中...
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

      {result && <SubjectiveReport result={result} />}
    </div>
  );
}

const VERDICT_STYLE: Record<
  CopyVerdict,
  { color: string; bg: string; border: string; icon: React.ReactNode; label: string }
> = {
  独立表达: {
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: <CheckCircle2 size={14} />,
    label: "独立表达",
  },
  部分照搬: {
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: <AlertTriangle size={14} />,
    label: "部分照搬",
  },
  照搬答案: {
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <XCircle size={14} />,
    label: "照搬答案",
  },
  答案错误: {
    color: "text-gray-700",
    bg: "bg-gray-100",
    border: "border-gray-200",
    icon: <XCircle size={14} />,
    label: "答案错误",
  },
};

function SubjectiveReport({ result }: { result: SubjectiveResult }) {
  return (
    <div className="space-y-4">
      {result.summary && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-2">整体批注</h2>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {result.summary}
          </p>
        </div>
      )}

      {result.items.map((item, i) => {
        const style = VERDICT_STYLE[item.copy_verdict] ?? VERDICT_STYLE["独立表达"];
        return (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm font-semibold text-gray-700">
                第 {i + 1} 题{item.question ? ` · ${item.question}` : ""}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${style.bg} ${style.color} border ${style.border}`}
                >
                  {style.icon}
                  {style.label}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    item.correctness === "正确"
                      ? "bg-green-50 text-green-700"
                      : item.correctness === "部分正确"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {item.correctness}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">学生作答</div>
              <div className="text-sm bg-gray-50 rounded p-3 whitespace-pre-wrap">
                {item.student_answer}
              </div>
            </div>

            {item.reference_answer && (
              <div>
                <div className="text-xs text-gray-500 mb-1">参考答案</div>
                <div className="text-sm bg-blue-50 rounded p-3 whitespace-pre-wrap">
                  {item.reference_answer}
                </div>
              </div>
            )}

            {item.similarity_explanation && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">查重依据：</span>
                {item.similarity_explanation}
              </div>
            )}

            {item.teacher_comment && (
              <div className="bg-amber-50 border-l-4 border-amber-300 px-3 py-2 rounded text-sm text-gray-800 whitespace-pre-wrap">
                {item.teacher_comment}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
