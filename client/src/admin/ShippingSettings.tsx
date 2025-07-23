import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Truck, Save } from "lucide-react";

const shippingSettingsSchema = z.object({
  freeShippingThreshold: z.string().min(1, "Free shipping threshold is required"),
  standardShippingCost: z.string().min(1, "Standard shipping cost is required"),
});

type ShippingSettingsFormData = z.infer<typeof shippingSettingsSchema>;

interface ShippingSettingsProps {
  token: string;
}

export default function ShippingSettings({ token }: ShippingSettingsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/admin/api/settings'],
    queryFn: async () => {
      const response = await fetch('/admin/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      return response.json();
    },
  });

  const form = useForm<ShippingSettingsFormData>({
    resolver: zodResolver(shippingSettingsSchema),
    defaultValues: {
      freeShippingThreshold: settings?.freeShippingThreshold || "500.00",
      standardShippingCost: settings?.standardShippingCost || "25.00",
    },
  });

  // Update form values when settings load
  if (settings && !form.formState.isDirty) {
    form.reset({
      freeShippingThreshold: settings.freeShippingThreshold || "500.00",
      standardShippingCost: settings.standardShippingCost || "25.00",
    });
  }

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: ShippingSettingsFormData) => {
      const response = await fetch('/admin/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          freeShippingThreshold: data.freeShippingThreshold,
          standardShippingCost: data.standardShippingCost,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/admin/api/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipping-settings'] });
      toast({
        title: "Settings Updated",
        description: "Shipping settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ShippingSettingsFormData) => {
    setLoading(true);
    try {
      await updateSettingsMutation.mutateAsync(data);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <span>Shipping Settings</span>
          </CardTitle>
          <CardDescription>Configure shipping costs and free shipping threshold</CardDescription>
        </CardHeader>
        <CardContent>
          <div>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Truck className="h-5 w-5" />
          <span>Shipping Settings</span>
        </CardTitle>
        <CardDescription>Configure shipping costs and free shipping threshold</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="freeShippingThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free Shipping Threshold ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="standardShippingCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Shipping Cost ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="25.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading || updateSettingsMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {loading || updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}