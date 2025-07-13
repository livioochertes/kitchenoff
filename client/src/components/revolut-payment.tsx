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
        // Dynamic import of Revolut SDK
        const RevolutCheckout = await import("@revolut/checkout");
        
        // Initialize Revolut Checkout
        const { revolutPay } = await RevolutCheckout.payments({
          locale: "en",
          // Note: In production, you'll need to replace this with your actual public token
          publicToken: "pk_test_your_public_key_here",
        });

        setRevolutInstance(revolutPay);
        
        // Mount the payment widget
        if (paymentContainerRef.current) {
          revolutPay.mount(paymentContainerRef.current, {
            currency: currency.toUpperCase(),
            totalAmount: Math.round(amount * 100), // Convert to cents
            createOrder: async () => {
              try {
                const response = await apiRequest("POST", "/api/payments/revolut/create-order", {
                  amount: Math.round(amount * 100),
                  currency: currency.toUpperCase(),
                });
                const order = await response.json();
                return { publicId: order.publicId };
              } catch (error) {
                console.error("Failed to create order:", error);
                throw error;
              }
            },
          });

          // Set up event handlers
          revolutPay.on("payment", (event: any) => {
            switch (event.type) {
              case "success":
                onSuccess(event.paymentId);
                toast({
                  title: "Payment successful",
                  description: "Your payment has been processed successfully.",
                });
                break;
              case "error":
                onError(event.error?.message || "Payment failed");
                toast({
                  title: "Payment failed",
                  description: event.error?.message || "There was an error processing your payment.",
                  variant: "destructive",
                });
                break;
              case "cancel":
                toast({
                  title: "Payment cancelled",
                  description: "Payment was cancelled by user.",
                });
                break;
            }
          });
        }
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
        
        <div className="text-xs text-gray-500 text-center">
          Powered by Revolut - Secure payment processing
        </div>
      </CardContent>
    </Card>
  );
}