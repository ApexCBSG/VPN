"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login" || pathname === "/forgot-password" || pathname === "/login/verify-mfa";

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token && !isLoginPage) {
      router.push("/login");
    }
  }, [isLoginPage, router]);

  
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-screen overflow-hidden bg-[#EAEFEF] text-[#25343F]">
        <Toaster position="top-right" toastOptions={{
           style: {
             borderRadius: '12px',
             background: '#25343F',
             color: '#fff',
             fontSize: '13px',
             padding: '12px 24px',
           },
           success: {
              iconTheme: {
                primary: '#FF9B51',
                secondary: '#fff',
              },
           }
        }} />
        {!isLoginPage && (
          <Sidebar 
            isCollapsed={isCollapsed} 
            setIsCollapsed={setIsCollapsed} 
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {!isLoginPage && (
            <TopBar 
               isCollapsed={isCollapsed} 
               pathname={pathname}
               setMobileMenuOpen={setMobileMenuOpen}
            />
          )}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
