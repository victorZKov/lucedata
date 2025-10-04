import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { DemoSection } from "@/components/demo-section"
import { DownloadsSection } from "@/components/downloads-section"
import { RoadmapSection } from "@/components/roadmap-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <div id="features">
          <FeaturesSection />
        </div>
        <div id="demo">
          <DemoSection />
        </div>
        <div id="downloads">
          <DownloadsSection />
        </div>
        <div id="roadmap">
          <RoadmapSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
