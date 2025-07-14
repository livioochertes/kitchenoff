import { Language } from '../contexts/language-context';

export interface TranslationKeys {
  // Navigation
  'nav.home': string;
  'nav.products': string;
  'nav.categories': string;
  'nav.allCategories': string;
  'nav.cart': string;
  'nav.account': string;
  'nav.login': string;
  'nav.logout': string;
  'nav.admin': string;
  'nav.aiAssistant': string;
  
  // Search
  'search.placeholder': string;
  'search.results': string;
  'search.noResults': string;
  
  // Products
  'products.title': string;
  'products.featured': string;
  'products.addToCart': string;
  'products.outOfStock': string;
  'products.inStock': string;
  'products.price': string;
  'products.compare': string;
  'products.save': string;
  'products.details': string;
  'products.description': string;
  'products.reviews': string;
  'products.writeReview': string;
  'products.loadMore': string;
  'products.noProducts': string;
  
  // Cart
  'cart.title': string;
  'cart.empty': string;
  'cart.quantity': string;
  'cart.remove': string;
  'cart.update': string;
  'cart.subtotal': string;
  'cart.total': string;
  'cart.checkout': string;
  'cart.continueShopping': string;
  'cart.clear': string;
  
  // Checkout
  'checkout.title': string;
  'checkout.shippingAddress': string;
  'checkout.paymentMethod': string;
  'checkout.orderSummary': string;
  'checkout.placeOrder': string;
  'checkout.processing': string;
  'checkout.success': string;
  'checkout.error': string;
  
  // Account
  'account.title': string;
  'account.profile': string;
  'account.orders': string;
  'account.orderHistory': string;
  'account.invoices': string;
  'account.settings': string;
  'account.personalInfo': string;
  'account.firstName': string;
  'account.lastName': string;
  'account.email': string;
  'account.phone': string;
  'account.address': string;
  'account.save': string;
  'account.cancel': string;
  'account.notifications': string;
  'account.alerts': string;
  
  // Auth
  'auth.login': string;
  'auth.register': string;
  'auth.email': string;
  'auth.password': string;
  'auth.confirmPassword': string;
  'auth.forgotPassword': string;
  'auth.rememberMe': string;
  'auth.signIn': string;
  'auth.signUp': string;
  'auth.alreadyAccount': string;
  'auth.noAccount': string;
  'auth.required': string;
  'auth.invalidEmail': string;
  'auth.passwordMismatch': string;
  
  // Admin
  'admin.title': string;
  'admin.dashboard': string;
  'admin.products': string;
  'admin.categories': string;
  'admin.orders': string;
  'admin.users': string;
  'admin.add': string;
  'admin.edit': string;
  'admin.delete': string;
  'admin.save': string;
  'admin.cancel': string;
  
  // AI Assistant
  'ai.title': string;
  'ai.placeholder': string;
  'ai.send': string;
  'ai.clear': string;
  'ai.connecting': string;
  'ai.connected': string;
  'ai.error': string;
  'ai.thinking': string;
  
  // Common
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.cancel': string;
  'common.confirm': string;
  'common.delete': string;
  'common.edit': string;
  'common.save': string;
  'common.close': string;
  'common.back': string;
  'common.next': string;
  'common.previous': string;
  'common.yes': string;
  'common.no': string;
  'common.ok': string;
  'common.required': string;
  'common.optional': string;
  'common.name': string;
  'common.description': string;
  'common.price': string;
  'common.category': string;
  'common.date': string;
  'common.status': string;
  'common.actions': string;
  
  // Messages
  'messages.addedToCart': string;
  'messages.removedFromCart': string;
  'messages.cartCleared': string;
  'messages.orderPlaced': string;
  'messages.profileUpdated': string;
  'messages.reviewSubmitted': string;
  'messages.error': string;
  'messages.networkError': string;
  'messages.sessionExpired': string;
  
