import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Users,
  Zap,
  Shield,
  Palette,
  Share2,
  Cloud,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Zap,
      title: 'Real-Time Collaboration',
      description: 'See changes instantly as your team draws, edits, and creates together in real-time.',
    },
    {
      icon: Palette,
      title: 'Powerful Drawing Tools',
      description: 'Rectangle, pencil, text, and selection tools with unlimited colors and undo/redo.',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Invite teammates with role-based permissions. Control who can edit or just view.',
    },
    {
      icon: Cloud,
      title: 'Auto-Saved',
      description: 'Everything is automatically saved. Never lose your work, even if you close the browser.',
    },
    {
      icon: Share2,
      title: 'Easy Sharing',
      description: 'Generate shareable invite links in seconds. Collaborate with anyone, anywhere.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Enterprise-grade security with Google OAuth and row-level database security.',
    },
  ];

  const benefits = [
    'Infinite canvas for unlimited creativity',
    'Multi-user cursors to see who\'s working where',
    'Path simplification for smooth, performant drawings',
    'Keyboard shortcuts for power users',
    'Responsive design works on any device',
    'No installation required - works in your browser',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-20">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-xl">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>

          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            SyncSpace
          </h1>

          <p className="text-2xl text-gray-600 mb-8">
            The collaborative whiteboard that teams love
          </p>

          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Draw, brainstorm, and collaborate in real-time with your team.
            Simple, powerful, and built for modern teams.
          </p>

          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              Get Started Free
              <ArrowRight className="ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="text-lg px-8 py-6"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Demo Image Placeholder */}
        <div className="max-w-6xl mx-auto mb-32">
          <Card className="p-8 shadow-2xl bg-gradient-to-br from-gray-50 to-white">
            <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Palette className="w-24 h-24 mx-auto mb-4 text-indigo-500 opacity-50" />
                <p className="text-gray-500 text-lg">
                  Your collaborative whiteboard comes to life here
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to collaborate</h2>
            <p className="text-xl text-gray-600">
              Powerful features that make teamwork seamless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-6 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-indigo-200"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-32">
          <Card className="max-w-4xl mx-auto p-12 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100">
            <h2 className="text-3xl font-bold mb-8 text-center">Why teams choose SyncSpace</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-3xl mx-auto">
          <Card className="p-12 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">Ready to collaborate?</h2>
            <p className="text-xl mb-8 text-indigo-100">
              Join thousands of teams already using SyncSpace to bring their ideas to life.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/login')}
              className="text-lg px-8 py-6 bg-white text-indigo-600 hover:bg-gray-100"
            >
              Start Creating Now - It's Free
              <ArrowRight className="ml-2" />
            </Button>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-32 pt-12 border-t text-center text-gray-500">
          <p className="mb-4">
            Built with ❤️ using React, TypeScript, Supabase, and Y.js
          </p>
          <p className="text-sm">
            © 2024 SyncSpace. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
