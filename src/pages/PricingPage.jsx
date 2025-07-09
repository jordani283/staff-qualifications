import React from 'react';
import { 
  Check, 
  Shield, 
  ShieldCheck,
  ArrowRight, 
  Star,
  Users,
  BarChart3,
  Bell,
  Mail,
  Settings,
  Zap,
  Crown,
  Phone,
  Award,
  Lock,
  CheckCircle
} from 'lucide-react';

export default function PricingPage({ onNavigateToAuth, onNavigateBack }) {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for getting started or for very small teams.",
      price: "£29",
      period: "/month",
      yearlyPrice: "£290",
      yearlyPeriod: "/year",
      yearlySavings: "2 months free",
      staffLimit: "10",
      features: [
        "Automated expiry reminders via email",
        "Color-coded certification status (green/amber/red)",
        "Certificate document storage & secure uploads",
        "Pre-defined certification templates with automatic expiry calculations",
        "Real-time dashboard with compliance metrics",
        "Gap analysis to find missing certifications",
        "Renewal system with complete audit trails",
        "CSV export of staff certification data"
      ],
      cta: "Start Your Free 30-Day Trial",
      popular: false,
      ctaStyle: "border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
    },
    {
      name: "Growth",
      description: "Our most popular plan for growing care homes. Includes all automated reminders and reporting.",
      price: "£79",
      period: "/month",
      yearlyPrice: "£790",
      yearlyPeriod: "/year",
      yearlySavings: "2 months free",
      staffLimit: "50",
      features: [
        "All Starter plan features",
        "Everything you need for growing teams"
      ],
      cta: "Start Your Free 30-Day Trial",
      popular: true,
      ctaStyle: "bg-emerald-600 text-white hover:bg-emerald-700"
    },
    {
      name: "Professional",
      description: "For larger organisations needing full compliance oversight.",
      price: "£199",
      period: "/month",
      yearlyPrice: "£1,990",
      yearlyPeriod: "/year", 
      yearlySavings: "2 months free",
      staffLimit: "200",
      features: [
        "All Starter plan features",
        "Perfect for large organizations"
      ],
      cta: "Start Your Free 30-Day Trial",
      popular: false,
      ctaStyle: "border-2 border-slate-600 text-slate-600 hover:bg-slate-600 hover:text-white"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Care Home Manager",
      company: "Sunrise Care Home",
      content: "The Growth plan gave us everything we needed to streamline our CQC compliance process. ROI was immediate.",
      rating: 5
    },
    {
      name: "Michael Thompson",
      role: "Compliance Lead", 
      company: "Haven Care Services",
      content: "Professional features like automated reporting saved us weeks of manual work preparing for inspections.",
      rating: 5
    }
  ];

  const trustSignals = [
    { icon: <Award className="w-5 h-5" />, text: "CQC Compliant" },
    { icon: <Users className="w-5 h-5" />, text: "20 Care Homes" },
    { icon: <Star className="w-5 h-5" />, text: "4.9/5 Rating" },
    { icon: <Lock className="w-5 h-5" />, text: "UK Data Storage" }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mr-2" />
              <span className="text-xl font-bold text-slate-900">TeamCertify</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigateBack()}
                className="text-slate-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                ← Back
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
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Simple, Fair Pricing for Teams of All Sizes
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Choose the plan that fits your team. All plans include a 30-day free trial with no credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {trustSignals.map((signal, index) => (
              <div key={index} className="flex items-center text-slate-600">
                <div className="text-emerald-600 mr-2">{signal.icon}</div>
                <span className="text-sm font-medium">{signal.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Choose Your Plan</h2>
            <p className="text-xl text-slate-600">Select based on the number of staff members you need to manage</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {plans.map((plan, index) => (
              <div key={index} className="relative">
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Crown className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8 h-full ${plan.popular ? 'ring-2 ring-emerald-600 ring-opacity-50' : ''}`}>
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    
                    {/* Staff Limit - Prominent Display */}
                    <div className={`mb-4 p-3 rounded-lg border-2 ${
                      plan.popular 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : index === 0 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-purple-50 border-purple-200'
                    }`}>
                      <div className={`text-3xl font-bold ${
                        plan.popular 
                          ? 'text-emerald-600' 
                          : index === 0 
                            ? 'text-blue-600' 
                            : 'text-purple-600'
                      }`}>
                        {plan.staffLimit}
                      </div>
                      <div className="text-sm font-medium text-slate-600">Staff Members</div>
                    </div>

                    <p className="text-slate-600 mb-6">{plan.description}</p>
                    <div className="mb-4">
                      <div className="mb-2">
                        <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                        <span className="text-slate-600">{plan.period}</span>
                      </div>
                      {plan.yearlyPrice && (
                        <div className="text-sm text-slate-600">
                          or <span className="font-semibold">{plan.yearlyPrice}{plan.yearlyPeriod}</span>
                          <span className="text-emerald-600 ml-1">({plan.yearlySavings})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-auto">
                    <button
                      onClick={() => onNavigateToAuth('signup')}
                      className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${plan.ctaStyle}`}
                    >
                      {plan.cta}
                    </button>
                    <p className="text-slate-500 text-sm mt-2 text-center">
                      No credit card required • Cancel anytime
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12">
            Why Care Homes Choose TeamCertify
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">CQC Ready</h3>
              <p className="text-slate-600">Built specifically for CQC compliance requirements</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Never Miss Renewals</h3>
              <p className="text-slate-600">Automated reminders ensure nothing expires</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Secure & Compliant</h3>
              <p className="text-slate-600">UK data storage with industry-leading security</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Trusted by Care Providers</h2>
            <p className="text-xl text-slate-600">See what our customers are saying</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
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

      {/* Final CTA */}
      <section className="py-16 bg-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Achieve Effortless CQC Compliance?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join hundreds of care providers who've eliminated certification stress
          </p>
          <button
            onClick={() => onNavigateToAuth('signup')}
            className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Start Your Free 30-Day Trial
          </button>
          <p className="text-emerald-100 text-sm mt-4">
            No credit card required • Cancel anytime
          </p>
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