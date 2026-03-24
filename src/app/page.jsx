'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import TrustBadges from '@/components/TrustBadges'
import VideoSection from '@/components/VideoSection'
import Categories from '@/components/Categories'
import BrandShowcase from '@/components/BrandShowcase'
import Products from '@/components/Products'
import Footer from '@/components/Footer'

// Default fallback sections shown if no admin config exists
const DEFAULT_SECTIONS = [
  {
    id: 'default-most-loved',
    title: 'Most Loved Products',
    subtitle: 'Discover our top picks for a premium lifestyle',
    filterType: 'flag',
    filterValue: 'isLovedProduct=true',
    productLimit: 8,
    bg: 'bg-white',
    sectionBannerKey: 'most-loved',
    bannerGradient: 'linear-gradient(135deg, #111111 0%, #f26e21 60%, #ff8c42 100%)',
    seeAllLink: '/products',
    isActive: true,
    order: 0,
  },
  {
    id: 'default-new-arrivals',
    title: 'New Arrivals',
    subtitle: 'Fresh drops just for you',
    filterType: 'flag',
    filterValue: 'isNewArrival=true',
    productLimit: 8,
    bg: 'bg-offwhite',
    sectionBannerKey: 'new-arrivals',
    bannerGradient: 'linear-gradient(135deg, #f26e21 0%, #111111 50%, #f26e21 100%)',
    seeAllLink: '/products',
    isActive: true,
    order: 1,
  },
  {
    id: 'default-headphones',
    title: 'Headphones',
    subtitle: 'Immerse yourself in crystal-clear sound',
    filterType: 'category',
    filterValue: 'Headphones',
    productLimit: 8,
    bg: 'bg-white',
    sectionBannerKey: 'headphones',
    bannerGradient: 'linear-gradient(135deg, #ff8c42 0%, #f26e21 40%, #111111 100%)',
    seeAllLink: '/products?category=Headphones',
    isActive: true,
    order: 2,
  },
]

const DEFAULT_VIDEO = {
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Watch & Explore',
  subtitle: 'See our products in action',
  isActive: true,
}

function buildApiUrl(section) {
  if (section.filterType === 'flag') {
    return `/api/product?${section.filterValue}&limit=${section.productLimit}`
  }
  return `/api/product?category=${encodeURIComponent(section.filterValue)}&limit=${section.productLimit}`
}

function buildSeeAllLink(section) {
  if (section.filterType === 'category') {
    return `/products?category=${encodeURIComponent(section.filterValue)}`
  }
  // flag: value is like 'isLovedProduct=true'
  return `/products?${section.filterValue}`
}

export default function Home() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [videoConfig, setVideoConfig] = useState(DEFAULT_VIDEO)

  useEffect(() => {
    fetch('/api/homepage-sections')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        if (data.sections && data.sections.length > 0) {
          setSections(data.sections.filter(s => s.isActive).sort((a, b) => a.order - b.order))
        }
        if (data.video) {
          setVideoConfig(data.video)
        }
      })
      .catch(() => { /* silently fall back to defaults */ })
  }, [])

  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar />
      <Hero />
      <Categories />
      <BrandShowcase />
      {sections.map(section => (
      <Products
          key={section.id}
          title={section.title}
          subtitle={section.subtitle}
          apiUrl={buildApiUrl(section)}
          bg={section.bg}
          section={section.sectionBannerKey || section.id}
          bannerGradient={section.bannerGradient}
          seeAllLink={buildSeeAllLink(section)}
        />
      ))}
      {videoConfig.isActive && <VideoSection config={videoConfig} />}
      <TrustBadges />
      <Footer />
    </div>
  )
}
