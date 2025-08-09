import { Product } from 'src/app/shared/modles/product.model';

export const DUMMY_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Qualis SPC',
    description: 'Statistical Process Control tool',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: '2',
    name: 'MSA',
    description: 'Measurement System Analysis module',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: '3',
    name: 'FMEA',
    description: 'Failure Mode and Effects Analysis',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: '4',
    name: 'Wizard',
    description: 'Workflow automation tool',
    createdAt: new Date(),
    isActive: false
  },
  {
    id: '5',
    name: 'APQP',
    description: 'Advanced Product Quality Planning',
    createdAt: new Date(),
    isActive: true
  }
];
