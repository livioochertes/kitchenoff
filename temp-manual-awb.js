// Manual AWB Generation route for admin interface
app.post("/admin/api/orders/:id/generate-awb", authenticateAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    console.log('🚚 Starting manual AWB generation for order:', orderId);
    
    // Get order details
    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order already has AWB
    if (order.awbNumber) {
      return res.json({
        message: "Order already has AWB number",
        awbNumber: order.awbNumber,
        awbCost: order.awbCost,
        currency: order.awbCurrency,
        courier: order.awbCourier,
        trackingUrl: `https://sameday.ro/track/${order.awbNumber}`,
        order
      });
    }

    // Generate manual AWB number
    const manualAwbNumber = `KTO${String(orderId).padStart(5, '0')}-MANUAL-${Date.now().toString().slice(-6)}`;
    
    // Update order with manual AWB information
    const updatedOrder = await storage.updateOrder(parseInt(req.params.id), {
      awbNumber: manualAwbNumber,
      awbCourier: 'Sameday (Manual)',
      awbCost: 25,  // Standard shipping cost
      awbCurrency: 'RON',
      awbPdfUrl: null,
      status: 'shipped',
      awbCreatedAt: new Date(),
    });

    console.log('✅ Manual AWB generated successfully:', manualAwbNumber);

    res.json({
      success: true,
      awbNumber: manualAwbNumber,
      awbCost: 25,
      currency: 'RON',
      courier: 'Sameday (Manual)',
      order: updatedOrder,
      trackingUrl: `https://sameday.ro/track/${manualAwbNumber}`,
      manual: true,
      message: `Manual AWB generated successfully. Please create the actual AWB in Sameday portal using reference: ${manualAwbNumber}`
    });
    
  } catch (error) {
    console.error('Manual AWB generation error:', error);
    res.status(500).json({ 
      message: "Failed to generate manual AWB", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});