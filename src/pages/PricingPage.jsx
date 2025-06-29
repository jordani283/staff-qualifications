import React from 'react';
import { 
  Check, 
  Shield, 
  ArrowRight, 
  Star,
  Users,
  BarChart3,
  Bell,
  Mail,
  Settings,
  Zap,
  Crown,
  Phone
} from 'lucide-react';

export default function PricingPage({ onNavigateToAuth, onNavigateBack }) {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for small teams getting started with staff qualifications tracking.",
      price: "£49",
      period: "/month",
      subtitle: "Up to 10 staff profiles",
      features: [
        "Digital certificate & qualification tracking",
        "Basic gap analysis",
        "Automated expiry reminders",
        "Email support",
        "Secure data storage",
        "Mobile-friendly interface"
      ],
      cta: "Start Free Trial",
      popular: false,
      ctaStyle: "border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
    },
    {
      name: "Professional",
      description: "Ideal for growing organisations needing powerful tools and insights.",
      price: "£149",
      period: "/month",
      subtitle: "Up to 50 staff profiles",
      features: [
        "Everything in Starter",
        "Advanced gap analysis with visual dashboards",
        "Training & resource planning tools",
        "Role-based permissions",
        "Priority email support",
        "Custom reporting",
        "API access",
        "Bulk import/export"
      ],
      cta: "Start Free Trial",
      popular: true,
      ctaStyle: "bg-blue-600 text-white hover:bg-blue-700"
    },
    {
      name: "Enterprise",
      description: "Tailored solution for large organisations with complex needs.",
      price: "Custom",
      period: " pricing",
      subtitle: "Unlimited staff profiles",
      features: [
        "Everything in Professional",
        "Unlimited staff profiles",
        "Custom integrations (HR/payroll systems)",
        "Dedicated account manager",
        "SLA-backed support",
        "Custom branding",
        "Advanced security features",
        "On-premise deployment option"
      ],
      cta: "Contact Sales",
      popular: false,
      ctaStyle: "border-2 border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "HR Director",
      company: "TechCorp Solutions",
      content: "The Professional plan gave us everything we needed to streamline our compliance process. ROI was immediate.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Compliance Manager", 
      company: "HealthFirst Medical",
      content: "Enterprise features like custom integrations saved us weeks of manual work. Worth every penny.",
      rating: 5
    }
  ];

  const trustSignals = [
    { icon: <Shield className="w-5 h-5" />, text: "SOC 2 Compliant" },
    { icon: <Users className="w-5 h-5" />, text: "10,000+ Users" },
    { icon: <Star className="w-5 h-5" />, text: "4.9/5 Rating" },
    { icon: <Zap className="w-5 h-5" />, text: "99.9% Uptime" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-2" />
                              <span className="text-xl font-bold text-gray-900">StaffCertify</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigateBack()}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                ← Back
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
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose the plan that fits your team size and needs. All plans include a 30-day free trial.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {trustSignals.map((signal, index) => (
              <div key={index} className="flex items-center text-gray-600">
                <div className="text-blue-600 mr-2">{signal.icon}</div>
                <span className="text-sm font-medium">{signal.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {plans.map((plan, index) => (
              <div key={index} className="relative">
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Crown className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8 h-full ${plan.popular ? 'ring-2 ring-blue-600 ring-opacity-50' : ''}`}>
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </div>
                    <p className="text-sm text-gray-500">{plan.subtitle}</p>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => plan.cta === 'Contact Sales' ? null : onNavigateToAuth('signup')}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${plan.ctaStyle}`}
                  >
                    {plan.cta}
                    {plan.cta === 'Contact Sales' ? <Phone className="w-4 h-4 ml-2 inline" /> : <ArrowRight className="w-4 h-4 ml-2 inline" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trusted by Teams Worldwide</h2>
            <p className="text-xl text-gray-600">See what our customers say about their chosen plans</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What happens during the free trial?</h3>
              <p className="text-gray-600">You get full access to all features in your chosen plan for 30 days. No credit card required.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Is my data secure?</h3>
              <p className="text-gray-600">Absolutely. We're SOC 2 compliant with enterprise-grade security and regular backups.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Do you offer discounts for annual billing?</h3>
              <p className="text-gray-600">Yes, save 20% when you choose annual billing. Contact us for volume discounts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Start your 30-day free trial today — no credit card required
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigateToAuth('signup')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center justify-center"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all inline-flex items-center justify-center">
              <Phone className="w-5 h-5 mr-2" />
              Contact Sales
            </button>
          </div>
          <p className="text-blue-100 mt-6 text-sm">
                            Questions? Email us at <a href="mailto:hello@staffcertify.com" className="underline hover:text-white">hello@staffcertify.com</a>
          </p>
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