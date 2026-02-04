"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  Menu, 
  X, 
  Trophy, 
  BookOpen, 
  GraduationCap, 
  Briefcase,
  Target,
  Lightbulb,
  Users,
  Globe,
  Calendar,
  Facebook,
  Twitter,
  Linkedin,
  Youtube
} from 'lucide-react';

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl">TCET</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="hover:text-blue-400 transition">Home</a>
              <a href="#" className="hover:text-blue-400 transition">Courses</a>
              <a href="#" className="hover:text-blue-400 transition">Admission</a>
              <a href="#" className="hover:text-blue-400 transition">Students</a>
              <a href="#" className="hover:text-blue-400 transition">Facilities</a>
            </div>

            <Link href="/login" className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg transition">
              Login
            </Link>

            <button 
              className="md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Thakur College of<br />
              <span className="text-blue-400">Engineering &<br />Technology</span>
            </h1>
            <p className="text-gray-400 max-w-2xl text-lg">
              Shaping the engineers of the future. Explore innovative research, and 
              excel in a dynamic academic environment
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            <div>
              <div className="text-4xl font-bold text-blue-400">100+</div>
              <div className="text-gray-400 mt-2">Faculty</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400">95.7%</div>
              <div className="text-gray-400 mt-2">Placement</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400">1700</div>
              <div className="text-gray-400 mt-2">Students</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400">5000+</div>
              <div className="text-gray-400 mt-2">Alumni</div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Performance */}
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Institutional Performance</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {[
              { value: '95%', label: 'Academic Excellence', icon: GraduationCap },
              { value: '100%', label: 'Industry Connect', icon: Briefcase },
              { value: '1500+', label: 'Research Papers', icon: BookOpen },
              { value: '85%', label: 'Higher Studies', icon: Target },
              { value: '90%', label: 'Innovation Rate', icon: Lightbulb },
              { value: '75%', label: 'International Exposure', icon: Globe }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-24 h-24 mx-auto rounded-full border-4 border-blue-500 flex items-center justify-center mb-4 relative">
                    <span className="text-2xl font-bold text-blue-400">{item.value}</span>
                    <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-2">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Achievements & Recognitions */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">ACHIEVEMENTS & RECOGNITIONS</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Trophy, title: 'NAAC A+ Accreditation', desc: 'Highest grade certification' },
              { icon: BookOpen, title: 'NBA Accredited', desc: 'All programs approved' },
              { icon: GraduationCap, title: 'University Rank Holders', desc: 'Top performing students' },
              { icon: Briefcase, title: 'Industry Partnerships', desc: '100+ MoUs with companies' }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition group">
                  <Icon className="w-12 h-12 mb-4 text-blue-400 group-hover:scale-110 transition" />
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Institutional Guiding Force */}
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Institutional Guiding Force</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: 'Vision',
                subtitle: 'Global Leaders',
                points: [
                  'Innovative Education',
                  'Research Excellence',
                  'Ethical Values',
                  'Sustainable Development'
                ]
              },
              {
                icon: Lightbulb,
                title: 'Mission',
                subtitle: 'Quality Education',
                points: [
                  'State-of-art Infrastructure',
                  'Industry-ready Curriculum',
                  'Experiential Learning',
                  'Holistic Development'
                ]
              },
              {
                icon: Trophy,
                title: 'Strategic Objectives',
                subtitle: 'Excellence Framework',
                points: [
                  'Academic Excellence',
                  'Research & Innovation',
                  'Industry Collaboration',
                  'Global Exposure'
                ]
              }
            ].map((section, index) => {
              const Icon = section.icon;
              return (
                <div key={index} className="bg-gray-900 p-8 rounded-lg border border-gray-800 hover:border-blue-500 transition">
                  <Icon className="w-12 h-12 text-blue-400 mb-4" />
                  <div className="text-blue-400 text-xl font-bold mb-2">{section.title}</div>
                  <div className="text-2xl font-bold mb-6">{section.subtitle}</div>
                  <ul className="space-y-3">
                    {section.points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span className="text-gray-300">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Latest Updates */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">Latest Updates</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                category: 'Campus Activities',
                date: '20 Jan 2025',
                title: 'Annual Technical Fest TechX 2025 announced',
                desc: 'Three-day extravaganza featuring coding competitions, hackathons and tech talks'
              },
              {
                category: 'Alumni Updates',
                date: '18 Jan 2025',
                title: 'Alumni of the Month: Priya Sharma',
                desc: 'Software Engineer at Google, Class of 2020 shares her journey'
              },
              {
                category: 'Announcements',
                date: '15 Jan 2025',
                title: 'New Courses for Academic Year 2025-26',
                desc: 'Introduction of AI & ML specialization and Data Science programs'
              }
            ].map((update, index) => (
              <div key={index} className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-blue-400 text-sm">{update.category}</span>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{update.date}</span>
                  </div>
                </div>
                <h3 className="font-semibold mb-2 group-hover:text-blue-400 transition">{update.title}</h3>
                <p className="text-sm text-gray-400">{update.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="font-bold text-xl">TCET</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Empowering minds, shaping futures through quality education and innovation
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 transition">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 transition">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 transition">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 transition">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">RESOURCES</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-blue-400">Academics</a></li>
                <li><a href="#" className="hover:text-blue-400">Admissions</a></li>
                <li><a href="#" className="hover:text-blue-400">Research</a></li>
                <li><a href="#" className="hover:text-blue-400">Placements</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">SUPPORT</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-blue-400">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-400">FAQ</a></li>
                <li><a href="#" className="hover:text-blue-400">Career</a></li>
                <li><a href="#" className="hover:text-blue-400">Alumni</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            <p>© 2025 Thakur College of Engineering & Technology. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}