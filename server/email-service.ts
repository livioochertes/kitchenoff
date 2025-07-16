import { MailService } from '@sendgrid/mail';
import type { OrderWithItems, User } from '../shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendOrderConfirmationEmail(
  order: OrderWithItems,
  user: User
): Promise<boolean> {
  const shippingAddress = order.shippingAddress as any;
  const billingAddress = order.billingAddress as any;
  
  const orderItemsHtml = order.items
    .map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.totalPrice}</td>
      </tr>
    `)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation - KitchenOff</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin-bottom: 10px;">KitchenOff</h1>
        <h2 style="color: #27ae60; margin-top: 0;">Order Confirmation</h2>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #2c3e50;">Hello ${user.firstName} ${user.lastName},</h3>
        <p>Thank you for your order! We're pleased to confirm that your order has been accepted and is now being processed.</p>
        
        <div style="margin: 20px 0;">
          <strong>Order Details:</strong><br>
          Order ID: #${order.id}<br>
          Order Date: ${new Date(order.createdAt!).toLocaleDateString()}<br>
          Status: <span style="color: #27ae60; font-weight: bold;">Accepted</span>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #2c3e50;">Order Items:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
              <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderItemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; border-top: 2px solid #dee2e6;">
                Total Amount:
              </td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold; border-top: 2px solid #dee2e6;">
                $${order.totalAmount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div style="flex: 1; background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin-top: 0; color: #2c3e50;">Shipping Address</h4>
          <p style="margin: 0; line-height: 1.5;">
            ${shippingAddress.firstName} ${shippingAddress.lastName}<br>
            ${shippingAddress.streetAddress}<br>
            ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
            ${shippingAddress.country}
          </p>
        </div>
        
        <div style="flex: 1; background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin-top: 0; color: #2c3e50;">Billing Address</h4>
          <p style="margin: 0; line-height: 1.5;">
            ${billingAddress.firstName} ${billingAddress.lastName}<br>
            ${billingAddress.streetAddress}<br>
            ${billingAddress.city}, ${billingAddress.state} ${billingAddress.zipCode}<br>
            ${billingAddress.country}
          </p>
        </div>
      </div>

      <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #27ae60;">What's Next?</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Our team will prepare your order for shipping</li>
          <li>You'll receive a shipping confirmation with tracking information</li>
          <li>Your order will be delivered to the address provided</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #666;">
          Questions about your order? Contact us at 
          <a href="mailto:info@kitchen-off.com" style="color: #27ae60;">info@kitchen-off.com</a>
        </p>
        <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
          Thank you for choosing KitchenOff - Your Professional Kitchen Partner
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    KitchenOff - Order Confirmation
    
    Hello ${user.firstName} ${user.lastName},
    
    Thank you for your order! We're pleased to confirm that your order has been accepted and is now being processed.
    
    Order Details:
    - Order ID: #${order.id}
    - Order Date: ${new Date(order.createdAt!).toLocaleDateString()}
    - Status: Accepted
    - Total Amount: $${order.totalAmount}
    
    Your order will be prepared for shipping and you'll receive tracking information soon.
    
    Questions? Contact us at info@kitchen-off.com
    
    Thank you for choosing KitchenOff!
  `;

  return await sendEmail({
    to: user.email,
    from: 'orders@kitchen-off.com',
    subject: `Order Confirmation #${order.id} - KitchenOff`,
    text: textContent,
    html: html,
  });
}

export async function sendLogisticsNotificationEmail(
  order: OrderWithItems,
  user: User,
  logisticsEmail: string = 'logistics@kitchen-off.com'
): Promise<boolean> {
  const shippingAddress = order.shippingAddress as any;
  const orderItemsText = order.items
    .map(item => `- ${item.product.name} (Qty: ${item.quantity}) - $${item.totalPrice}`)
    .join('\n');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order for Processing - KitchenOff</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin-bottom: 10px;">KitchenOff</h1>
        <h2 style="color: #e74c3c; margin-top: 0;">New Order for Processing</h2>
      </div>
      
      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h3 style="margin-top: 0; color: #856404;">Order Accepted - Ready for Processing</h3>
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt!).toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${user.firstName} ${user.lastName} (${user.email})</p>
        <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #2c3e50;">Items to Prepare:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
              <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #dee2e6;">Quantity</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #dee2e6;">Unit Price</th>
              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.totalPrice}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #2c3e50;">Shipping Information</h3>
        <p style="margin: 0; line-height: 1.5;">
          <strong>Deliver to:</strong><br>
          ${shippingAddress.firstName} ${shippingAddress.lastName}<br>
          ${shippingAddress.streetAddress}<br>
          ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
          ${shippingAddress.country}
        </p>
      </div>

      ${order.notes ? `
        <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0c5460;">Special Notes</h3>
          <p style="margin: 0;">${order.notes}</p>
        </div>
      ` : ''}

      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #155724;">Next Steps</h3>
        <ol style="margin: 0; padding-left: 20px;">
          <li>Verify product availability and prepare items</li>
          <li>Package the order securely</li>
          <li>Generate shipping label and tracking number</li>
          <li>Update order status to "shipped" in the system</li>
          <li>Send tracking information to customer</li>
        </ol>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #666;">
          Access the admin panel at 
          <a href="https://kitchen-off.com/admin" style="color: #e74c3c;">kitchen-off.com/admin</a>
          to manage this order
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    KitchenOff - New Order for Processing
    
    ORDER ACCEPTED - READY FOR PROCESSING
    
    Order Details:
    - Order ID: #${order.id}
    - Order Date: ${new Date(order.createdAt!).toLocaleDateString()}
    - Customer: ${user.firstName} ${user.lastName} (${user.email})
    - Total Amount: $${order.totalAmount}
    - Payment Method: ${order.paymentMethod}
    - Payment Status: ${order.paymentStatus}
    
    Items to Prepare:
    ${orderItemsText}
    
    Shipping Address:
    ${shippingAddress.firstName} ${shippingAddress.lastName}
    ${shippingAddress.streetAddress}
    ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
    ${shippingAddress.country}
    
    ${order.notes ? `Special Notes: ${order.notes}` : ''}
    
    Next Steps:
    1. Verify product availability and prepare items
    2. Package the order securely
    3. Generate shipping label and tracking number
    4. Update order status to "shipped" in the system
    5. Send tracking information to customer
    
    Access the admin panel at kitchen-off.com/admin to manage this order.
  `;

  return await sendEmail({
    to: logisticsEmail,
    from: 'orders@kitchen-off.com',
    subject: `New Order #${order.id} - Ready for Processing`,
    text: textContent,
    html: html,
  });
}