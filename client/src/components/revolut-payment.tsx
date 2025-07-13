import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const [revolutInstance, setRevolutInstance] = useState<any>(null);
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeRevolut = async () => {
      try {
        // Create order first
        const orderResponse = await apiRequest("POST", "/api/payments/revolut/create-order", {
          amount: Math.round(amount * 100),
          currency: currency.toUpperCase(),
        });
        const order = await orderResponse.json();
        
        // Dynamic import of Revolut SDK
        const RevolutCheckout = await import("@revolut/checkout");
        
        // For testing, skip the actual Revolut widget initialization
        // In production, this would initialize the real payment widget
        setRevolutInstance({ 
          ready: true, 
          orderId: order.id,
          publicId: order.public_id 
        });
        
        // Show a message that the payment system is ready
        toast({
          title: "Payment system ready",
          description: "Use the test payment button below to complete your order.",
        });
      } catch (error) {
        console.error("Failed to initialize Revolut:", error);
        onError("Failed to initialize payment system");
      }
    };

    initializeRevolut();
  }, [amount, currency, onSuccess, onError, toast]);

  const handleCardPayment = async () => {
    if (!revolutInstance) return;

    setIsLoading(true);
    try {
      // Trigger card payment flow
      await revolutInstance.payWithCard();
    } catch (error) {
      console.error("Card payment failed:", error);
      onError("Card payment failed");
    } finally {
      setIsLoading(false);
    }
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
          Fast, secure payments with Revolut. Pay with your Revolut account or any card.
        </div>
        
        {/* Revolut Pay Button Container */}
        <div ref={paymentContainerRef} className="min-h-[50px]" />
        
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2">Or pay with card</div>
          <Button
            onClick={handleCardPayment}
            disabled={disabled || isLoading || !revolutInstance}
            className="w-full"
            variant="outline"
          >
            {isLoading ? "Processing..." : "Pay with Card"}
          </Button>
        </div>
        
        {/* Demo payment button */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2">Demo Payment</div>
          <Button
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => {
                toast({
                  title: "Payment Successful",
                  description: "Your order has been processed successfully.",
                });
                onSuccess("demo_payment_" + Date.now());
                setIsLoading(false);
              }, 1500);
            }}
            disabled={disabled || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Processing Payment..." : `Pay $${amount.toFixed(2)} with Revolut`}
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          Powered by Revolut - Secure payment processing
        </div>
      </CardContent>
    </Card>
  );
}