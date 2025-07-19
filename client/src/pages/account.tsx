import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { User, Package, CreditCard, Bell, Settings, Download, Eye, Receipt, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/header";
import { useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

const invoiceSchema = z.object({
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  companyState: z.string().optional(),
  companyZip: z.string().optional(),
  companyCountry: z.string().optional(),
  billingEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  billingPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryState: z.string().optional(),
  deliveryZip: z.string().optional(),
  deliveryCountry: z.string().optional(),
  deliveryInstructions: z.string().optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  orderUpdates: z.boolean(),
  productRestocks: z.boolean(),
  priceDrops: z.boolean(),
  promotions: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type InvoiceFormData = z.infer<typeof invoiceSchema>;
type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

export default function Account() {
  const [activeTab, setActiveTab] = useState("profile");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    },
  });

  const invoiceForm = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      companyName: "",
      vatNumber: "",
      registrationNumber: "",
      taxId: "",
      companyAddress: "",
      companyCity: "",
      companyState: "",
      companyZip: "",
      companyCountry: "",
      billingEmail: "",
      billingPhone: "",
      deliveryAddress: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryCountry: "",
      deliveryInstructions: "",
    },
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      orderUpdates: true,
      productRestocks: false,
      priceDrops: false,
      promotions: true,
    },
  });

  // Update forms when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
      
      invoiceForm.reset({
        companyName: user.companyName || "",
        vatNumber: user.vatNumber || "",
        registrationNumber: user.registrationNumber || "",
        taxId: user.taxId || "",
        companyAddress: user.companyAddress || "",
        companyCity: user.companyCity || "",
        companyState: user.companyState || "",
        companyZip: user.companyZip || "",
        companyCountry: user.companyCountry || "",
        billingEmail: user.billingEmail || "",
        billingPhone: user.billingPhone || "",
        deliveryAddress: user.deliveryAddress || "",
        deliveryCity: user.deliveryCity || "",
        deliveryState: user.deliveryState || "",
        deliveryZip: user.deliveryZip || "",
        deliveryCountry: user.deliveryCountry || "",
        deliveryInstructions: user.deliveryInstructions || "",
      });
    }
  }, [user, profileForm, invoiceForm]);

  // Redirect if not authenticated
  if (!isLoading && !isAuthenticated) {
    navigate("/login");
    return null;
  }

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("PUT", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Update the auth state with the new user data
      if (updatedUser) {
        updateUser(updatedUser);
      }
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Update invoice details mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const response = await apiRequest("PUT", "/api/auth/invoice", data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Invoice details updated",
        description: "Your invoice details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Update the auth state with the new user data
      if (updatedUser) {
        updateUser(updatedUser);
      }
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update invoice details.",
        variant: "destructive",
      });
    },
  });

  // Create invoice from order mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/invoice`, {
        paymentMethod: 'wire_transfer'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "Invoice has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error) => {
      toast({
        title: "Invoice creation failed",
        description: error.message || "Failed to create invoice.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleInvoiceSubmit = (data: InvoiceFormData) => {
    updateInvoiceMutation.mutate(data);
  };

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormData) => {
      const response = await apiRequest("PUT", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
      setPasswordDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    },
  });

  // Notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      const response = await apiRequest("PUT", "/api/auth/notifications", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification preferences updated",
        description: "Your notification settings have been saved.",
      });
      setNotificationDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update notification settings.",
        variant: "destructive",
      });
    },
  });

  const handlePasswordSubmit = (data: PasswordChangeFormData) => {
    changePasswordMutation.mutate(data);
  };

  const handleNotificationSubmit = (data: NotificationFormData) => {
    updateNotificationsMutation.mutate(data);
  };

  const getOrderStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);

  const downloadInvoice = async (orderId: number) => {
    try {
      // Find if there's an existing invoice for this order
      const existingInvoice = invoices.find(inv => inv.orderId === orderId);
      
      if (existingInvoice) {
        // Navigate to the existing invoice
        navigate(`/invoice/${existingInvoice.invoiceNumber}`);
      } else {
        // Try to create an invoice from the order
        const response = await fetch(`/api/orders/${orderId}/create-invoice`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const invoice = await response.json();
          navigate(`/invoice/${invoice.invoiceNumber}`);
        } else {
          toast({
            title: "Invoice not available",
            description: "Invoice cannot be created for this order yet. Please contact support.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error accessing invoice:', error);
      toast({
        title: "Error",
        description: "Unable to access invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  const viewOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your account...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('account.title')}</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.firstName}! Manage your account and orders.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('account.profile')}
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t('account.orders')}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t('account.invoices')}
              </TabsTrigger>
              <TabsTrigger value="invoice-settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t('account.settings')}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('account.alerts')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('account.personalInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('account.firstName')}</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('account.lastName')}</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('account.email')}</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="your@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="w-full md:w-auto"
                      >
                        {updateProfileMutation.isPending ? t('common.loading') : t('account.save')}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {t('account.accountSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{t('account.emailNotifications')}</h3>
                        <p className="text-sm text-gray-600">{t('account.emailNotificationsDesc')}</p>
                      </div>
                      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            {t('account.configure')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Email Notification Settings</DialogTitle>
                          </DialogHeader>
                          <Form {...notificationForm}>
                            <form onSubmit={notificationForm.handleSubmit(handleNotificationSubmit)} className="space-y-4">
                              <FormField
                                control={notificationForm.control}
                                name="emailNotifications"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Email notifications</FormLabel>
                                      <div className="text-sm text-muted-foreground">
                                        Receive email notifications
                                      </div>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={notificationForm.control}
                                name="orderUpdates"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Order updates</FormLabel>
                                      <div className="text-sm text-muted-foreground">
                                        Get notified about order status changes
                                      </div>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={notificationForm.control}
                                name="productRestocks"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Product restocks</FormLabel>
                                      <div className="text-sm text-muted-foreground">
                                        Alert when out-of-stock items are available
                                      </div>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={notificationForm.control}
                                name="priceDrops"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Price drops</FormLabel>
                                      <div className="text-sm text-muted-foreground">
                                        Get notified when prices drop on favorite items
                                      </div>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={notificationForm.control}
                                name="promotions"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Promotions</FormLabel>
                                      <div className="text-sm text-muted-foreground">
                                        Receive promotional offers and discounts
                                      </div>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end gap-3">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => setNotificationDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  type="submit" 
                                  disabled={updateNotificationsMutation.isPending}
                                >
                                  {updateNotificationsMutation.isPending ? "Saving..." : "Save Settings"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{t('account.password')}</h3>
                        <p className="text-sm text-gray-600">{t('account.passwordDesc')}</p>
                      </div>
                      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            {t('account.change')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Change Password</DialogTitle>
                          </DialogHeader>
                          <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                              <FormField
                                control={passwordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Current Password</FormLabel>
                                    <FormControl>
                                      <Input type="password" placeholder="Enter current password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={passwordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                      <Input type="password" placeholder="Enter new password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Confirm New Password</FormLabel>
                                    <FormControl>
                                      <Input type="password" placeholder="Confirm new password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end gap-3">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => setPasswordDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  type="submit" 
                                  disabled={changePasswordMutation.isPending}
                                >
                                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('account.orderHistory')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-gray-600">{t('account.loadingOrders')}</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">{t('account.noOrders')}</p>
                      <Button 
                        onClick={() => navigate("/products")}
                        className="mt-4"
                      >
                        {t('account.startShopping')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order: any) => (
                        <div key={order.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div>
                                <h3 className="font-medium">{t('account.orderNumber')}{order.id}</h3>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(order.createdAt), "PPP")}
                                </p>
                              </div>
                              <Badge className={getOrderStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${order.total}</p>
                              <p className="text-sm text-gray-600">
                                {order.items?.length || 0} {t('account.items')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewOrderDetails(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t('account.viewDetails')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => downloadInvoice(order.id)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {t('account.invoice')}
                            </Button>
                            {order.status.toLowerCase() === "delivered" && (
                              <Button variant="outline" size="sm">
                                {t('account.reorder')}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    {t('account.invoices')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">Loading invoices...</p>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No invoices created yet</p>
                      <p className="text-sm text-gray-500">Create invoices from your delivered orders below</p>
                    </div>
                  ) : (
                    <div className="space-y-4 mb-6">
                      {invoices.map((invoice: any) => (
                        <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                              <Badge variant="outline" className="text-xs">
                                {invoice.paymentMethod === 'wire_transfer' ? 'Wire Transfer' : invoice.paymentMethod}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Order #{invoice.orderId} • {format(new Date(invoice.issueDate), "PPP")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {invoice.items?.length || 0} items • €{invoice.totalAmount}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/invoice/${invoice.invoiceNumber}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {invoice.paymentLink && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(invoice.paymentLink, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create invoices from orders section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Create Invoices</h3>
                    {orders.filter((order: any) => 
                      order.status === "delivered" && 
                      !invoices.some((invoice: any) => invoice.orderId === order.id)
                    ).length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">
                          No orders available for invoice creation
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Only delivered orders without existing invoices can be converted
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders
                          .filter((order: any) => 
                            order.status === "delivered" && 
                            !invoices.some((invoice: any) => invoice.orderId === order.id)
                          )
                          .map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <h4 className="font-medium">Order #{order.id}</h4>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(order.createdAt), "PPP")} • €{order.totalAmount}
                                </p>
                              </div>
                              <Button 
                                size="sm"
                                onClick={() => createInvoiceMutation.mutate(order.id)}
                                disabled={createInvoiceMutation.isPending}
                              >
                                {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoice-settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {t('account.invoiceDetails')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...invoiceForm}>
                    <form onSubmit={invoiceForm.handleSubmit(handleInvoiceSubmit)} className="space-y-6">
                      
                      {/* Company Information Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">{t('account.companyInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={invoiceForm.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('account.companyName')}</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your Company Ltd." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={invoiceForm.control}
                            name="vatNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>VAT Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="GB123456789" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={invoiceForm.control}
                            name="registrationNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Registration Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="12345678" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={invoiceForm.control}
                            name="taxId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tax ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="123-45-6789" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Company Address Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Company Address</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={invoiceForm.control}
                            name="companyAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Street Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="123 Business Street" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={invoiceForm.control}
                              name="companyCity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="London" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={invoiceForm.control}
                              name="companyState"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State/Province</FormLabel>
                                  <FormControl>
                                    <Input placeholder="England" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={invoiceForm.control}
                              name="companyZip"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ZIP/Postal Code</FormLabel>
                                  <FormControl>
                                    <Input placeholder="SW1A 1AA" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={invoiceForm.control}
                            name="companyCountry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                  <Input placeholder="United Kingdom" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Contact Information Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Billing Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={invoiceForm.control}
                            name="billingEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Billing Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="billing@company.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={invoiceForm.control}
                            name="billingPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Billing Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="+44 20 7123 4567" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Delivery Address Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Delivery Address (if different from company address)</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={invoiceForm.control}
                            name="deliveryAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Delivery Street Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="456 Delivery Street" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={invoiceForm.control}
                              name="deliveryCity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="London" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={invoiceForm.control}
                              name="deliveryState"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State/Province</FormLabel>
                                  <FormControl>
                                    <Input placeholder="England" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={invoiceForm.control}
                              name="deliveryZip"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ZIP/Postal Code</FormLabel>
                                  <FormControl>
                                    <Input placeholder="SW1A 1AA" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={invoiceForm.control}
                            name="deliveryCountry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                  <Input placeholder="United Kingdom" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={invoiceForm.control}
                            name="deliveryInstructions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Delivery Instructions</FormLabel>
                                <FormControl>
                                  <textarea 
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Please ring the bell at the main entrance. Loading dock is at the back of the building."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button 
                          type="submit" 
                          disabled={updateInvoiceMutation.isPending}
                          className="min-w-[120px]"
                        >
                          {updateInvoiceMutation.isPending ? "Updating..." : "Update Invoice Settings"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications & Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Order Updates</h3>
                        <p className="text-sm text-gray-600">Get notified about order status changes</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Enabled
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Product Restocks</h3>
                        <p className="text-sm text-gray-600">Alert when out-of-stock items are available</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Price Drops</h3>
                        <p className="text-sm text-gray-600">Get notified when prices drop on favorite items</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Promotions</h3>
                        <p className="text-sm text-gray-600">Receive promotional offers and discounts</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Enabled
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details #{selectedOrder?.id}
          </DialogTitle>
        </DialogHeader>
        {selectedOrder && (
          <div className="space-y-6">
            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Order Date:</span>
                  <span className="text-sm">{format(new Date(selectedOrder.createdAt), "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getOrderStatusColor(selectedOrder.status)}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Payment Method:</span>
                  <span className="text-sm capitalize">{selectedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Payment Status:</span>
                  <Badge variant={selectedOrder.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                    {selectedOrder.paymentStatus}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Amount:</span>
                  <span className="text-sm font-medium">${selectedOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Items:</span>
                  <span className="text-sm">{selectedOrder.items?.length || 0} items</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {selectedOrder.shippingAddress && (
              <div className="space-y-2">
                <h4 className="font-medium">Shipping Address</h4>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  <p>{selectedOrder.shippingAddress.name}</p>
                  <p>{selectedOrder.shippingAddress.street}</p>
                  <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                  <p>{selectedOrder.shippingAddress.country}</p>
                </div>
              </div>
            )}

            {/* Order Items */}
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Order Items</h4>
                <div className="border rounded-md">
                  {selectedOrder.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 border-b last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName || `Product #${item.productId}`}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${item.price}</p>
                        <p className="text-sm text-gray-600">${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="space-y-2">
                <h4 className="font-medium">Order Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setOrderDetailsOpen(false)}>
                Close
              </Button>
              <Button onClick={() => downloadInvoice(selectedOrder.id)}>
                <Download className="h-4 w-4 mr-2" />
                View Invoice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </div>
  );
}