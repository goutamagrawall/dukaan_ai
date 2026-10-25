import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Dukaan AI — Your business, in your voice", description: "A multilingual business companion for Indian shopkeepers. Record sales, manage udhaar, and understand your business with your voice.", icons:{icon:"/favicon.svg"} };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
