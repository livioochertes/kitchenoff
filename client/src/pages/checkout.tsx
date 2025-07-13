import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CreditCard, Truck, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import RevolutPayment from "@/components/revolut-payment";

const addressSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(1, "Phone number is required"),
});

const checkoutSchema = z.object({
  email: z.string().email("Invalid email address"),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  paymentMethod: z.enum(["revolut", "stripe", "paypal"]),
  sameAsBilling: z.boolean().default(false),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [step, setStep] = useState(1);
  const [, navigate] = useLocation();
  const { cart, clearCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: "",
      shippingAddress: {
        firstName: "",
        lastName: "",
        company: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "US",
        phone: "",
      },
      billingAddress: {
        firstName: "",
        lastName: "",
        company: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "US",
        phone: "",
      },
      paymentMethod: "revolut",
      sameAsBilling: false,
      notes: "",
    },
  });

  const sameAsBilling = form.watch("sameAsBilling");

  const createOrderMutation = useMutation({
    mutationFn: async (data: CheckoutFormData) => {
      const token = localStorage.getItem("token");
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        totalPrice: (parseFloat(item.product.price) * item.quantity).toString(),
      }));

      return await apiRequest("POST", "/api/orders", {
        shippingAddress: data.shippingAddress,
        billingAddress: sameAsBilling ? data.shippingAddress : data.billingAddress,
        paymentMethod: data.paymentMethod,
        items: orderItems,
        notes: data.notes,
      }, {
        Authorization: `Bearer ${token}`,
      });
    },
    onSuccess: (data) => {
      clearCart();
      toast({
        title: "Order placed successfully!",
        description: "Thank you for your order. You will receive a confirmation email shortly.",
      });
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Order failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const subtotal = cart.reduce((sum, item) => {
    if (!item.product || !item.product.price) return sum;
    return sum + (parseFloat(item.product.price) * item.quantity);
  }, 0);
  const shipping = subtotal > 500 ? 0 : 25;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const handleNext = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setStep(step + 1);
    }
  };

  const handleSubmit = (data: CheckoutFormData) => {
    createOrderMutation.mutate(data);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-16">
            <CardContent>
              <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">
                Add some products to your cart before checkout
              </p>
              <Link href="/products">
                <Button size="lg" className="kitchen-pro-secondary">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <Link href="/cart">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Button>
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum <= step
                      ? "kitchen-pro-secondary text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      stepNum < step ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {step === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="your@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Truck className="h-5 w-5 mr-2" />
                          Shipping Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="shippingAddress.firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="shippingAddress.lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="shippingAddress.company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shippingAddress.address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="shippingAddress.city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="shippingAddress.state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="shippingAddress.zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ZIP Code</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="shippingAddress.phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <MapPin className="h-5 w-5 mr-2" />
                          Billing Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="sameAsBilling"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Same as shipping address</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        {!sameAsBilling && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="billingAddress.firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="billingAddress.lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name="billingAddress.address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name="billingAddress.city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="billingAddress.state"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>State</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="billingAddress.zipCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>ZIP Code</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <CreditCard className="h-5 w-5 mr-2" />
                          Payment Method
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RadioGroup
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  className="space-y-3"
                                >
                                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                    <RadioGroupItem value="revolut" id="revolut" />
                                    <Label htmlFor="revolut" className="flex items-center space-x-2 cursor-pointer">
                                      <span>Revolut Pay</span>
                                      <Badge variant="secondary">Recommended</Badge>
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                    <RadioGroupItem value="stripe" id="stripe" />
                                    <Label htmlFor="stripe" className="cursor-pointer">
                                      Credit/Debit Card
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                    <RadioGroupItem value="paypal" id="paypal" />
                                    <Label htmlFor="paypal" className="cursor-pointer">
                                      PayPal
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Revolut Payment Component */}
                    {form.watch("paymentMethod") === "revolut" && (
                      <RevolutPayment
                        amount={totalAmount}
                        currency="USD"
                        onSuccess={(paymentId) => {
                          toast({
                            title: "Payment successful!",
                            description: "Your order has been placed successfully.",
                          });
                          clearCart();
                          navigate("/orders");
                        }}
                        onError={(error) => {
                          toast({
                            title: "Payment failed",
                            description: error,
                            variant: "destructive",
                          });
                        }}
                      />
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle>Order Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  placeholder="Special instructions for your order..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="flex justify-between">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                    >
                      Previous
                    </Button>
                  )}
                  <div className="ml-auto">
                    {step < 3 ? (
                      <Button type="button" onClick={handleNext} className="kitchen-pro-secondary">
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={createOrderMutation.isPending}
                        className="kitchen-pro-secondary"
                      >
                        {createOrderMutation.isPending ? "Processing..." : "Place Order"}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <img
                        src={item.product.imageUrl || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=60&h=60"}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>
                      {shipping === 0 ? (
                        <Badge variant="secondary">Free</Badge>
                      ) : (
                        `$${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
