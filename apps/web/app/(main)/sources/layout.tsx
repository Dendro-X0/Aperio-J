import type { Metadata } from "next";
import { getMessages } from "@/i18n/catalog";
import { getServerLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const messages = getMessages(locale);
  return {
    title: `${messages.app.name} — ${messages.shell.pages.sources}`,
    description: messages.app.description,
  };
}

export default function SourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
