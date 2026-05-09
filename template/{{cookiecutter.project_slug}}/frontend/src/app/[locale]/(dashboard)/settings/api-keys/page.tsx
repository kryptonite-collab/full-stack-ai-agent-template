"use client";

import Link from "next/link";

import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { SettingsSection } from "@/components/settings/settings-section";

export default function ApiKeysSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="API keys"
        description="Authenticate machine-to-machine requests against the API. Keys are shown once on creation; if you lose one, revoke it and create a new one."
      >
        <ApiKeyManager />
      </SettingsSection>

      <SettingsSection
        title="Using your key"
        description="Pass the key in the request header (default: X-API-Key)."
      >
        <pre className="border-foreground/10 bg-foreground/[0.04] overflow-x-auto rounded-xl border p-4 text-xs leading-relaxed">
          <code className="font-mono">{`curl https://api.example.com/v1/conversations \\
  -H "X-API-Key: sk_..."`}</code>
        </pre>
        <p className="text-foreground/55 mt-3 text-xs">
          See the full reference in the{" "}
          <Link
            href="/docs"
            className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline"
          >
            API documentation
          </Link>
          .
        </p>
      </SettingsSection>
    </div>
  );
}
