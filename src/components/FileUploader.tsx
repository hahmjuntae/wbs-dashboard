"use client";

import { useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface Props {
  onFileLoad: (data: ArrayBuffer, fileName: string) => void;
}

export default function FileUploader({ onFileLoad }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    },
    [onFileLoad],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFile(file);
    },
    [onFileLoad],
  );

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result)
        onFileLoad(e.target.result as ArrayBuffer, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  return (
    <Card
      onClick={openFilePicker}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="mx-auto flex max-w-xl cursor-pointer flex-col items-center border-2 border-dashed p-12 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
    >
      <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
      <p className="mb-2 text-lg font-medium">
        WBS 엑셀 파일을 드래그하거나 클릭하세요
      </p>
      <p className="mb-6 text-sm text-muted-foreground">.xlsx 파일만 지원</p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          openFilePicker();
        }}
      >
        파일 선택
      </Button>
    </Card>
  );
}