  // Footer
  'footer.support': string;
  'footer.needHelp': string;
  'footer.call': string;
  'footer.copyright': string;
  'footer.freeShipping': string;
  'footer.professionalSupport': string;
  
  // Language
  'language.select': string;
  'language.current': string;
}

const translations: Record<Language, TranslationKeys> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.categories': 'Categories',
    'nav.allCategories': 'All Categories',
    'nav.cart': 'Cart',
    'nav.account': 'Account',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.admin': 'Admin',
    'nav.aiAssistant': 'AI Assistant',
    
    // Search
    'search.placeholder': 'Search products...',
    'search.results': 'Search Results',
    'search.noResults': 'No products found for your search.',
    
    // Products
    'products.title': 'Products',
    'products.featured': 'Featured Products',
    'products.addToCart': 'Add to Cart',
    'products.outOfStock': 'Out of Stock',
    'products.inStock': 'In Stock',
    'products.price': 'Price',
    'products.compare': 'Compare at',
    'products.save': 'Save',
    'products.details': 'Details',
    'products.description': 'Description',
    'products.reviews': 'Reviews',
    'products.writeReview': 'Write a Review',
    'products.loadMore': 'Load More',
    'products.noProducts': 'No products found.',
    
    // Cart
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty.',
    'cart.quantity': 'Quantity',
    'cart.remove': 'Remove',
    'cart.update': 'Update',
    'cart.subtotal': 'Subtotal',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.continueShopping': 'Continue Shopping',
    'cart.clear': 'Clear Cart',
    
    // Checkout
    'checkout.title': 'Checkout',
    'checkout.shippingAddress': 'Shipping Address',
    'checkout.paymentMethod': 'Payment Method',
    'checkout.orderSummary': 'Order Summary',
    'checkout.placeOrder': 'Place Order',
    'checkout.processing': 'Processing...',
    'checkout.success': 'Order placed successfully!',
    'checkout.error': 'Error placing order',
    
    // Account
    'account.title': 'My Account',
    'account.profile': 'Profile',
    'account.orders': 'Orders',
    'account.orderHistory': 'Order History',
    'account.invoices': 'Invoices',
    'account.settings': 'Settings',
    'account.personalInfo': 'Personal Information',
    'account.firstName': 'First Name',
    'account.lastName': 'Last Name',
    'account.email': 'Email',
    'account.phone': 'Phone',
    'account.address': 'Address',
    'account.save': 'Save Changes',
    'account.cancel': 'Cancel',
    'account.notifications': 'Notifications',
    'account.alerts': 'Alerts',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.rememberMe': 'Remember Me',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.alreadyAccount': 'Already have an account?',
    'auth.noAccount': "Don't have an account?",
    'auth.required': 'This field is required',
    'auth.invalidEmail': 'Invalid email address',
    'auth.passwordMismatch': 'Passwords do not match',
    
    // Admin
    'admin.title': 'Admin Panel',
    'admin.dashboard': 'Dashboard',
    'admin.products': 'Products',
    'admin.categories': 'Categories',
    'admin.orders': 'Orders',
    'admin.users': 'Users',
    'admin.add': 'Add',
    'admin.edit': 'Edit',
    'admin.delete': 'Delete',
    'admin.save': 'Save',
    'admin.cancel': 'Cancel',
    
    // AI Assistant
    'ai.title': 'AI Assistant',
    'ai.placeholder': 'Ask me anything about kitchen equipment...',
    'ai.send': 'Send',
    'ai.clear': 'Clear Chat',
    'ai.connecting': 'Connecting...',
    'ai.connected': 'Connected',
    'ai.error': 'Connection failed',
    'ai.thinking': 'AI is thinking...',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.required': 'Required',
    'common.optional': 'Optional',
    'common.name': 'Name',
    'common.description': 'Description',
    'common.price': 'Price',
    'common.category': 'Category',
    'common.date': 'Date',
    'common.status': 'Status',
    'common.actions': 'Actions',
    
    // Messages
    'messages.addedToCart': 'Added to cart',
    'messages.removedFromCart': 'Removed from cart',
    'messages.cartCleared': 'Cart cleared',
    'messages.orderPlaced': 'Order placed successfully',
    'messages.profileUpdated': 'Profile updated',
    'messages.reviewSubmitted': 'Review submitted',
    'messages.error': 'An error occurred',
    'messages.networkError': 'Network error. Please try again.',
    'messages.sessionExpired': 'Session expired. Please log in again.',
    
    // Footer
    'footer.support': 'Support',
    'footer.needHelp': 'Need help?',
    'footer.call': 'Call:',
    'footer.copyright': '© 2025 KitchenOff. All rights reserved.',
    'footer.freeShipping': 'Free shipping on orders over $500',
    'footer.professionalSupport': 'Professional support available',
    
    // Language
    'language.select': 'Select Language',
    'language.current': 'Current Language',
  },
  
  es: {
    // Navigation
    'nav.home': 'Inicio',
    'nav.products': 'Productos',
    'nav.categories': 'Categorías',
    'nav.allCategories': 'Todas las Categorías',
    'nav.cart': 'Carrito',
    'nav.account': 'Cuenta',
    'nav.login': 'Iniciar Sesión',
    'nav.logout': 'Cerrar Sesión',
    'nav.admin': 'Administrador',
    'nav.aiAssistant': 'Asistente IA',
    
    // Search
    'search.placeholder': 'Buscar productos...',
    'search.results': 'Resultados de Búsqueda',
    'search.noResults': 'No se encontraron productos para su búsqueda.',
    
    // Products
    'products.title': 'Productos',
    'products.featured': 'Productos Destacados',
    'products.addToCart': 'Agregar al Carrito',
    'products.outOfStock': 'Agotado',
    'products.inStock': 'En Stock',
    'products.price': 'Precio',
    'products.compare': 'Comparar en',
    'products.save': 'Ahorrar',
    'products.details': 'Detalles',
    'products.description': 'Descripción',
    'products.reviews': 'Reseñas',
    'products.writeReview': 'Escribir una Reseña',
    'products.loadMore': 'Cargar Más',
    'products.noProducts': 'No se encontraron productos.',
    
    // Cart
    'cart.title': 'Carrito de Compras',
    'cart.empty': 'Tu carrito está vacío.',
    'cart.quantity': 'Cantidad',
    'cart.remove': 'Eliminar',
    'cart.update': 'Actualizar',
    'cart.subtotal': 'Subtotal',
    'cart.total': 'Total',
    'cart.checkout': 'Finalizar Compra',
    'cart.continueShopping': 'Continuar Comprando',
    'cart.clear': 'Vaciar Carrito',
    
    // Checkout
    'checkout.title': 'Finalizar Compra',
    'checkout.shippingAddress': 'Dirección de Envío',
    'checkout.paymentMethod': 'Método de Pago',
    'checkout.orderSummary': 'Resumen del Pedido',
    'checkout.placeOrder': 'Realizar Pedido',
    'checkout.processing': 'Procesando...',
    'checkout.success': '¡Pedido realizado con éxito!',
    'checkout.error': 'Error al realizar el pedido',
    
    // Account
    'account.title': 'Mi Cuenta',
    'account.profile': 'Perfil',
    'account.orders': 'Pedidos',
    'account.orderHistory': 'Historial de Pedidos',
    'account.invoices': 'Facturas',
    'account.settings': 'Configuración',
    'account.personalInfo': 'Información Personal',
    'account.firstName': 'Nombre',
    'account.lastName': 'Apellido',
    'account.email': 'Correo Electrónico',
    'account.phone': 'Teléfono',
    'account.address': 'Dirección',
    'account.save': 'Guardar Cambios',
    'account.cancel': 'Cancelar',
    'account.notifications': 'Notificaciones',
    'account.alerts': 'Alertas',
    
    // Auth
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Registrarse',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.confirmPassword': 'Confirmar Contraseña',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.rememberMe': 'Recordarme',
    'auth.signIn': 'Iniciar Sesión',
    'auth.signUp': 'Registrarse',
    'auth.alreadyAccount': '¿Ya tienes una cuenta?',
    'auth.noAccount': '¿No tienes una cuenta?',
    'auth.required': 'Este campo es obligatorio',
    'auth.invalidEmail': 'Dirección de correo inválida',
    'auth.passwordMismatch': 'Las contraseñas no coinciden',
    
    // Admin
    'admin.title': 'Panel de Administración',
    'admin.dashboard': 'Tablero',
    'admin.products': 'Productos',
    'admin.categories': 'Categorías',
    'admin.orders': 'Pedidos',
    'admin.users': 'Usuarios',
    'admin.add': 'Agregar',
    'admin.edit': 'Editar',
    'admin.delete': 'Eliminar',
    'admin.save': 'Guardar',
    'admin.cancel': 'Cancelar',
    
    // AI Assistant
    'ai.title': 'Asistente IA',
    'ai.placeholder': 'Pregúntame cualquier cosa sobre equipos de cocina...',
    'ai.send': 'Enviar',
    'ai.clear': 'Limpiar Chat',
    'ai.connecting': 'Conectando...',
    'ai.connected': 'Conectado',
    'ai.error': 'Error de conexión',
    'ai.thinking': 'La IA está pensando...',
    
    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.save': 'Guardar',
    'common.close': 'Cerrar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.ok': 'Aceptar',
    'common.required': 'Obligatorio',
    'common.optional': 'Opcional',
    'common.name': 'Nombre',
    'common.description': 'Descripción',
    'common.price': 'Precio',
    'common.category': 'Categoría',
    'common.date': 'Fecha',
    'common.status': 'Estado',
    'common.actions': 'Acciones',
    
    // Messages
    'messages.addedToCart': 'Agregado al carrito',
    'messages.removedFromCart': 'Eliminado del carrito',
    'messages.cartCleared': 'Carrito vaciado',
    'messages.orderPlaced': 'Pedido realizado con éxito',
    'messages.profileUpdated': 'Perfil actualizado',
    'messages.reviewSubmitted': 'Reseña enviada',
    'messages.error': 'Ocurrió un error',
    'messages.networkError': 'Error de red. Inténtalo de nuevo.',
    'messages.sessionExpired': 'Sesión expirada. Inicia sesión nuevamente.',
    
    // Footer
    'footer.support': 'Soporte',
    'footer.needHelp': '¿Necesitas ayuda?',
    'footer.call': 'Llamar:',
    'footer.copyright': '© 2025 KitchenOff. Todos los derechos reservados.',
    'footer.freeShipping': 'Envío gratis en pedidos superiores a $500',
    'footer.professionalSupport': 'Soporte profesional disponible',
    
    // Language
    'language.select': 'Seleccionar Idioma',
    'language.current': 'Idioma Actual',
  },
  
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.products': 'Produits',
    'nav.categories': 'Catégories',
    'nav.allCategories': 'Toutes les Catégories',
    'nav.cart': 'Panier',
    'nav.account': 'Compte',
    'nav.login': 'Se connecter',
    'nav.logout': 'Se déconnecter',
    'nav.admin': 'Administrateur',
    'nav.aiAssistant': 'Assistant IA',
    
    // Search
    'search.placeholder': 'Rechercher des produits...',
    'search.results': 'Résultats de Recherche',
    'search.noResults': 'Aucun produit trouvé pour votre recherche.',
    
    // Products
    'products.title': 'Produits',
    'products.featured': 'Produits Vedettes',
    'products.addToCart': 'Ajouter au Panier',
    'products.outOfStock': 'Rupture de Stock',
    'products.inStock': 'En Stock',
    'products.price': 'Prix',
    'products.compare': 'Comparer à',
    'products.save': 'Économiser',
    'products.details': 'Détails',
    'products.description': 'Description',
    'products.reviews': 'Avis',
    'products.writeReview': 'Écrire un Avis',
    'products.loadMore': 'Charger Plus',
    'products.noProducts': 'Aucun produit trouvé.',
    
    // Cart
    'cart.title': 'Panier',
    'cart.empty': 'Votre panier est vide.',
    'cart.quantity': 'Quantité',
    'cart.remove': 'Supprimer',
    'cart.update': 'Mettre à jour',
    'cart.subtotal': 'Sous-total',
    'cart.total': 'Total',
    'cart.checkout': 'Passer Commande',
    'cart.continueShopping': 'Continuer les Achats',
    'cart.clear': 'Vider le Panier',
    
    // Checkout
    'checkout.title': 'Commande',
    'checkout.shippingAddress': 'Adresse de Livraison',
    'checkout.paymentMethod': 'Méthode de Paiement',
    'checkout.orderSummary': 'Résumé de la Commande',
    'checkout.placeOrder': 'Passer Commande',
    'checkout.processing': 'Traitement...',
    'checkout.success': 'Commande passée avec succès!',
    'checkout.error': 'Erreur lors de la commande',
    
    // Account
    'account.title': 'Mon Compte',
    'account.profile': 'Profil',
    'account.orders': 'Commandes',
    'account.orderHistory': 'Historique des Commandes',
    'account.invoices': 'Factures',
    'account.settings': 'Paramètres',
    'account.personalInfo': 'Informations Personnelles',
    'account.firstName': 'Prénom',
    'account.lastName': 'Nom',
    'account.email': 'Email',
    'account.phone': 'Téléphone',
    'account.address': 'Adresse',
    'account.save': 'Sauvegarder',
    'account.cancel': 'Annuler',
    'account.notifications': 'Notifications',
    'account.alerts': 'Alertes',
    
    // Auth
    'auth.login': 'Se connecter',
    'auth.register': "S'inscrire",
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié?',
    'auth.rememberMe': 'Se souvenir de moi',
    'auth.signIn': 'Se connecter',
    'auth.signUp': "S'inscrire",
    'auth.alreadyAccount': 'Déjà un compte?',
    'auth.noAccount': "Pas de compte?",
    'auth.required': 'Ce champ est obligatoire',
    'auth.invalidEmail': 'Adresse email invalide',
    'auth.passwordMismatch': 'Les mots de passe ne correspondent pas',
    
    // Admin
    'admin.title': "Panneau d'Administration",
    'admin.dashboard': 'Tableau de Bord',
    'admin.products': 'Produits',
    'admin.categories': 'Catégories',
    'admin.orders': 'Commandes',
    'admin.users': 'Utilisateurs',
    'admin.add': 'Ajouter',
    'admin.edit': 'Modifier',
    'admin.delete': 'Supprimer',
    'admin.save': 'Sauvegarder',
    'admin.cancel': 'Annuler',
    
    // AI Assistant
    'ai.title': 'Assistant IA',
    'ai.placeholder': 'Demandez-moi tout sur les équipements de cuisine...',
    'ai.send': 'Envoyer',
    'ai.clear': 'Effacer le Chat',
    'ai.connecting': 'Connexion...',
    'ai.connected': 'Connecté',
    'ai.error': 'Échec de la connexion',
    'ai.thinking': "L'IA réfléchit...",
    
    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.save': 'Sauvegarder',
    'common.close': 'Fermer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.yes': 'Oui',
    'common.no': 'Non',
    'common.ok': 'OK',
    'common.required': 'Obligatoire',
    'common.optional': 'Optionnel',
    'common.name': 'Nom',
    'common.description': 'Description',
    'common.price': 'Prix',
    'common.category': 'Catégorie',
    'common.date': 'Date',
    'common.status': 'Statut',
    'common.actions': 'Actions',
    
    // Messages
    'messages.addedToCart': 'Ajouté au panier',
    'messages.removedFromCart': 'Supprimé du panier',
    'messages.cartCleared': 'Panier vidé',
    'messages.orderPlaced': 'Commande passée avec succès',
    'messages.profileUpdated': 'Profil mis à jour',
    'messages.reviewSubmitted': 'Avis soumis',
    'messages.error': 'Une erreur est survenue',
    'messages.networkError': 'Erreur réseau. Veuillez réessayer.',
    'messages.sessionExpired': 'Session expirée. Veuillez vous reconnecter.',
    
    // Footer
    'footer.support': 'Support',
    'footer.needHelp': 'Besoin d\'aide?',
    'footer.call': 'Appeler:',
    'footer.copyright': '© 2025 KitchenOff. Tous droits réservés.',
    'footer.freeShipping': 'Livraison gratuite pour les commandes de plus de 500$',
    'footer.professionalSupport': 'Support professionnel disponible',
    
    // Language
    'language.select': 'Sélectionner la Langue',
    'language.current': 'Langue Actuelle',
  },
  
  // Adding placeholders for other languages - these would be fully translated in a real app
  de: {
    'nav.home': 'Startseite',
    'nav.products': 'Produkte',
    'nav.categories': 'Kategorien',
    'nav.allCategories': 'Alle Kategorien',
    'nav.cart': 'Warenkorb',
    'nav.account': 'Konto',
    'nav.login': 'Anmelden',
    'nav.logout': 'Abmelden',
    'nav.admin': 'Administrator',
    'nav.aiAssistant': 'KI-Assistent',
    'search.placeholder': 'Produkte suchen...',
    'search.results': 'Suchergebnisse',
    'search.noResults': 'Keine Produkte für Ihre Suche gefunden.',
    'products.title': 'Produkte',
    'products.featured': 'Empfohlene Produkte',
    'products.addToCart': 'In den Warenkorb',
    'products.outOfStock': 'Nicht vorrätig',
    'products.inStock': 'Auf Lager',
    'products.price': 'Preis',
    'products.compare': 'Vergleichen bei',
    'products.save': 'Sparen',
    'products.details': 'Details',
    'products.description': 'Beschreibung',
    'products.reviews': 'Bewertungen',
    'products.writeReview': 'Bewertung schreiben',
    'products.loadMore': 'Mehr laden',
    'products.noProducts': 'Keine Produkte gefunden.',
    'cart.title': 'Warenkorb',
    'cart.empty': 'Ihr Warenkorb ist leer.',
    'cart.quantity': 'Menge',
    'cart.remove': 'Entfernen',
    'cart.update': 'Aktualisieren',
    'cart.subtotal': 'Zwischensumme',
    'cart.total': 'Gesamt',
    'cart.checkout': 'Zur Kasse',
    'cart.continueShopping': 'Weiter einkaufen',
    'cart.clear': 'Warenkorb leeren',
    'checkout.title': 'Bestellung',
    'checkout.shippingAddress': 'Lieferadresse',
    'checkout.paymentMethod': 'Zahlungsart',
    'checkout.orderSummary': 'Bestellübersicht',
    'checkout.placeOrder': 'Bestellung aufgeben',
    'checkout.processing': 'Verarbeitung...',
    'checkout.success': 'Bestellung erfolgreich aufgegeben!',
    'checkout.error': 'Fehler bei der Bestellung',
    'account.title': 'Mein Konto',
    'account.profile': 'Profil',
    'account.orders': 'Bestellungen',
    'account.orderHistory': 'Bestellhistorie',
    'account.invoices': 'Rechnungen',
    'account.settings': 'Einstellungen',
    'account.personalInfo': 'Persönliche Informationen',
    'account.firstName': 'Vorname',
    'account.lastName': 'Nachname',
    'account.email': 'E-Mail',
    'account.phone': 'Telefon',
    'account.address': 'Adresse',
    'account.save': 'Änderungen speichern',
    'account.cancel': 'Abbrechen',
    'account.notifications': 'Benachrichtigungen',
    'account.alerts': 'Warnungen',
    'auth.login': 'Anmelden',
    'auth.register': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.confirmPassword': 'Passwort bestätigen',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.rememberMe': 'Angemeldet bleiben',
    'auth.signIn': 'Anmelden',
    'auth.signUp': 'Registrieren',
    'auth.alreadyAccount': 'Bereits ein Konto?',
    'auth.noAccount': 'Noch kein Konto?',
    'auth.required': 'Dieses Feld ist erforderlich',
    'auth.invalidEmail': 'Ungültige E-Mail-Adresse',
    'auth.passwordMismatch': 'Passwörter stimmen nicht überein',
    'admin.title': 'Admin-Panel',
    'admin.dashboard': 'Dashboard',
    'admin.products': 'Produkte',
    'admin.categories': 'Kategorien',
    'admin.orders': 'Bestellungen',
    'admin.users': 'Benutzer',
    'admin.add': 'Hinzufügen',
    'admin.edit': 'Bearbeiten',
    'admin.delete': 'Löschen',
    'admin.save': 'Speichern',
    'admin.cancel': 'Abbrechen',
    'ai.title': 'KI-Assistent',
    'ai.placeholder': 'Fragen Sie mich alles über Küchengeräte...',
    'ai.send': 'Senden',
    'ai.clear': 'Chat löschen',
    'ai.connecting': 'Verbinden...',
    'ai.connected': 'Verbunden',
    'ai.error': 'Verbindung fehlgeschlagen',
    'ai.thinking': 'KI denkt nach...',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.cancel': 'Abbrechen',
    'common.confirm': 'Bestätigen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.save': 'Speichern',
    'common.close': 'Schließen',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.previous': 'Vorherige',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    'common.ok': 'OK',
    'common.required': 'Erforderlich',
    'common.optional': 'Optional',
    'common.name': 'Name',
    'common.description': 'Beschreibung',
    'common.price': 'Preis',
    'common.category': 'Kategorie',
    'common.date': 'Datum',
    'common.status': 'Status',
    'common.actions': 'Aktionen',
    'messages.addedToCart': 'In den Warenkorb gelegt',
    'messages.removedFromCart': 'Aus dem Warenkorb entfernt',
    'messages.cartCleared': 'Warenkorb geleert',
    'messages.orderPlaced': 'Bestellung erfolgreich aufgegeben',
    'messages.profileUpdated': 'Profil aktualisiert',
    'messages.reviewSubmitted': 'Bewertung eingereicht',
    'messages.error': 'Ein Fehler ist aufgetreten',
    'messages.networkError': 'Netzwerkfehler. Bitte versuchen Sie es erneut.',
    'messages.sessionExpired': 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.',
    'footer.support': 'Support',
    'footer.needHelp': 'Brauchen Sie Hilfe?',
    'footer.call': 'Anrufen:',
    'footer.copyright': '© 2025 KitchenOff. Alle Rechte vorbehalten.',
    'footer.freeShipping': 'Kostenloser Versand bei Bestellungen über 500$',
    'footer.professionalSupport': 'Professioneller Support verfügbar',
    'language.select': 'Sprache auswählen',
    'language.current': 'Aktuelle Sprache',
  } as TranslationKeys,
  
  // Placeholder for other languages
  it: {} as TranslationKeys,
  pt: {} as TranslationKeys,
  zh: {} as TranslationKeys,
  ja: {} as TranslationKeys,
  ko: {} as TranslationKeys,
  ar: {} as TranslationKeys,
};

// Fill in placeholder languages with English fallbacks
const fallbackLanguages: Language[] = ['it', 'pt', 'zh', 'ja', 'ko', 'ar'];
fallbackLanguages.forEach(lang => {
  if (Object.keys(translations[lang]).length === 0) {
    translations[lang] = { ...translations.en };
  }
});

export default translations;