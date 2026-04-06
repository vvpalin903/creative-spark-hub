import { Layout } from "@/components/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { AdvantagesSection } from "@/components/home/AdvantagesSection";
import { FAQSection } from "@/components/home/FAQSection";
import { ContactSection } from "@/components/home/ContactSection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <CategoriesSection />
      <HowItWorksSection />
      <AdvantagesSection />
      <FAQSection />
      <ContactSection />
    </Layout>
  );
};

export default Index;
