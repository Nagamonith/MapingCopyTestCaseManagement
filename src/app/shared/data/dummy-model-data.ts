import { ProductModule } from 'src/app/shared/modles/module.model';

export const DUMMY_MODULES: ProductModule[] = [
  {
    id: 'mod1',
    productId: '1',
    version: 'v1.0',
    name: 'Login Module',
    isActive: true,
    createdAt: new Date(),
    description: 'Handles user authentication'
  },
  {
    id: 'mod2',
    productId: '1',
    version: 'v1.0',
    name: 'Reports Module',
    isActive: true,
    createdAt: new Date(),
    description: 'Generates analytics and reports'
  },
  {
    id: 'mod3',
    productId: '2',
    version: 'v1.0',
    name: 'Profile Module',
    isActive: true,
    createdAt: new Date(),
    description: 'Manages user profiles'
  },
  {
    id: 'mod4',
    productId: '2',
    version: 'v1.1',
    name: 'Cart Module',
    isActive: false,
    createdAt: new Date(),
    description: 'Manages shopping cart functionalities'
  },
  {
    id: 'mod5',
    productId: '3',
    version: 'v2.0',
    name: 'Search Module',
    isActive: true,
    createdAt: new Date(),
    description: 'Enables product searching'
  },
  {
    id: 'mod6',
    productId: '3',
    version: 'v2.0',
    name: 'Upload Module',
    isActive: true,
    createdAt: new Date(),
    description: 'Handles file uploads'
  },
  {
    id: 'mod7',
    productId: '3',
    version: 'v2.1',
    name: 'Settings Module',
    isActive: true,
    createdAt: new Date(),
    description: 'Manages user and system settings'
  }
];
