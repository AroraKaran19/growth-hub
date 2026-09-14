"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/app/components/shared/Navbar/Navbar";
import MemberNavbar from "@/app/components/shared/Navbar/MemberNavbar";
import { MEMBER_NAV_PREFIXES } from "@/data/navigation";
import Footer from "@/app/components/shared/Footer/Footer";
import { ToastContainer } from "react-toastify";

// Routes that render standalone, with no navbar or footer. Exact matches in
// NO_LAYOUT; path prefixes in NO_LAYOUT_PREFIXES (covers dynamic routes).
const NO_LAYOUT: string[] = [];
const NO_LAYOUT_PREFIXES: string[] = [
  "/track",
  "/dev",
  "/invoice",
  "/partner",
  "/admin",
];

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const showLayout =
    !NO_LAYOUT.includes(pathname) &&
    !NO_LAYOUT_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

  return (
    <>
      {showLayout &&
        (MEMBER_NAV_PREFIXES.some((p) => pathname.startsWith(p)) ? (
          <MemberNavbar />
        ) : (
          <Navbar />
        ))}
      <main className="w-full grow">{children}</main>
      {showLayout && <Footer />}

      <ToastContainer
        position="top-right"
        autoClose={500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover={false}
        theme="light"
        className="toast-container"
        limit={1}
      />
    </>
  );
};

export default LayoutWrapper;
