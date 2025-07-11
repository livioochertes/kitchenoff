# KitchenPro Supply - E-commerce Platform

## Overview

KitchenPro Supply is a full-stack e-commerce platform built for kitchen equipment and supplies. The application features a modern React frontend with TypeScript, a Node.js Express backend, and PostgreSQL database using Drizzle ORM. It includes user authentication, product catalog, shopping cart, order management, and admin functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state, React Context for cart management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT tokens with bcrypt password hashing
- **Development**: TSX for TypeScript execution

### Key Components

1. **User Authentication**
   - JWT-based authentication system
   - Password hashing with bcrypt
   - Role-based access control (admin/user)
   - Protected routes and middleware

2. **Product Management**
   - Category-based product organization
   - Product search and filtering
   - Featured products support
   - Image handling and SEO-friendly slugs

3. **Shopping Cart**
   - Context-based cart state management
   - Persistent cart data via API
   - Real-time quantity updates
   - Cart synchronization across sessions

4. **Order Processing**
   - Multi-step checkout flow
   - Address management
   - Order history and tracking
   - Admin order management

5. **Admin Panel**
   - Product CRUD operations
   - Category management
   - Order management
   - User management
   - Dashboard with analytics

## Data Flow

1. **Frontend to Backend**: API calls through TanStack Query with fetch-based client
2. **Authentication**: JWT tokens stored in localStorage, sent via Authorization headers
3. **Database Operations**: Drizzle ORM with prepared statements for type safety
4. **State Management**: Server state cached by TanStack Query, local state via React Context
5. **Real-time Updates**: Query invalidation for immediate UI updates

## External Dependencies

### Frontend Dependencies
- **UI Components**: Radix UI primitives for accessibility
- **Icons**: Lucide React for consistent iconography
- **Validation**: Zod for schema validation
- **HTTP Client**: Native fetch API with custom wrapper
- **Styling**: Tailwind CSS with PostCSS processing

### Backend Dependencies
- **Database**: Neon PostgreSQL serverless
- **Authentication**: jsonwebtoken and bcrypt
- **Development**: tsx for TypeScript execution
- **WebSocket**: ws for Neon database connections

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR
- **Backend**: Express server with tsx for TypeScript execution
- **Database**: Neon serverless PostgreSQL
- **Environment**: Replit-optimized with custom plugins

### Production Build
- **Frontend**: Vite build to `dist/public`
- **Backend**: esbuild bundle to `dist/index.js`
- **Database**: Drizzle migrations via `drizzle-kit push`
- **Deployment**: Single process serving both frontend and API

### Database Schema
- **Users**: Authentication and profile data
- **Categories**: Product categorization
- **Products**: Inventory with pricing and metadata
- **Orders**: Purchase history and order items
- **Cart**: User shopping cart persistence
- **Reviews**: Product ratings and feedback

The application uses a monorepo structure with shared schema definitions between frontend and backend, ensuring type safety across the entire stack. The database schema is managed through Drizzle migrations, and the application supports both development and production environments with appropriate configuration.