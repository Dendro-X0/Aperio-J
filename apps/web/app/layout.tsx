import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { LocalePreferenceSync } from "@/components/locale-preference-sync";
import { getMessages } from "@/i18n/catalog";
import { getServerLocale } from "@/i18n/server";
import { localeToHtmlLang } from "@/i18n/translate";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const messages = getMessages(locale);
  return {
    title: `${messages.app.name} — ${messages.nav.inbox}`,
    description: messages.app.description,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  const messages = getMessages(locale);

  return (
    <html lang={localeToHtmlLang(locale)} suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <I18nProvider locale={locale} messages={messages}>
            <LocalePreferenceSync />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
