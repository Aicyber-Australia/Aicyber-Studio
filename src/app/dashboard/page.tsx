"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/app/api/services/supabase/auth";
import {
  FileText,
  Code,
  Video,
  Image as ImageIcon,
  Palette,
  Plus,
  Paperclip,
  Send
} from "lucide-react";
import Link from "next/link";
import { DashboardSidebar } from "./components/dashboard-sidebar";
import { DashboardNavbar } from "./components/dashboard-navbar";
import { motion } from "framer-motion";

interface CategoryCard {
  category: string;
  title: string;
  icon: React.ReactNode;
  image: string;
}

const categories = [
  { label: "Write", icon: FileText },
  { label: "Code", icon: Code },
  { label: "Video", icon: Video },
  { label: "Image", icon: ImageIcon },
  { label: "Design", icon: Palette },
];

const sampleCards: CategoryCard[] = [
  {
    category: "Write",
    title: "A planning document for a charity run event",
    icon: <FileText className="h-4 w-4" />,
    image: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    category: "Code",
    title: "A sorting activity for my class",
    icon: <Code className="h-4 w-4" />,
    image: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    category: "Video",
    title: "Create a claymation sequence for a children's short",
    icon: <Video className="h-4 w-4" />,
    image: "linear-gradient(135deg, #ffa751 0%, #ffe259 100%)",
  },
  {
    category: "Design",
    title: "A minimalist logo for my creative design studio 'Borcelle'",
    icon: <Palette className="h-4 w-4" />,
    image: "linear-gradient(135deg, #b47aea 0%, #e47eb5 100%)",
  },
  {
    category: "Image",
    title: "A cat playing with a ball of yellow yarn",
    icon: <ImageIcon className="h-4 w-4" />,
    image: "linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)",
  },
  {
    category: "Code",
    title: "A vocab matching game",
    icon: <Code className="h-4 w-4" />,
    image: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollYProgress, setScrollYProgress] = useState(0);

  // Use scroll event listener instead of useScroll to avoid hydration issues
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollY = containerRef.current.scrollTop;
        setScrollYProgress(scrollY);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Calculate animation values based on scroll
  const heroOpacity = Math.max(0, 1 - scrollYProgress / 300);
  const heroScale = Math.max(0.95, 1 - scrollYProgress / 6000);
  const inputY = Math.min(0, -scrollYProgress / 3);
  const showFloatingInput = scrollYProgress > 250 ? Math.min(1, (scrollYProgress - 250) / 100) : 0;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { user } = await getCurrentUser();
      setIsAuthenticated(!!user);
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-12 w-full max-w-2xl mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <span className="text-xl font-bold text-black">AICyber Studio</span>
              </Link>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => router.push("/auth/login")}>
                Log in
              </Button>
              <Button className="bg-black hover:bg-zinc-800 text-white" onClick={() => router.push("/auth/signup")}>
                Sign up
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-5xl font-bold mb-6 text-black">
              Step into a world of learning
            </h1>
            <p className="text-xl text-zinc-600 mb-8">
              Sign in to unlock powerful AI-driven creative tools
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="bg-black hover:bg-zinc-800 text-white" onClick={() => router.push("/auth/signup")}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push("/auth/login")}>
                Sign In
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {sampleCards.map((card, index) => (
              <div
                key={index}
                className="group rounded-lg overflow-hidden border border-zinc-200 bg-white hover:shadow-md hover:border-zinc-400 transition-all cursor-pointer"
              >
                <div className="h-48 flex items-center justify-center bg-zinc-100">
                  <div className="text-zinc-400">{card.icon}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-zinc-900">{card.category}</span>
                  </div>
                  <p className="text-sm text-zinc-600 line-clamp-2">{card.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 relative">

      <DashboardNavbar userEmail={userEmail} />

      <div className="flex pt-14">
        <DashboardSidebar />

        <main ref={containerRef} className="flex-1 overflow-auto h-[calc(100vh-3.5rem)] relative">
          {/* Hero Section - Centered Vertically */}
          <motion.div
            animate={{ opacity: heroOpacity, scale: heroScale }}
            transition={{ duration: 0 }}
            className="min-h-[80vh] flex flex-col items-center justify-center px-12 py-16"
          >
            <div className="text-center w-full max-w-6xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-5xl font-semibold text-zinc-900 mb-12"
              >
                What are we creating today, {userEmail?.split("@")[0] || "User"}?
              </motion.h1>

              {/* Large Input Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: inputY }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-4xl mx-auto mb-8"
              >
                <div className="relative bg-white rounded-2xl border-2 border-zinc-200 shadow-lg hover:shadow-xl hover:border-zinc-300 transition-all">
                  <textarea
                    placeholder="Start with a creative idea or task"
                    className="w-full px-6 pt-6 pb-4 text-base resize-none outline-none rounded-2xl bg-transparent min-h-[140px]"
                    rows={4}
                  />
                  <div className="flex items-center justify-between px-4 pb-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
                        <Plus className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </div>
                    <Button size="icon" className="h-9 w-9 rounded-full bg-zinc-900 hover:bg-zinc-700 text-white">
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Category Pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap gap-3 justify-center"
              >
                {categories.map((cat, idx) => (
                  <motion.button
                    key={cat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 + idx * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white hover:bg-zinc-700 transition-colors text-sm font-medium shadow-md"
                  >
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Floating Input - Appears on scroll */}
          <motion.div
            animate={{ opacity: showFloatingInput }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className="pointer-events-auto bg-white rounded-full border-2 border-zinc-300 shadow-2xl px-6 py-3 flex items-center gap-3 max-w-2xl">
              <input
                type="text"
                placeholder="What do you want to create?"
                className="flex-1 outline-none bg-transparent text-sm min-w-[400px]"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon" className="h-8 w-8 rounded-full bg-zinc-900 hover:bg-zinc-700">
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
          </motion.div>

          {/* Scrollable Content */}
          <div className="w-full px-12 pb-16">
            {/* Inspiration Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-20"
            >
              <h2 className="text-2xl font-semibold text-zinc-900 mb-8">Get Inspired</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {sampleCards.map((card, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    onClick={() => router.push("/workflow")}
                    className="group cursor-pointer rounded-xl overflow-hidden bg-white hover:shadow-xl transition-shadow"
                  >
                    <div className="aspect-video bg-zinc-100 flex items-center justify-center relative overflow-hidden">
                      <div className="text-zinc-300 group-hover:text-zinc-400 transition-colors scale-150">
                        {card.icon}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide">{card.category}</p>
                      <p className="text-sm text-zinc-900 font-medium line-clamp-2">{card.title}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Recent Projects */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-semibold text-zinc-900 mb-8">Recent Projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {/* New Project Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/workflow")}
                  className="group cursor-pointer rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors aspect-[4/3] flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">New Project</p>
                </motion.div>

                {/* Sample Project Cards */}
                {sampleCards.slice(0, 3).map((card, index) => (
                  <motion.div
                    key={`recent-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: (index + 1) * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -4 }}
                    className="group cursor-pointer"
                    onClick={() => router.push("/workflow")}
                  >
                    <div className="rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow mb-3">
                      <div className="aspect-[4/3] bg-zinc-100 flex items-center justify-center">
                        <div className="text-zinc-300 scale-150 group-hover:scale-[1.6] transition-transform">
                          {card.icon}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 mb-1">Untitled</p>
                      <p className="text-xs text-zinc-500">Last edited on {new Date().toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
