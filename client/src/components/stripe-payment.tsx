import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface StripePaymentProps {
  amount: number;
  currency: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

function CheckoutForm({ amount, currency, onSuccess, onError, disabled }: StripePaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      // Create payment intent
      const response = await apiRequest("POST", "/api/payments/stripe/create-payment-intent", {
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
      });
      
      const { clientSecret } = await response.json();

      // Confirm payment
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (result.error) {
        console.error('Payment error:', result.error);
        toast({
          title: "Payment Failed",
          description: result.error.message,
          variant: "destructive",
        });
        onError(result.error.message || "Payment failed");
      } else {
        console.log('Payment successful:', result.paymentIntent);
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        onSuccess(result.paymentIntent.id);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Payment processing failed",
        variant: "destructive",
      });
      onError(error.message || "Payment failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isLoading || disabled}
        className="w-full"
      >
        {isLoading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </Button>
    </form>
  );
}

export default function StripePayment(props: StripePaymentProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">$</span>
          </div>
          Credit Card Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600 mb-4">
          Secure payment processing with Stripe
        </div>
        <Elements stripe={stripePromise}>
          <CheckoutForm {...props} />
        </Elements>
      </CardContent>
    </Card>
  );
}