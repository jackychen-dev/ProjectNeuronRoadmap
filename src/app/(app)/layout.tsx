import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { AutosaveProvider } from "@/hooks/use-autosave";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AutosaveProvider>
      <div className="min-h-screen">
        <Sidebar />
        <Header />
        <main className="ml-64 mt-16 p-6">{children}</main>
      </div>
    </AutosaveProvider>
  );
}
