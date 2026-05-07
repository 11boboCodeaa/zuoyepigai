import { useState } from "react";
import { BookOpen, ScanSearch } from "lucide-react";
import EssayPanel from "./components/EssayPanel";
import SubjectivePanel from "./components/SubjectivePanel";

type Tab = "essay" | "subjective";

export default function App() {
  const [tab, setTab] = useState<Tab>("essay");

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
            批
          </div>
          <div>
            <h1 className="text-lg font-semibold">作业批改助手</h1>
            <p className="text-xs text-gray-500">
              基于通义千问 VL · 作文批改 + 主观题查重
            </p>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1">
          <TabButton
            active={tab === "essay"}
            onClick={() => setTab("essay")}
            icon={<BookOpen size={16} />}
            label="作文批改"
          />
          <TabButton
            active={tab === "subjective"}
            onClick={() => setTab("subjective")}
            icon={<ScanSearch size={16} />}
            label="主观题查重"
          />
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "essay" ? <EssayPanel /> : <SubjectivePanel />}
      </main>

      <footer className="text-center text-xs text-gray-400 py-6">
        仅作辅助批改使用，请以教师最终判断为准
      </footer>
    </div>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 transition ${
        props.active
          ? "border-indigo-500 text-indigo-600"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {props.icon}
      {props.label}
    </button>
  );
}
