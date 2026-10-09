"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#F8F5F2" }}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ color: "#C9A27E" }}
        />
        <p
          className="text-sm font-medium tracking-[0.3em] uppercase"
          style={{ fontFamily: "'Geist', sans-serif", color: "rgba(26,26,26,0.6)" }}
        >
          Redirecting...
        </p>
      </div>
    </div>
  );
}