import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";

export default function GmLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Topbar />

      {/* Main workspace area — offset by sidebar (72px) and topbar (56px) */}
      <main
        className="transition-all pt-14"
        style={{ marginLeft: "72px" }}
      >
        <div className="p-5 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
