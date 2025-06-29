import React from 'react';
import { 
  CheckCircle, 
  Users, 
  Calendar, 
  Shield, 
  Bell, 
  BarChart3, 
  Clock, 
  FileText,
  Star,
  ArrowRight,
  Play
} from 'lucide-react';

export default function LandingPage({ onNavigateToAuth, onNavigateToPricing }) {
  const features = [
    {
      icon: <CheckCircle className="w-8 h-8 text-blue-600" />,
      title: "Digital Certificate Tracking",
      description: "Easily track all staff certifications and qualifications in one centralized digital platform."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-600" />,
      title: "Powerful Gap Analysis",
      description: "See at a glance which staff need training to meet compliance requirements with visual dashboards."
    },
    {
      icon: <Calendar className="w-8 h-8 text-purple-600" />,
      title: "Smart Planning Tools",
      description: "Better planning for training sessions and resource allocation with intelligent scheduling."
    },
    {
      icon: <Shield className="w-8 h-8 text-red-600" />,
      title: "Centralized Platform",
      description: "Eliminate confusing spreadsheets and centralize everything in one secure, organized platform."
    },
    {
      icon: <Bell className="w-8 h-8 text-yellow-600" />,
      title: "Automated Reminders",
      description: "Never miss renewals or re-certifications with automated notifications for staff and managers."
    },
    {
      icon: <FileText className="w-8 h-8 text-indigo-600" />,
      title: "Audit-Ready Reports",
      description: "Improved oversight with dashboards and reports that make audits and inspections stress-free."
    }
  ];

  const benefits = [
    {
      icon: <Clock className="w-6 h-6 text-blue-600" />,
      title: "Save Time",
      description: "Reduce admin work for HR and compliance teams by up to 75%"
    },
    {
      icon: <Users className="w-6 h-6 text-green-600" />,
      title: "Better Compliance",
      description: "Ensure 100% compliance with automated tracking and reminders"
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-purple-600" />,
      title: "Clear Insights",
      description: "Get instant visibility into your team's qualification status"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "HR Director",
      company: "TechCorp Solutions",
      content: "This platform transformed how we manage staff qualifications. We've reduced admin time by 80% and never miss a renewal.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Compliance Manager",
      company: "HealthFirst Medical",
      content: "The gap analysis feature is incredible. We can instantly see who needs training and plan accordingly. Audits are now stress-free.",
      rating: 5
    },
    {
      name: "Emma Thompson",
      role: "Operations Manager",
      company: "BuildSafe Construction",
      content: "Finally, a solution that actually works! No more spreadsheet nightmares. Everything is organized and automated.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-2" />
                                  <span className="text-xl font-bold text-gray-900">StaffCertify</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigateToPricing()}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => onNavigateToAuth('login')}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigateToAuth('signup')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                Master Your Team's
                <span className="text-blue-600 block">Qualifications</span>
              </h1>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Transform chaos into clarity. Track certifications, ensure compliance, and eliminate spreadsheet nightmares with our intelligent qualification management platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => onNavigateToAuth('signup')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center"
                >
                  Start 30-Day Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <button className="border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all flex items-center justify-center">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-t-lg mb-6"></div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Staff Compliance</span>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">98%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-[98%]"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">156</div>
                      <div className="text-sm text-gray-600">Up to Date</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">12</div>
                      <div className="text-sm text-gray-600">Expiring Soon</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">3</div>
                      <div className="text-sm text-gray-600">Expired</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose StaffCertify?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of organizations who've transformed their qualification management
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage qualifications efficiently and stay compliant
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trusted by Industry Leaders</h2>
                            <p className="text-xl text-gray-600">See what our customers say about StaffCertify</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                  <div className="text-sm text-gray-500">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Qualification Management?</h2>
          <p className="text-xl text-blue-100 mb-8">
                                Join thousands of organizations saving time and staying compliant with StaffCertify
          </p>
          <button
            onClick={() => onNavigateToAuth('signup')}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center"
          >
            Start Your 30-Day Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <p className="text-blue-100 mt-4 text-sm">No credit card required • Cancel anytime • Full support included</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Shield className="w-8 h-8 text-blue-400 mr-2" />
                                    <span className="text-xl font-bold">StaffCertify</span>
              </div>
              <p className="text-gray-400">
                The modern solution for qualification and certification management.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                            <p className="text-gray-400">© 2024 StaffCertify. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 