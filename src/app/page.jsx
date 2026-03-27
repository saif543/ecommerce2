'use client'

import React, { useState, useEffect } from 'react'
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
    bg: 'bg-[#fafafa]',
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
    bg: 'bg-[#f5f3ef]',
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
    bg: 'bg-[#fafafa]',
    sectionBannerKey: 'headphones',
    bannerGradient: 'linear-gradient(135deg, #ff8c42 0%, #f26e21 40%, #111111 100%)',
    seeAllLink: '/products?category=Headphones',
    isActive: true,
    order: 2,
  },
]

const DEFAULT_VIDEO = {
  title: 'Watch & Explore',
  subtitle: 'See our products in action',
  isActive: true,
  videos: [
    { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', label: 'Featured Product' },
    { youtubeUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0', label: 'Top Picks' },
    { youtubeUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', label: 'New Arrivals' },
  ],
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

function buildBannerKey(section) {
  if (section.sectionBannerKey) return section.sectionBannerKey
  if (section.filterType === 'flag') {
    return section.filterValue.split('=')[0] // 'isLovedProduct'
  }
  return `category-${section.filterValue.toLowerCase().replace(/\s+/g, '-')}`
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
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #ffffff 0%, #f8f8f8 15%, #f5f3f0 50%, #f8f8f8 85%, #f0ece6 100%)" }}>
      <Navbar />
      <Hero />
      <Categories />
      <BrandShowcase />
      {sections.map((section, i) => (
        <React.Fragment key={section.id}>
          <Products
            title={section.title}
            subtitle={section.subtitle}
            apiUrl={buildApiUrl(section)}
            bg={section.bg}
            section={buildBannerKey(section)}
            bannerGradient={section.bannerGradient}
            seeAllLink={buildSeeAllLink(section)}
          />
          {i === 0 && videoConfig.isActive && <VideoSection config={videoConfig} />}
        </React.Fragment>
      ))}
      <TrustBadges />
      <Footer />
    </div>
  )
}
