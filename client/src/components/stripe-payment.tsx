import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error('Missing VITE_STRIPE_PUBLIC_KEY environment variable');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CartItem {
  productId: number;
  quantity: number;
  price: string;
}

interface StripePaymentProps {
  amount: number;
  currency: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  cartItems?: CartItem[];
  voucherCode?: string | null;
}

function PaymentRequestButton({ amount, currency, onSuccess, onError, cartItems, voucherCode }: StripePaymentProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);

  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'RO',
      currency: currency.toLowerCase(),
      total: {
        label: 'KitchenOff Order',
        amount: Math.round(amount * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      try {
        const response = await apiRequest("POST", "/api/payments/stripe/create-payment-intent", {
          amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
          cartItems: cartItems || [],
          voucherCode: voucherCode || null,
        });
        const { clientSecret } = await response.json();

        const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          ev.complete('fail');
          onError(confirmError.message || 'Payment failed');
        } else if (paymentIntent) {
          ev.complete('success');
          if (paymentIntent.status === 'requires_action') {
            const { error } = await stripe.confirmCardPayment(clientSecret);
            if (error) {
              onError(error.message || 'Payment failed');
            } else {
              onSuccess(paymentIntent.id);
            }
          } else {
            onSuccess(paymentIntent.id);
          }
        }
      } catch (error: any) {
        ev.complete('fail');
        onError(error.message || 'Payment failed');
      }
    });
  }, [stripe, amount, currency]);

  if (!canMakePayment || !paymentRequest) return null;

  return (
    <div className="space-y-3">
      <PaymentRequestButtonElement options={{ paymentRequest }} />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or pay with card</span>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}

function CheckoutForm({ amount, currency, onSuccess, onError, disabled, cartItems, voucherCode }: StripePaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!stripe || !elements || isLoading) return;

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/payments/stripe/create-payment-intent", {
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        cartItems: cartItems || [],
        voucherCode: voucherCode || null,
      });
      
      const { clientSecret } = await response.json();

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
        toast({
          title: "Payment Failed",
          description: result.error.message,
          variant: "destructive",
        });
        onError(result.error.message || "Payment failed");
      } else {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        onSuccess(result.paymentIntent.id);
      }
    } catch (error: any) {
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

  const currencySymbol = currency === "RON" ? "lei" : currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency;

  return (
    <div className="space-y-4">
      <PaymentRequestButton
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onError={onError}
        cartItems={cartItems}
        voucherCode={voucherCode}
      />
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
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || isLoading || disabled}
        className="w-full"
      >
        {isLoading ? 'Processing...' : `Pay ${amount.toFixed(2)} ${currencySymbol}`}
      </Button>
    </div>
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
          Credit / Debit Card, Apple Pay, Google Pay
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600 mb-4">
          Secure payment processing with Stripe
          <div className="text-xs text-green-600 mt-1">
            ✅ Payment system fully operational
          </div>
        </div>
        <Elements stripe={stripePromise}>
          <CheckoutForm {...props} />
        </Elements>
      </CardContent>
    </Card>
  );
}