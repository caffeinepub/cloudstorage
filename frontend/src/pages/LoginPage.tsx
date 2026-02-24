import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Cloud, Lock, Zap } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
              CloudStorage
            </h1>
            <p className="text-xl text-muted-foreground">
              Secure cloud storage powered by Internet Computer
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Advanced Encryption</h3>
                <p className="text-sm text-muted-foreground">
                  Your files are encrypted and stored securely on the blockchain
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Cloud className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Access Anywhere</h3>
                <p className="text-sm text-muted-foreground">
                  Access your files from any device, anytime, anywhere
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is yours. No tracking, no ads, complete privacy
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Upload and download files at blazing speeds
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in with Internet Identity to access your secure cloud storage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="w-full"
              size="lg"
            >
              {isLoggingIn ? 'Connecting...' : 'Sign In with Internet Identity'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
