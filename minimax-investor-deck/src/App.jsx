import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navigation from './components/Navigation';
import Background from './components/Background';

// Import all slides
import Slide01 from './slides/01-hero';
import Slide02 from './slides/02-executive-summary';
import Slide03 from './slides/03-product-matrix';
import Slide04 from './slides/04-technology';
import Slide05 from './slides/05-business-model';
import Slide06 from './slides/06-competitive-advantages';
import Slide07 from './slides/07-future-vision';
import Slide08 from './slides/08-investment-highlights';
import Slide09 from './slides/09-contact';

// Configure slides array
const SLIDES = [
  Slide01,
  Slide02,
  Slide03,
  Slide04,
  Slide05,
  Slide06,
  Slide07,
  Slide08,
  Slide09
];

// Configure navigation items
const NAV_ITEMS = [
  { slideIndex: 0, label: '封面' },
  { slideIndex: 1, label: '执行摘要' },
  { slideIndex: 2, label: '产品矩阵' },
  { slideIndex: 3, label: '技术优势' },
  { slideIndex: 4, label: '商业模式' },
  { slideIndex: 5, label: '竞争优势' },
  { slideIndex: 6, label: '未来愿景' },
  { slideIndex: 7, label: '投资亮点' },
  { slideIndex: 8, label: '联系' }
];

// Slide transition variants
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95
  })
};

const slideTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30
};

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  // Navigate to specific slide
  const goToSlide = useCallback((index) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  }, [currentSlide]);

  // Next slide
  const nextSlide = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide]);

  // Previous slide
  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const CurrentSlideComponent = SLIDES[currentSlide];

  return (
    <div className="h-screen w-screen bg-bg-base overflow-hidden relative">
      {/* Decorative Background */}
      <Background variant="glow" animate={true} />

      {/* Slide Content */}
      <main className="relative h-full w-full z-10">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0 h-full w-full"
          >
            <CurrentSlideComponent />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <Navigation
        currentSlide={currentSlide}
        totalSlides={SLIDES.length}
        navItems={NAV_ITEMS}
        onPrev={prevSlide}
        onNext={nextSlide}
        onGoTo={goToSlide}
      />
    </div>
  );
}
