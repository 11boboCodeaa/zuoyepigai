import { useRef, useState } from "react";
import { Upload, ImageIcon, X } from "lucide-react";

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function UploadBox({ file, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    onChange(f);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${
        dragOver
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-300 bg-white hover:border-indigo-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {previewUrl ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={previewUrl}
            alt="预览"
            className="max-h-72 rounded-lg shadow"
          />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ImageIcon size={14} />
            <span className="truncate max-w-[240px]">{file?.name}</span>
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-500 py-6">
          <Upload size={32} />
          <p className="font-medium">点击或拖拽图片到此处上传</p>
          <p className="text-xs">手机端会直接打开相机，支持 jpg/png/webp，最大 10MB</p>
        </div>
      )}
    </div>
  );
}
