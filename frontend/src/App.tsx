import EssayPanel from "./components/EssayPanel";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
            批
          </div>
          <h1 className="text-lg font-semibold">讲讲的作业批改助手</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <EssayPanel />
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 no-print">
        仅作辅助批改使用，请以教师最终判断为准
      </footer>
    </div>
  );
}
