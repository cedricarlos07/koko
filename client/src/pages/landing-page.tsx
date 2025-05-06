import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-primary-600 font-bold text-2xl">KODJO</span>
            <span className="text-secondary-500 font-bold text-2xl ml-1">ENGLISH</span>
          </div>
          <Link href="/auth">
            <Button>Login / Register</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-16 pb-24 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Simplify your</span>
                <span className="block text-primary-600">English Teaching</span>
              </h1>
              <p className="mt-6 max-w-lg mx-auto text-xl text-gray-500 sm:max-w-3xl">
                The complete platform for managing English language courses with automated scheduling,
                Telegram integration, and Zoom meeting management.
              </p>
              <div className="mt-10 flex justify-center">
                <Link href="/auth">
                  <Button size="lg" className="px-8 py-3 text-lg">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900">Key Features</h2>
              <p className="mt-4 text-xl text-gray-500">Everything you need to manage your English classes efficiently</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Smart Class Scheduling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Automate your class scheduling with our smart system that manages time slots, student assignments, and teacher availability.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Telegram Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Connect with students effortlessly through Telegram. Send reminders, class materials, and engage with students directly.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Zoom Meeting Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Create, schedule, and manage Zoom meetings automatically. Track attendance and session recordings all in one place.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center">
                <span className="text-white font-bold text-2xl">KODJO</span>
                <span className="text-primary-400 font-bold text-2xl ml-1">ENGLISH</span>
              </div>
              <p className="mt-4 text-gray-300">
                The complete platform for managing English language courses with automated scheduling and integrations.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li>Class Scheduling</li>
                <li>Telegram Integration</li>
                <li>Zoom Management</li>
                <li>Student Progress Tracking</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-300">
                <li>Documentation</li>
                <li>Tutorials</li>
                <li>API Reference</li>
                <li>Support</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-300">
                <li>Email: info@kodjoenglish.com</li>
                <li>Phone: +1 (123) 456-7890</li>
                <li>Follow us on social media</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-700 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} KODJO ENGLISH. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}