import React, { useState } from 'react';
import { 
  CheckCircle, 
  Users, 
  Calendar, 
  Shield, 
  ShieldCheck,
  Bell, 
  BarChart3, 
  Clock, 
  FileText,
  Star,
  ArrowRight,
  AlertTriangle,
  Upload,
  Eye,
  Zap,
  Lock,
  Award,
  ChevronDown,
  ChevronUp,
  Crown,
  Check,
  X
} from 'lucide-react';

export default function LandingPage({ onNavigateToAuth, onNavigateToPricing }) {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Care Home Manager",
      company: "Sunrise Care Home",
      content: "TeamCertify has taken a huge weight off my shoulders. I can prepare for a CQC inspection with confidence now.",
      rating: 5
    },
    {
      name: "Michael Thompson",
      role: "Compliance Lead",
      company: "Haven Care Services",
      content: "We've gone from spending hours on spreadsheets to having everything automated. The peace of mind is invaluable.",
      rating: 5
    },
    {
      name: "Emma Wilson",
      role: "Deputy Manager",
      company: "Meadowbrook Residential",
      content: "The color-coded dashboard shows me exactly what needs attention. No more sleepless nights worrying about expired certificates.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "Is it easy to set up?",
      answer: "Yes, you can be up and running in minutes! Simply import your staff list, add their certificates, and set expiry dates. Our team provides free onboarding support to help you get started."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use industry-leading security with UK-based data storage, encryption, and regular security audits. Your sensitive staff data is completely protected and compliant with GDPR."
    },
    {
      question: "What happens after my trial ends?",
      answer: "You can choose a plan that suits your team size and needs. There's no commitment during the trial - you can cancel anytime with no questions asked."
    },
    {
      question: "Is it suitable for CQC compliance?",
      answer: "Yes, TeamCertify was designed specifically to help care providers meet CQC evidence requirements. Generate compliance reports, track training requirements, and maintain audit trails with ease."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mr-2" />
              <span className="text-xl font-bold text-slate-900">TeamCertify</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigateToPricing()}
                className="text-slate-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => onNavigateToAuth('login')}
                className="text-slate-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigateToAuth('signup')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-blue-50 to-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Never Miss an Expiry Date Again
                <span className="text-emerald-600 block mt-2">
                  Effortless CQC Compliance
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                TeamCertify gives care providers peace of mind by tracking and automating all staff certifications — so nothing ever falls through the cracks.
              </p>
              <div className="flex flex-col gap-4 mb-8">
                <button
                  onClick={() => onNavigateToAuth('signup')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-lg text-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center shadow-xl border-2 border-emerald-500"
                >
                  Start Your Free 30-Day Trial
                  <ArrowRight className="w-6 h-6 ml-3" />
                </button>
                <div className="text-slate-600 text-base font-medium text-center bg-slate-100 py-2 px-4 rounded-lg">
                  No credit card required • Cancel anytime
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform hover:scale-105 transition-transform duration-300">
                <div className="mb-6">
                  <h4 className="text-slate-900 font-semibold mb-4 flex items-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mr-2" />
                    Staff Certification Dashboard
                  </h4>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-600">43</div>
                      <div className="text-sm text-emerald-700">Up-to-Date</div>
                    </div>
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-amber-600">5</div>
                      <div className="text-sm text-amber-700">Expiring Soon</div>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">0</div>
                      <div className="text-sm text-red-700">Expired</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-emerald-50 border-l-4 border-emerald-500 rounded p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">Alice Johnson</div>
                          <div className="text-sm text-slate-600">First Aid Training</div>
                        </div>
                      </div>
                      <div className="text-sm text-emerald-700 font-medium">Valid until Mar 2025</div>
                    </div>
                    <div className="flex items-center justify-between bg-amber-50 border-l-4 border-amber-500 rounded p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">Sarah Williams</div>
                          <div className="text-sm text-slate-600">Manual Handling</div>
                        </div>
                      </div>
                      <div className="text-sm text-amber-700 font-medium">Expires in 14 days</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Agitation Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-8">
            Still juggling spreadsheets and worrying about CQC inspections?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-800 mb-4">The Risks You're Facing</h3>
              <ul className="text-left space-y-3 text-red-700">
                <li className="flex items-start">
                  <X className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Risking non-compliance with out-of-date records</span>
                </li>
                <li className="flex items-start">
                  <X className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Wasting hours manually chasing staff and updating files</span>
                </li>
                <li className="flex items-start">
                  <X className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>The constant fear that something has slipped through the cracks</span>
                </li>
                <li className="flex items-start">
                  <X className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Facing delays when onboarding new staff</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Sarah's Story</h3>
              <blockquote className="text-slate-700 italic">
                "I'm terrified a certificate has expired and I've missed it. What if there's an incident and we're not covered? What will the CQC inspector find? I waste hours every month chasing staff for their documents and updating this spreadsheet. There has to be a better way."
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Solution/Benefit Section */}
      <section className="py-20 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
              Your Always-On, Always-Compliant Certification System
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Transform your certification management from a source of stress into a system that gives you confidence and peace of mind.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Achieve Peace of Mind</h3>
              <p className="text-slate-600">
                Know you're audit-ready 24/7 with a real-time, color-coded dashboard that shows exactly what needs attention.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Save Dozens of Hours</h3>
              <p className="text-slate-600">
                Automated email reminders mean no more manual chasing. Let TeamCertify do the work for you.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Eliminate Human Error</h3>
              <p className="text-slate-600">
                Centralise all certificates, documents, and expiry dates in one secure, reliable place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
            Get Set Up in 3 Simple Steps
          </h2>
          <p className="text-xl text-slate-600 mb-16">
            You can be up and running in minutes, not days
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">1. Add Your Staff</h3>
              <p className="text-slate-600">
                Quickly import or add team members. Upload your existing spreadsheet or add staff manually.
              </p>
            </div>
            
            <div className="relative">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">2. Track Certifications</h3>
              <p className="text-slate-600">
                Upload documents and set expiry dates. Our system automatically calculates renewal dates.
              </p>
            </div>
            
            <div className="relative">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">3. Relax</h3>
              <p className="text-slate-600">
                Get automated alerts before anything expires. You're now audit-ready and stress-free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
              Everything You Need to Be Effortlessly Compliant
            </h2>
          </div>
          
          <div className="space-y-20">
            {/* Feature 1: Compliance Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  <BarChart3 className="w-8 h-8 inline-block mr-3 text-emerald-600" />
                  The Compliance Dashboard
                </h3>
                <p className="text-lg text-slate-600 mb-6">
                  See your entire team's status in a single glance. Green, amber, red tells you exactly who needs attention.
                </p>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3" />
                    Instant visibility into team compliance status
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3" />
                    Color-coded system shows priorities at a glance
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3" />
                    Real-time updates when certificates are renewed
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-600">43</div>
                    <div className="text-sm text-emerald-700">Up-to-Date</div>
                  </div>
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">5</div>
                    <div className="text-sm text-amber-700">Expiring Soon</div>
                  </div>
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">0</div>
                    <div className="text-sm text-red-700">Expired</div>
                  </div>
                </div>
                <div className="h-40 bg-slate-50 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-12 h-12 text-slate-400" />
                  <span className="ml-3 text-slate-500">Interactive Compliance Chart</span>
                </div>
              </div>
            </div>

            {/* Feature 2: Automated Reminders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="lg:order-2">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  <Bell className="w-8 h-8 inline-block mr-3 text-blue-600" />
                  Automated Expiry Reminders
                </h3>
                <p className="text-lg text-slate-600 mb-6">
                  Stop chasing people. Our system automatically notifies staff 30 days before a certificate expires.
                </p>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                    Automatic email reminders to staff and managers
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                    Customizable reminder schedules
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                    Escalation to managers for overdue renewals
                  </li>
                </ul>
              </div>
              <div className="lg:order-1 bg-white rounded-xl shadow-lg p-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-amber-500 bg-amber-50 p-4 rounded">
                    <div className="flex items-center mb-2">
                      <Bell className="w-5 h-5 text-amber-600 mr-2" />
                      <span className="font-medium text-amber-800">Reminder Sent</span>
                    </div>
                    <div className="text-sm text-amber-700">
                      First Aid Training expires in 14 days for Sarah Williams
                    </div>
                  </div>
                  <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-800">Certificate Renewed</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      DBS Check updated for Alice Johnson
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Secure Storage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  <Lock className="w-8 h-8 inline-block mr-3 text-purple-600" />
                  Secure Document Storage
                </h3>
                <p className="text-lg text-slate-600 mb-6">
                  Keep every certificate and DBS check securely stored and accessible in one place. No more paper folders.
                </p>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-purple-600 mr-3" />
                    Secure cloud storage with UK data centers
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-purple-600 mr-3" />
                    Instant access to any certificate when needed
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-purple-600 mr-3" />
                    Automatic backups and version control
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-slate-600 mr-3" />
                      <span className="text-slate-900">First_Aid_Certificate.pdf</span>
                    </div>
                    <Eye className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-slate-600 mr-3" />
                      <span className="text-slate-900">DBS_Check_2024.pdf</span>
                    </div>
                    <Eye className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-slate-600 mr-3" />
                      <span className="text-slate-900">Manual_Handling.pdf</span>
                    </div>
                    <Eye className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Gap Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="lg:order-2">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  <Eye className="w-8 h-8 inline-block mr-3 text-cyan-600" />
                  Gap Analysis & Reporting
                </h3>
                <p className="text-lg text-slate-600 mb-6">
                  Instantly see which staff are missing required certifications and export compliance reports for your CQC evidence binder.
                </p>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-cyan-600 mr-3" />
                    Visual matrix showing all certification gaps
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-cyan-600 mr-3" />
                    One-click compliance reports for inspections
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-cyan-600 mr-3" />
                    Training needs analysis and planning
                  </li>
                </ul>
              </div>
              <div className="lg:order-1 bg-white rounded-xl shadow-lg p-6">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {Array.from({ length: 25 }, (_, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      i === 2 || i === 7 || i === 15 ? 'bg-red-100 border-2 border-red-300' : 'bg-emerald-100 border-2 border-emerald-300'
                    }`}>
                      {i === 2 || i === 7 || i === 15 ? (
                        <X className="w-4 h-4 text-red-600" />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-slate-600 text-center">
                  5 staff × 5 required certifications = 25 total requirements
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Reassurance Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
            Built for the Trust and Security Your Sector Demands
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Designed with CQC requirements in mind</h3>
              <p className="text-sm text-slate-600">Built specifically for UK care providers</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Secure UK-based data storage</h3>
              <p className="text-sm text-slate-600">GDPR compliant with industry-leading security</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Simple pricing, no hidden fees</h3>
              <p className="text-sm text-slate-600">Transparent pricing based on your team size</p>
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-slate-600 text-sm">{testimonial.role}</div>
                  <div className="text-slate-500 text-sm">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
            Simple, Fair Pricing for Teams of All Sizes
          </h2>
          <p className="text-xl text-slate-600 mb-12">
            Choose the plan that fits your team. All plans include 30-day free trial.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-blue-600 mb-2">10</div>
                <div className="text-sm font-medium text-slate-600">Staff Members</div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
              <p className="text-slate-600 mb-6">Perfect for getting started or for very small teams</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-slate-900">£29</span>
                <span className="text-slate-600">/month</span>
              </div>
              <button
                onClick={() => onNavigateToAuth('signup')}
                className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Growth Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 ring-2 ring-emerald-600 ring-opacity-50 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                  <Crown className="w-4 h-4 mr-1" />
                  Most Popular
                </div>
              </div>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-emerald-600 mb-2">50</div>
                <div className="text-sm font-medium text-slate-600">Staff Members</div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Growth</h3>
              <p className="text-slate-600 mb-6">Our most popular plan for growing care homes. Includes all automated reminders and reporting.</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-slate-900">£79</span>
                <span className="text-slate-600">/month</span>
              </div>
              <button
                onClick={() => onNavigateToAuth('signup')}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-purple-600 mb-2">200</div>
                <div className="text-sm font-medium text-slate-600">Staff Members</div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Professional</h3>
              <p className="text-slate-600 mb-6">For larger organisations needing full compliance oversight</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-slate-900">£199</span>
                <span className="text-slate-600">/month</span>
              </div>
              <button
                onClick={() => onNavigateToAuth('signup')}
                className="w-full border-2 border-slate-600 text-slate-600 hover:bg-slate-600 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA / FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
              Ready to Swap Spreadsheet Stress for Compliance Confidence?
            </h2>
            <button
              onClick={() => onNavigateToAuth('signup')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-lg text-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Start My Free 30-Day Trial - No Card Required
            </button>
            <p className="text-slate-600 mt-4">
              Join hundreds of care providers who've eliminated certification stress
            </p>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h3>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-slate-200 rounded-lg">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left p-6 flex justify-between items-center hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-900">{faq.question}</span>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-slate-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mr-2" />
              <span className="text-xl font-bold">TeamCertify</span>
            </div>
            <p className="text-slate-400">
              Giving care providers peace of mind through effortless compliance
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 