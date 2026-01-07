import { ReactNode, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import authBackground from "@/assets/auth-background.png";

interface AuthLayoutProps {
  children: ReactNode;
  currentStep?: number;
  totalSteps?: number;
}

const testimonials = [
  {
    quote: "Find the perfect deal securely and effortlessly. Connect with the right buyers and sellers today—fast, safe, and seamless!",
    title: "Verified by Industry Experts",
    subtitle: "Trusted by users worldwide",
  },
  {
    quote: "The most trusted platform for business transactions. Our secure process ensures peace of mind at every step.",
    title: "Verified by Industry Experts",
    subtitle: "Trusted by users worldwide",
  },
  {
    quote: "Join thousands of successful buyers and sellers. Experience the future of business acquisitions today.",
    title: "Verified by Industry Experts",
    subtitle: "Trusted by users worldwide",
  },
];

export const AuthLayout = ({ children, currentStep = 1, totalSteps = 4 }: AuthLayoutProps) => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col p-8 lg:p-16 bg-background">
        <Link to="/" className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-[0_10px_25px_rgba(215,255,52,0.45)]">
            <span className="text-xl font-extrabold text-accent-foreground">EX</span>
          </div>
        </Link>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[460px]">
            {children}
          </div>
        </div>

        {/* Progress Dots */}
        {totalSteps > 1 && (
          <div className="flex gap-2 justify-center mt-8">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx + 1 === currentStep
                    ? "w-12 bg-primary"
                    : "w-2 bg-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Panel - Background & Testimonial */}
      <div 
        className="hidden lg:flex flex-1 relative items-end p-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${authBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="backdrop-blur-xl bg-background/10 rounded-3xl p-8 border border-white/20">
            <blockquote className="text-white text-2xl font-medium mb-8 leading-relaxed">
              "{testimonials[activeTestimonial].quote}"
            </blockquote>
            
            <div className="space-y-2">
              <h3 className="text-white text-xl font-semibold">
                {testimonials[activeTestimonial].title}
              </h3>
              <p className="text-white/80">
                {testimonials[activeTestimonial].subtitle}
              </p>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 fill-accent"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="flex gap-3 mt-6 justify-end">
            <button
              onClick={prevTestimonial}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={nextTestimonial}
              className="w-12 h-12 rounded-full bg-white backdrop-blur-sm flex items-center justify-center hover:bg-white/90 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
