"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  Loader2Icon,
  PrinterIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function QrPanel({
  restaurantName,
  scanUrl,
  menuPath,
  initialDataUrl,
}: {
  restaurantName: string;
  scanUrl: string;
  menuPath: string;
  initialDataUrl: string;
}) {
  const [copied, setCopied] = useState<"none" | "scan" | "menu">("none");
  const [downloading, setDownloading] = useState<string | null>(null);

  async function copy(value: string, which: "scan" | "menu") {
    await navigator.clipboard.writeText(value);
    setCopied(which);
    toast.success("تم النسخ");
    setTimeout(() => setCopied("none"), 2000);
  }

  async function download(format: "png" | "svg" | "badge") {
    setDownloading(format);
    try {
      const response = await fetch(`/api/qr/${format}`);
      if (!response.ok) throw new Error();

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-${restaurantName}.${format === "png" ? "png" : "svg"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("تم التنزيل");
    } catch {
      toast.error("فشل التنزيل");
    } finally {
      setDownloading(null);
    }
  }

  function print() {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }

    win.document.write(`
      <!doctype html>
      <html dir="rtl" lang="ar">
        <head>
          <title>رمز QR — ${restaurantName}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column;
                   align-items: center; justify-content: center; min-height: 100vh;
                   margin: 0; text-align: center; }
            img { width: 380px; height: 380px; }
            h1 { font-size: 32px; margin: 24px 0 8px; }
            p { color: #666; margin: 0; }
          </style>
        </head>
        <body>
          <img src="${initialDataUrl}" alt="QR" />
          <h1>${restaurantName}</h1>
          <p>امسح الكود لعرض المنيو</p>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">معاينة الرمز</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5">
          <div className="rounded-2xl border border-border bg-white p-5">
            <Image
              src={initialDataUrl}
              alt="رمز QR الخاص بالمنيو"
              width={256}
              height={256}
              unoptimized
              className="size-64"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => download("png")} disabled={downloading !== null}>
              {downloading === "png" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <DownloadIcon className="size-4" />
              )}
              PNG
            </Button>
            <Button
              variant="outline"
              onClick={() => download("svg")}
              disabled={downloading !== null}
            >
              {downloading === "svg" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <DownloadIcon className="size-4" />
              )}
              SVG (للطباعة)
            </Button>
            <Button variant="outline" onClick={print}>
              <PrinterIcon className="size-4" />
              طباعة
            </Button>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => download("badge")}
            disabled={downloading !== null}
          >
            {downloading === "badge" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
            تنزيل لوحة طاولة جاهزة
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الروابط</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">رابط الرمز الدائم</span>
              <Badge variant="secondary" className="text-[10px]">
                لا يتغير
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              هذا ما يشفّره الرمز. لا تشاركه مع الزوار مباشرة.
            </p>
            <div className="flex items-center gap-2">
              <code
                dir="ltr"
                className="flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-xs"
              >
                {scanUrl}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => copy(scanUrl, "scan")}
              >
                {copied === "scan" ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">الرابط العام للمنيو</span>
              <Badge className="text-[10px]">قابل للتعديل</Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              شارك هذا الرابط مع زبائنك. يمكنك تغييره من الإعدادات دون أن يتأثر
              الرمز.
            </p>
            {menuPath && (
              <div className="flex items-center gap-2">
                <code
                  dir="ltr"
                  className="flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-xs"
                >
                  {menuPath}
                </code>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    copy(`${window.location.origin}${menuPath}`, "menu")
                  }
                >
                  {copied === "menu" ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}