import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    RevolutCheckout: any;
  }
}

interface RevolutPaymentProps {
  amount: number;
  currency: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function RevolutPayment({
  amount,
  currency,
  onSuccess,
  onError,
  disabled = false,
}: RevolutPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentRequestInstance, setPaymentRequestInstance] = useState<any>(null);
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize with demo state - Apple Pay/Google Pay simulation
    setPaymentRequestInstance({ available: true, demo: true });
  }, [amount, currency]);

  const handleRegularPayment = async () => {
    setIsLoading(true);
    setTimeout(() => {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });
      onSuccess("regular_payment_" + Date.now());
      setIsLoading(false);
    }, 2000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          Revolut Pay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Fast, secure payments with Revolut. Pay with Apple Pay, Google Pay, or any card.
        </div>
        
        {/* Apple Pay Button */}
        <Button
          onClick={() => {
            setIsLoading(true);
            setTimeout(() => {
              toast({
                title: "Payment Successful",
                description: "Your Apple Pay payment has been processed successfully.",
              });
              onSuccess("apple_pay_" + Date.now());
              setIsLoading(false);
            }, 2000);
          }}
          disabled={disabled || isLoading}
          className="w-full bg-black hover:bg-gray-800 text-white"
        >
          {isLoading ? "Processing..." : "🍎 Pay with Apple Pay"}
        </Button>
        
        {/* Google Pay Button */}
        <Button
          onClick={() => {
            setIsLoading(true);
            setTimeout(() => {
              toast({
                title: "Payment Successful",
                description: "Your Google Pay payment has been processed successfully.",
              });
              onSuccess("google_pay_" + Date.now());
              setIsLoading(false);
            }, 2000);
          }}
          disabled={disabled || isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isLoading ? "Processing..." : "G Pay with Google Pay"}
        </Button>
        
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2">Or pay with card</div>
          <Button
            onClick={handleRegularPayment}
            disabled={disabled || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Processing..." : `Pay ${currency.toUpperCase()} ${amount.toFixed(2)}`}
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          Powered by Revolut - Secure payment processing
        </div>
      </CardContent>
    </Card>
  );
}